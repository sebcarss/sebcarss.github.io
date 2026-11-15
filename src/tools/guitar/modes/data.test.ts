import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MODE_CHORDS } from "./chords";
import { MODES, RIFF_KINDS, getMode } from "./data";
import { parseBar, soundingInterval } from "./riff";
import { MODE_INTERVALS, characteristic, inMode, intervalAt } from "./theory";
import type { StringNo } from "../schema";

describe("riff notation", () => {
  it("parses notes, fingers, slurs, bends, accents and passing notes", () => {
    const bar = parseBar("mixolydian", "0:3/5* 0.5:3/6~h 1:5/0p+1/3a 2:2/7^0.5>", "A");
    expect(bar.chord).toBe("A");
    expect(bar.events.map((e) => e.at)).toEqual([0, 0.5, 1, 2]);
    expect(bar.events[0]!.notes[0]).toMatchObject({ s: 3, f: 5, mark: "pass" });
    expect(bar.events[1]).toMatchObject({ slur: "h", notes: [{ s: 3, f: 6, mark: "char" }] });
    expect(bar.events[2]!.notes).toEqual([
      { s: 5, f: 0, finger: "p", mark: "root" },
      { s: 1, f: 3, finger: "a", mark: "char" },
    ]);
    // F♯ bent a half step lands on G, the ♭7.
    expect(bar.events[3]).toMatchObject({ bend: 0.5, accent: true, notes: [{ s: 2, f: 7, mark: "char" }] });
    expect(() => parseBar("dorian", "0:7/5")).toThrow();
  });
});

describe("mode library content", () => {
  it("has all seven modes once, with unique riff ids", () => {
    expect(MODES.map((m) => m.id).sort()).toEqual(Object.keys(MODE_INTERVALS).sort());
    const ids = MODES.flatMap((m) => m.riffs.map((r) => r.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(getMode("dorian")?.name).toBe("Dorian");
    expect(getMode("blues")).toBeUndefined();
  });

  for (const m of MODES) {
    describe(m.name, () => {
      it("has every kind of riff", () => {
        for (const k of RIFF_KINDS) expect(m.riffs.some((r) => r.kind === k), k).toBe(true);
      });

      it("vamp: starts on an A-rooted chord and every chord tone is in the mode", () => {
        const first = MODE_CHORDS[m.vampBars[0]![0]!];
        expect(intervalAt(first.R, first.frets[6 - first.R] ?? 0)).toBe(0);
        const tones = new Set<number>();
        for (const name of m.vampBars.flat()) {
          MODE_CHORDS[name].frets.forEach((f, i) => {
            if (f == null) return;
            const iv = intervalAt((6 - i) as StringNo, f);
            expect(inMode(m.id, iv), `${name} string ${6 - i}`).toBe(true);
            tones.add(iv);
          });
        }
        // The backing itself must spell out the mode.
        for (const c of characteristic(m.id)) expect(tones.has(c), `vamp contains ${c}`).toBe(true);
        expect(m.vamp.bars).toHaveLength(m.vampBars.length);
      });

      for (const r of m.riffs) {
        it(`riff "${r.title}" stays in the mode and uses its characteristic notes`, () => {
          const p = r.pattern;
          expect(p.bars.length).toBeGreaterThanOrEqual(2);
          // Riffs loop over the vamp, so they must be whole cycles of it.
          expect(p.bars.length % m.vamp.bars.length).toBe(0);
          const heard = new Set<number>();
          for (const bar of p.bars) {
            expect(bar.events.length).toBeGreaterThan(2);
            let last = -1;
            for (const ev of bar.events) {
              expect(ev.at).toBeGreaterThan(last);
              last = ev.at;
              expect(ev.at).toBeLessThan(p.beats);
              expect(Number.isInteger(ev.at * p.subdiv)).toBe(true);
              const strings = ev.notes.map((n) => n.s);
              expect(new Set(strings).size).toBe(strings.length);
              for (const n of ev.notes) {
                expect(n.f).toBeGreaterThanOrEqual(0);
                expect(n.f).toBeLessThanOrEqual(15);
                if (n.mark === "pass") continue;
                const iv = soundingInterval(ev, n);
                expect(inMode(m.id, iv), `bar note ${n.s}/${n.f} at ${ev.at}`).toBe(true);
                if (!ev.bend) expect(inMode(m.id, intervalAt(n.s, n.f))).toBe(true);
                heard.add(iv);
              }
            }
          }
          for (const c of characteristic(m.id)) expect(heard.has(c), `contains interval ${c}`).toBe(true);
          expect(heard.has(0), "touches the root").toBe(true);
        });
      }
    });
  }

  it("postbuild writes a page for every mode", () => {
    const script = readFileSync(new URL("../../../../scripts/postbuild.mjs", import.meta.url), "utf8");
    expect(script).toContain('"guitar/modes"');
    for (const m of MODES) expect(script, m.id).toContain(`"${m.id}"`);
  });
});
