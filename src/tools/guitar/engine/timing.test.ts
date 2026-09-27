import { describe, expect, it } from "vitest";
import { getPattern } from "../patterns";
import { expectedOnsets } from "./rhythm";
import { analyseTiming, diagnose, judge } from "./timing";

const travis = getPattern("travis");
const ex = expectedOnsets(travis, 80, 8, 2);
const crit = { bpm: 80, bars: 8, mode: "click" as const, maxMeanAbsMs: 30, maxMissed: 2 };

describe("timing analysis", () => {
  it("a perfect take passes with zero deviation", () => {
    const r = analyseTiming(ex.map((e) => e.t), ex, { bpm: 80, mode: "click" });
    expect(r.heard).toBe(ex.length);
    expect(r.meanAbsMs).toBeCloseTo(0, 6);
    expect(r.missed).toHaveLength(0);
    expect(judge(r, crit).pass).toBe(true);
    expect(diagnose(r)[0]).toMatch(/Clean take/);
  });

  it("detects dragging and fingers late against the thumb", () => {
    const on = ex.map((e) => e.t + (e.group === "fingers" ? 0.06 : 0.02));
    const r = analyseTiming(on, ex, { bpm: 80, mode: "click" });
    expect(r.meanMs).toBeGreaterThan(20);
    expect(r.fingers.mean - r.thumb.mean).toBeCloseTo(40, 0);
    const d = diagnose(r).join(" ");
    expect(d).toMatch(/dragging/);
    expect(d).toMatch(/finger notes are 40 ms later/);
    expect(judge(r, crit).pass).toBe(false);
  });

  it("counts missed notes and extras, and flags late changes", () => {
    const on = ex
      .filter((_, i) => i !== 3 && i !== 10)
      .map((e) => e.t + (e.change ? 0.07 : 0));
    on.push(ex[5]!.t + 0.2); // a stray noise between notes
    const r = analyseTiming(on, ex, { bpm: 80, mode: "click" });
    expect(r.missed.map((m) => m.e.bar)).toEqual([1, 2]);
    expect(r.extra).toBe(1);
    expect(r.changeWorst?.ms).toBeCloseTo(70, 0);
    const j = judge(r, { ...crit, maxChangeMs: 40 });
    expect(j.checks.find((c) => c.label.startsWith("Chord changes"))?.ok).toBe(false);
    expect(diagnose(r).join(" ")).toMatch(/into bar \d+ was 70 ms late/);
  });

  it("ignores strum tails within 60 ms of a matched note", () => {
    const on = ex.flatMap((e) => [e.t, e.t + 0.025]);
    const r = analyseTiming(on, ex, { bpm: 80, mode: "click" });
    expect(r.extra).toBe(0);
    expect(r.meanAbsMs).toBeCloseTo(0, 6);
  });

  it("free mode follows a player who is steady but slower than the click", () => {
    const sw = getPattern("switch");
    const e = expectedOnsets(sw, 85, 16, 2);
    // Plays evenly at 80 bpm instead of 85, starting 30 ms late.
    const on = e.map((x) => 2.03 + (x.t - 2) * (85 / 80));
    const r = analyseTiming(on, e, { bpm: 85, mode: "free" });
    expect(r.heard).toBe(e.length);
    expect(r.meanAbsMs).toBeLessThan(1);
    expect(r.effectiveBpm).toBeCloseTo(80, 1);
    expect(Math.abs(r.driftBpm!)).toBeLessThan(0.1);
  });

  it("free mode measures speeding up between halves", () => {
    const sw = getPattern("switch");
    const e = expectedOnsets(sw, 85, 16, 0);
    const mid = e[e.length - 1]!.t / 2;
    // First half at 85, second half at 90.
    const on = e.map((x) => (x.t < mid ? x.t : mid + (x.t - mid) * (85 / 90)));
    const r = analyseTiming(on, e, { bpm: 85, mode: "free" });
    expect(r.driftBpm!).toBeGreaterThan(3);
    expect(judge(r, { bpm: 85, bars: 16, mode: "free", maxDriftBpm: 3 }).pass).toBe(false);
    expect(diagnose(r).join(" ")).toMatch(/sped up/);
  });

  it("says so when it hears too little", () => {
    const r = analyseTiming([ex[0]!.t, ex[1]!.t], ex, { bpm: 80, mode: "click" });
    expect(judge(r, crit).pass).toBe(false);
    expect(diagnose(r)[0]).toMatch(/only heard part/);
  });
});
