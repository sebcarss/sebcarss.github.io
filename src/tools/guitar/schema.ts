import { z } from "zod";

/**
 * Data model for Guitar School. A course is pure data: days → blocks →
 * exercises, each exercise pointing at a tab pattern by id. Adding a course
 * (e.g. country) means writing one of these and listing it in registry.ts.
 */

export type Finger = "p" | "i" | "m" | "a";
export type StringNo = 1 | 2 | 3 | 4 | 5 | 6;

export interface Note {
  s: StringNo;
  f: number;
  finger: Finger;
  /** Palm-muted (thumb notes on day 6). */
  mute?: boolean;
}

export type EventKind = "pick" | "strum" | "chunk";

export interface TabEvent {
  /** Position in the bar, in clicks from the downbeat (0, 0.5, 1 …; thirds in 6/8). */
  at: number;
  kind: EventKind;
  /** Notes sounded. For a strum, every string it crosses. For a chunk, none. */
  notes: Note[];
  /** Strum direction and the finger that plays it. */
  dir?: "down" | "up";
  finger?: Finger;
  accent?: boolean;
  /** Hammer-on or pull-off: sounded by the fretting hand, not picked. */
  slur?: "h" | "p";
  /** Chord this event belongs to, when a bar holds two chords. */
  chord?: string;
}

export interface Bar {
  chord?: string;
  events: TabEvent[];
}

export interface Pattern {
  id: string;
  name: string;
  /** Clicks per bar: 4 for 4/4, 2 for 6/8 (dotted-quarter click). */
  beats: number;
  /** Grid columns per click: 2 for eighths, 3 for 6/8 eighths. */
  subdiv: number;
  bars: Bar[];
}

export const Criteria = z.object({
  bpm: z.number().positive(),
  bars: z.number().int().positive(),
  /** "click" keeps the click on for the take; "free" stops it after the count-in. */
  mode: z.enum(["click", "free"]).default("click"),
  maxMeanAbsMs: z.number().positive().optional(),
  maxMissed: z.number().int().nonnegative().optional(),
  maxChangeMs: z.number().positive().optional(),
  maxDriftBpm: z.number().positive().optional(),
  maxThumbMs: z.number().positive().optional(),
});
export type Criteria = z.infer<typeof Criteria>;

export const Pitfall = z.object({ symptom: z.string(), cause: z.string(), fix: z.string() });
export type Pitfall = z.infer<typeof Pitfall>;

export const Challenge = z.object({
  id: z.string(),
  goal: z.string(),
  criteria: Criteria,
  /** Things only you can judge; all must be ticked for a self-assessed pass. */
  checklist: z.array(z.string()).default([]),
});
export type Challenge = z.infer<typeof Challenge>;

export const Exercise = z.object({
  id: z.string(),
  title: z.string(),
  pattern: z.string(),
  bpm: z.object({ start: z.number(), target: z.number() }),
  how: z.array(z.string()).default([]),
  challenge: Challenge.optional(),
});
export type Exercise = z.infer<typeof Exercise>;

export const BlockKind = z.enum(["warmup", "technique", "pattern", "challenge", "review"]);
export type BlockKind = z.infer<typeof BlockKind>;

export const Block = z.object({
  id: z.string(),
  kind: BlockKind,
  title: z.string(),
  minutes: z.number().positive(),
  /** Why it works: the theory, told as the reason for the sound. */
  why: z.array(z.string()).default([]),
  steps: z.array(z.string()).default([]),
  exercises: z.array(Exercise).default([]),
  pitfalls: z.array(Pitfall).default([]),
  /** Benchmark tests run in this block (ids from course.tests). */
  tests: z.array(z.string()).default([]),
  /** Review prompts. */
  prompts: z.array(z.string()).default([]),
});
export type Block = z.infer<typeof Block>;

export const Day = z.object({
  n: z.number().int().positive(),
  title: z.string(),
  focus: z.string(),
  outcome: z.string(),
  blocks: z.array(Block),
});
export type Day = z.infer<typeof Day>;

export const Test = z.object({
  id: z.string(),
  title: z.string(),
  what: z.string(),
  pattern: z.string(),
  criteria: Criteria,
  checklist: z.array(z.string()).default([]),
  /** Also taken on day 1 at whatever tempo you can manage. */
  baseline: z.boolean().default(false),
});
export type Test = z.infer<typeof Test>;

export const Course = z.object({
  id: z.string(),
  title: z.string(),
  emoji: z.string(),
  blurb: z.string(),
  goal: z.string(),
  minutesPerDay: z.number().positive(),
  tests: z.array(Test),
  days: z.array(Day),
});
export type Course = z.infer<typeof Course>;
export type CourseInput = z.input<typeof Course>;
