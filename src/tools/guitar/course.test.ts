import { describe, expect, it } from "vitest";
import { COURSES } from "./registry";
import { PATTERNS } from "./patterns";

describe("courses", () => {
  for (const c of COURSES) {
    describe(c.title, () => {
      it("every day fills exactly the daily minutes", () => {
        for (const d of c.days) expect(d.blocks.reduce((a, b) => a + b.minutes, 0), `day ${d.n}`).toBe(c.minutesPerDay);
      });

      it("days are numbered 1..n", () => {
        expect(c.days.map((d) => d.n)).toEqual(c.days.map((_, i) => i + 1));
      });

      it("every pattern, test and id resolves and is unique", () => {
        const ids = new Set<string>();
        const unique = (id: string) => {
          expect(ids.has(id), id).toBe(false);
          ids.add(id);
        };
        const testIds = new Set(c.tests.map((t) => t.id));
        for (const t of c.tests) {
          unique(t.id);
          expect(PATTERNS[t.pattern], t.pattern).toBeTruthy();
        }
        for (const d of c.days)
          for (const b of d.blocks) {
            unique(b.id);
            for (const t of b.tests) expect(testIds.has(t), t).toBe(true);
            for (const e of b.exercises) {
              unique(e.id);
              expect(PATTERNS[e.pattern], e.pattern).toBeTruthy();
              expect(e.bpm.start).toBeLessThanOrEqual(e.bpm.target);
              if (e.challenge) unique(e.challenge.id);
            }
          }
      });

      it("baseline tests are taken on day 1 and all tests on the last day", () => {
        const day1 = c.days[0]!.blocks.flatMap((b) => b.tests);
        expect(day1.sort()).toEqual(c.tests.filter((t) => t.baseline).map((t) => t.id).sort());
        const last = c.days[c.days.length - 1]!.blocks.flatMap((b) => b.tests);
        expect(last.sort()).toEqual(c.tests.map((t) => t.id).sort());
      });
    });
  }
});

describe("patterns", () => {
  it("every event sits inside its bar on the grid, on a real string", () => {
    for (const p of Object.values(PATTERNS)) {
      expect(p.bars.length, p.id).toBeGreaterThan(0);
      for (const bar of p.bars)
        for (const e of bar.events) {
          expect(e.at, p.id).toBeGreaterThanOrEqual(0);
          expect(e.at, p.id).toBeLessThan(p.beats);
          expect(Math.abs(e.at * p.subdiv - Math.round(e.at * p.subdiv)), `${p.id} off-grid`).toBeLessThan(1e-6);
          for (const n of e.notes) {
            expect(n.s >= 1 && n.s <= 6, p.id).toBe(true);
            expect(n.f >= 0 && n.f <= 15, p.id).toBe(true);
          }
          if (e.kind === "pick") expect(e.notes.length, `${p.id} empty pick`).toBeGreaterThan(0);
          // One finger per string at a time.
          const strings = e.notes.map((n) => n.s);
          if (e.kind === "pick") expect(new Set(strings).size, `${p.id} doubled string`).toBe(strings.length);
        }
    }
  });

  it("Lanterns is 37 bars built from its sections", () => {
    const len = ["intro", "verse", "chorus", "bridge", "outro"].map((s) => PATTERNS[`lanterns-${s}`]!.bars.length);
    expect(len).toEqual([8, 8, 8, 8, 5]);
    expect(PATTERNS.lanterns!.bars).toHaveLength(37);
  });

  it("triads are major triads on strings 3-2-1", () => {
    const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const open = { 3: 7, 2: 11, 1: 4 } as Record<number, number>;
    for (const bar of PATTERNS["triad-ladder"]!.bars) {
      const root = NAMES.indexOf(bar.chord!.split("/")[0]!);
      const top = bar.events[0]!.notes.filter((n) => n.s <= 3).map((n) => (open[n.s]! + n.f) % 12);
      expect(new Set(top), bar.chord).toEqual(new Set([root, (root + 4) % 12, (root + 7) % 12]));
    }
  });
});
