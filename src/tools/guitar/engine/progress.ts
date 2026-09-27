import { z } from "zod";
import type { Course, Exercise } from "../schema";

/** Pure progress state for Guitar School (one object for every course). */

export const Result = z.object({
  at: z.string(),
  bpm: z.number(),
  pass: z.boolean(),
  /** Self-assessed (no timing check). */
  self: z.boolean().optional(),
  meanAbsMs: z.number().nullable().optional(),
  missed: z.number().optional(),
  driftBpm: z.number().nullable().optional(),
  thumbMs: z.number().nullable().optional(),
});
export type Result = z.infer<typeof Result>;

const ChallengeProgress = z.object({
  attempts: z.number().int().nonnegative(),
  passed: z.boolean(),
  best: Result.optional(),
  last: Result.optional(),
});
export type ChallengeProgress = z.infer<typeof ChallengeProgress>;

const DayProgress = z.object({
  completedAt: z.string().optional(),
  blocksDone: z.array(z.string()).default([]),
});

export const Progress = z.object({
  v: z.literal(1),
  latencyMs: z.number().nullable().default(null),
  challenges: z.record(z.string(), ChallengeProgress).default({}),
  bestBpm: z.record(z.string(), z.number()).default({}),
  tests: z
    .object({
      baseline: z.record(z.string(), Result).default({}),
      exit: z.record(z.string(), Result).default({}),
    })
    .default({ baseline: {}, exit: {} }),
  /** Keyed "<course>:<day>". */
  days: z.record(z.string(), DayProgress).default({}),
  notes: z.record(z.string(), z.string()).default({}),
});
export type Progress = z.infer<typeof Progress>;

export const EMPTY: Progress = { v: 1, latencyMs: null, challenges: {}, bestBpm: {}, tests: { baseline: {}, exit: {} }, days: {}, notes: {} };

export const dayKey = (course: string, n: number) => `${course}:${n}`;
/** Challenge, test and exercise ids are stored per course: "<course>:<id>". */
export const key = (course: Course | string, id: string) => `${typeof course === "string" ? course : course.id}:${id}`;

export type Action =
  | { type: "attempt"; id: string; result: Result }
  | { type: "test"; phase: "baseline" | "exit"; id: string; result: Result }
  | { type: "bestBpm"; id: string; bpm: number }
  | { type: "block"; day: string; block: string; done: boolean }
  | { type: "completeDay"; day: string; at: string }
  | { type: "reopenDay"; day: string }
  | { type: "note"; day: string; text: string }
  | { type: "latency"; ms: number | null }
  | { type: "reset" };

export function reducer(s: Progress, a: Action): Progress {
  switch (a.type) {
    case "attempt": {
      const cur = s.challenges[a.id] ?? { attempts: 0, passed: false };
      const better = a.result.pass && (!cur.best || !cur.best.pass || a.result.bpm >= cur.best.bpm);
      const next: ChallengeProgress = {
        attempts: cur.attempts + 1,
        passed: cur.passed || a.result.pass,
        last: a.result,
        best: better ? a.result : (cur.best ?? a.result),
      };
      return { ...s, challenges: { ...s.challenges, [a.id]: next } };
    }
    case "test": {
      const book = s.tests[a.phase];
      const cur = book[a.id];
      // An exit pass is never overwritten by a later fail; a baseline retake replaces the old one.
      if (a.phase === "exit" && cur?.pass && !a.result.pass) return s;
      return { ...s, tests: { ...s.tests, [a.phase]: { ...book, [a.id]: a.result } } };
    }
    case "bestBpm": {
      if ((s.bestBpm[a.id] ?? 0) >= a.bpm) return s;
      return { ...s, bestBpm: { ...s.bestBpm, [a.id]: a.bpm } };
    }
    case "block": {
      const d = s.days[a.day] ?? { blocksDone: [] };
      const set = new Set(d.blocksDone);
      if (a.done) set.add(a.block);
      else set.delete(a.block);
      return { ...s, days: { ...s.days, [a.day]: { ...d, blocksDone: [...set] } } };
    }
    case "completeDay": {
      const d = s.days[a.day] ?? { blocksDone: [] };
      return { ...s, days: { ...s.days, [a.day]: { ...d, completedAt: a.at } } };
    }
    case "reopenDay": {
      const d = s.days[a.day];
      if (!d) return s;
      const { completedAt: _, ...rest } = d;
      return { ...s, days: { ...s.days, [a.day]: rest } };
    }
    case "note":
      return { ...s, notes: { ...s.notes, [a.day]: a.text } };
    case "latency":
      return { ...s, latencyMs: a.ms };
    case "reset":
      return { ...EMPTY, latencyMs: s.latencyMs };
  }
}

export const challengesOf = (course: Course, n: number): Exercise[] =>
  (course.days.find((d) => d.n === n)?.blocks ?? []).flatMap((b) => b.exercises.filter((e) => e.challenge));

export type DayStatus = "todo" | "started" | "done" | "carry";

export function dayStatus(course: Course, s: Progress, n: number): DayStatus {
  const dp = s.days[dayKey(course.id, n)];
  const chs = challengesOf(course, n);
  const allPassed = chs.every((e) => s.challenges[key(course, e.challenge!.id)]?.passed);
  if (dp?.completedAt) return allPassed ? "done" : "carry";
  if (dp?.blocksDone.length || chs.some((e) => s.challenges[key(course, e.challenge!.id)]?.attempts)) return "started";
  return "todo";
}

/**
 * Challenges from earlier days that you attempted and didn't pass (or whose
 * day you closed without passing). They go to the top of the next warm-up.
 */
export function carryOver(course: Course, s: Progress, n: number, limit = 3): { day: number; exercise: Exercise }[] {
  const out: { day: number; exercise: Exercise }[] = [];
  for (let d = n - 1; d >= 1 && out.length < limit; d--) {
    const closed = !!s.days[dayKey(course.id, d)]?.completedAt;
    for (const e of challengesOf(course, d)) {
      const cp = s.challenges[key(course, e.challenge!.id)];
      if (cp?.passed) continue;
      if ((cp?.attempts ?? 0) > 0 || closed) out.push({ day: d, exercise: e });
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** The day to open next: the first one not closed. */
export function currentDay(course: Course, s: Progress): number {
  for (const d of course.days) if (!s.days[dayKey(course.id, d.n)]?.completedAt) return d.n;
  return course.days[course.days.length - 1]?.n ?? 1;
}
