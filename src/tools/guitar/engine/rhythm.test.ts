import { describe, expect, it } from "vitest";
import { getPattern } from "../patterns";
import { beatLabel, expectedOnsets, trainerBpm, eventsForBar, takeSeconds } from "./rhythm";

describe("rhythm", () => {
  it("places a Travis bar at 90 bpm", () => {
    const p = getPattern("travis");
    const ev = eventsForBar(p, 0, 10, 90);
    expect(ev.map((e) => +(e.t - 10).toFixed(4))).toEqual([0, 0.6667, 1, 1.3333, 1.6667, 2, 2.3333].map((x) => +x.toFixed(4)));
    // Pinch on 1: thumb on the C root (string 5 fret 3) with m on string 1.
    expect(ev[0]!.ev.notes).toEqual([
      { s: 5, f: 3, finger: "p" },
      { s: 1, f: 0, finger: "m" },
    ]);
  });

  it("labels beats in 4/4 and 6/8", () => {
    const p44 = getPattern("travis");
    expect([0, 0.5, 1, 1.5, 3.5].map((a) => beatLabel(p44, a))).toEqual(["1", "1&", "2", "2&", "4&"]);
    const p68 = getPattern("pimami-68");
    expect(p68.bars[0]!.events.map((e) => beatLabel(p68, e.at))).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("expected onsets mark chord changes, groups and slurs", () => {
    const ex = expectedOnsets(getPattern("travis"), 60, 2);
    expect(ex).toHaveLength(14);
    expect(ex[0]!.change).toBe(false);
    expect(ex[7]!).toMatchObject({ bar: 2, label: "1", change: true, group: "thumb", onBeat: true });
    expect(ex[2]!).toMatchObject({ label: "2&", group: "fingers", onBeat: false });
    const half = expectedOnsets(getPattern("travis-half"), 60, 1);
    expect(half.filter((e) => e.change).map((e) => e.label)).toEqual(["3"]);
    const ham = expectedOnsets(getPattern("hammer"), 60, 1);
    expect(ham.filter((e) => e.optional).map((e) => e.label)).toEqual(["2&"]);
  });

  it("speed trainer steps and caps", () => {
    const t = { start: 60, step: 4, every: 4, max: 70 };
    expect([0, 3, 4, 8, 12, 40].map((b) => trainerBpm(b, t))).toEqual([60, 60, 64, 68, 70, 70]);
  });

  it("stamina take is three minutes at 85", () => {
    expect(takeSeconds(getPattern("stamina"), 85, 64)).toBeCloseTo(180.7, 0);
  });
});
