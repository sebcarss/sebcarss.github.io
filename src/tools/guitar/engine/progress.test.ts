import { describe, expect, it } from "vitest";
import { COURSES } from "../registry";
import { EMPTY, Progress, carryOver, currentDay, dayKey, dayStatus, key, reducer } from "./progress";

const course = COURSES[0]!;
const r = (bpm: number, pass: boolean) => ({ at: "2026-09-27", bpm, pass });

describe("progress", () => {
  it("records attempts and keeps the best pass", () => {
    let s = reducer(EMPTY, { type: "attempt", id: "x", result: r(70, true) });
    s = reducer(s, { type: "attempt", id: "x", result: r(80, false) });
    s = reducer(s, { type: "attempt", id: "x", result: r(75, true) });
    expect(s.challenges.x).toMatchObject({ attempts: 3, passed: true, best: { bpm: 75 }, last: { bpm: 75 } });
  });

  it("an exit pass is never overwritten by a fail, a baseline is", () => {
    let s = reducer(EMPTY, { type: "test", phase: "exit", id: "t2", result: r(90, true) });
    s = reducer(s, { type: "test", phase: "exit", id: "t2", result: r(90, false) });
    expect(s.tests.exit.t2!.pass).toBe(true);
    s = reducer(s, { type: "test", phase: "baseline", id: "t2", result: r(50, true) });
    s = reducer(s, { type: "test", phase: "baseline", id: "t2", result: r(60, false) });
    expect(s.tests.baseline.t2!.bpm).toBe(60);
  });

  it("carries failed challenges into the next day and reports day status", () => {
    const d1 = dayKey(course.id, 1);
    let s = reducer(EMPTY, { type: "attempt", id: key(course, "c-thumb-alt"), result: r(80, false) });
    expect(dayStatus(course, s, 1)).toBe("started");
    expect(carryOver(course, s, 2).map((c) => c.exercise.challenge!.id)).toEqual(["c-thumb-alt"]);
    s = reducer(s, { type: "completeDay", day: d1, at: "now" });
    // Closing the day carries the untried one too.
    expect(carryOver(course, s, 2).map((c) => c.exercise.challenge!.id)).toEqual(["c-thumb-alt", "c-pima"]);
    expect(dayStatus(course, s, 1)).toBe("carry");
    expect(currentDay(course, s)).toBe(2);
    s = reducer(s, { type: "attempt", id: key(course, "c-thumb-alt"), result: r(80, true) });
    s = reducer(s, { type: "attempt", id: key(course, "c-pima"), result: r(70, true) });
    expect(dayStatus(course, s, 1)).toBe("done");
    expect(carryOver(course, s, 2)).toEqual([]);
  });

  it("parses stored progress leniently", () => {
    expect(Progress.parse({ v: 1 })).toEqual(EMPTY);
    expect(Progress.safeParse({ v: 2 }).success).toBe(false);
  });

  it("reset keeps the calibration", () => {
    const s = reducer(reducer(EMPTY, { type: "latency", ms: 120 }), { type: "bestBpm", id: "a", bpm: 80 });
    expect(reducer(s, { type: "reset" })).toEqual({ ...EMPTY, latencyMs: 120 });
  });
});
