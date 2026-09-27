import type { Pattern, TabEvent } from "../schema";

/** Pure timing maths for patterns: where every note and click falls at a tempo. */

export const beatSec = (bpm: number) => 60 / bpm;
export const barSec = (p: Pattern, bpm: number) => p.beats * beatSec(bpm);

export function barAt(p: Pattern, i: number) {
  return p.bars[((i % p.bars.length) + p.bars.length) % p.bars.length]!;
}

export interface Scheduled {
  t: number;
  bar: number;
  idx: number;
  ev: TabEvent;
}

export function eventsForBar(p: Pattern, barIndex: number, barStart: number, bpm: number): Scheduled[] {
  return barAt(p, barIndex).events.map((ev, idx) => ({ t: barStart + ev.at * beatSec(bpm), bar: barIndex, idx, ev }));
}

export function clicksForBar(p: Pattern, barStart: number, bpm: number): { t: number; accent: boolean }[] {
  return Array.from({ length: p.beats }, (_, i) => ({ t: barStart + i * beatSec(bpm), accent: i === 0 }));
}

export interface Trainer {
  start: number;
  step: number;
  every: number;
  max: number;
}

/** Speed trainer: +step bpm every `every` bars, capped at max. */
export function trainerBpm(bar: number, t: Trainer): number {
  if (t.every <= 0 || t.step <= 0) return t.start;
  return Math.min(t.max, t.start + Math.floor(bar / t.every) * t.step);
}

/** "1", "1&", "2" … for 4/4; "1".."6" for 6/8. */
export function beatLabel(p: Pattern, at: number): string {
  const col = Math.round(at * p.subdiv);
  if (p.subdiv === 3) return String(col + 1);
  const beat = Math.floor(col / p.subdiv) + 1;
  return col % p.subdiv === 0 ? String(beat) : `${beat}&`;
}

export const isOnBeat = (at: number) => Math.abs(at - Math.round(at)) < 1e-6;

/** Thumb events carry the beat: anything the thumb plays, a thumb brush, or a chunk. */
export function groupOf(ev: TabEvent): "thumb" | "fingers" {
  if (ev.kind === "chunk") return "thumb";
  if (ev.kind === "strum") return ev.finger === "p" ? "thumb" : "fingers";
  return ev.notes.some((n) => n.finger === "p") ? "thumb" : "fingers";
}

export interface Expected {
  t: number;
  /** 1-based bar number within the take. */
  bar: number;
  label: string;
  group: "thumb" | "fingers";
  onBeat: boolean;
  /** First note of a new chord. */
  change: boolean;
  /** Slurs (hammer-ons) may not produce a detectable onset. */
  optional: boolean;
}

/** Every note onset expected in a take of `bars` bars starting at t0 (seconds). */
export function expectedOnsets(p: Pattern, bpm: number, bars: number, t0 = 0): Expected[] {
  const out: Expected[] = [];
  let prevChord: string | undefined;
  for (let b = 0; b < bars; b++) {
    const bar = barAt(p, b);
    const start = t0 + b * barSec(p, bpm);
    for (const ev of bar.events) {
      const chord = ev.chord ?? bar.chord;
      out.push({
        t: start + ev.at * beatSec(bpm),
        bar: b + 1,
        label: beatLabel(p, ev.at),
        group: groupOf(ev),
        onBeat: isOnBeat(ev.at),
        change: prevChord !== undefined && chord !== undefined && chord !== prevChord,
        optional: !!ev.slur,
      });
      if (chord !== undefined) prevChord = chord;
    }
  }
  return out;
}

export const takeSeconds = (p: Pattern, bpm: number, bars: number) => bars * barSec(p, bpm);
