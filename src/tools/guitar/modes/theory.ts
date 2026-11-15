import type { StringNo } from "../schema";
import { OPEN_MIDI } from "../patterns";

/**
 * Pure mode theory for the Mode Library. Everything is an interval in
 * semitones above the root (0–11); the library is written from A.
 */

export type ModeId = "ionian" | "dorian" | "phrygian" | "lydian" | "mixolydian" | "aeolian" | "locrian";

export const MODE_INTERVALS: Record<ModeId, readonly number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
};

/** The notes that give each mode its sound: what to land on and hold. */
const CHARACTERISTIC: Record<ModeId, readonly number[]> = {
  ionian: [5, 11],
  dorian: [9],
  phrygian: [1],
  lydian: [6],
  mixolydian: [4, 10],
  aeolian: [8],
  locrian: [1, 6],
};

export const MINOR_PENTATONIC = [0, 3, 5, 7, 10] as const;
export const MAJOR_PENTATONIC = [0, 2, 4, 7, 9] as const;

/** Pitch class of the library's root, A. */
export const ROOT_PC = 9;

const MAJOR = MODE_INTERVALS.ionian;
const LETTERS = "CDEFGAB";
const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];
const ACC: Record<number, string> = { [-1]: "♭", 0: "", 1: "♯" };

export const characteristic = (mode: ModeId) => CHARACTERISTIC[mode];
export const inMode = (mode: ModeId, interval: number) => MODE_INTERVALS[mode].includes(interval);

/** Interval above the root (0–11) of a MIDI note. */
export function intervalOf(midi: number, rootPc = ROOT_PC): number {
  return (((midi - rootPc) % 12) + 12) % 12;
}

export const intervalAt = (s: StringNo, f: number, rootPc = ROOT_PC) => intervalOf(OPEN_MIDI[s] + f, rootPc);

/** "♭7", "♯4", "3": a mode's degree compared with the major scale. */
export function degreeLabel(mode: ModeId, interval: number): string {
  const i = MODE_INTERVALS[mode].indexOf(interval);
  if (i < 0) return "";
  return `${ACC[interval - MAJOR[i]!] ?? ""}${i + 1}`;
}

/** "1 2 3 4 5 6 ♭7". */
export const formula = (mode: ModeId) => MODE_INTERVALS[mode].map((iv) => degreeLabel(mode, iv)).join(" ");

/** Note name of a mode degree, spelled one letter per degree ("D♯" in A Lydian, "E♭" in A Locrian). */
export function noteName(mode: ModeId, interval: number, rootLetter = "A"): string {
  const i = MODE_INTERVALS[mode].indexOf(interval);
  if (i < 0) return "";
  const rootIdx = LETTERS.indexOf(rootLetter);
  const letterIdx = (rootIdx + i) % 7;
  const want = (NATURAL_PC[rootIdx]! + interval) % 12;
  let diff = want - NATURAL_PC[letterIdx]!;
  if (diff > 6) diff -= 12;
  if (diff < -6) diff += 12;
  return `${LETTERS[letterIdx]}${ACC[diff] ?? ""}`;
}

export const noteNames = (mode: ModeId) => MODE_INTERVALS[mode].map((iv) => noteName(mode, iv));

export interface PentatonicDiff {
  /** The pentatonic the mode grows out of: minor if it has a ♭3, else major. */
  base: "minor" | "major";
  /** Mode notes the pentatonic doesn't have. */
  added: number[];
  /** Pentatonic notes the mode doesn't have (only Locrian: the 5th). */
  dropped: number[];
}

export function pentatonicDiff(mode: ModeId): PentatonicDiff {
  const ivs = MODE_INTERVALS[mode];
  const base = ivs.includes(3) ? "minor" : "major";
  const penta: readonly number[] = base === "minor" ? MINOR_PENTATONIC : MAJOR_PENTATONIC;
  return { base, added: ivs.filter((iv) => !penta.includes(iv)), dropped: penta.filter((iv) => !ivs.includes(iv)) };
}

export interface MapCell {
  s: StringNo;
  f: number;
  interval: number;
  label: string;
  role: "root" | "penta" | "added";
  char: boolean;
}

/** Every mode note between two frets, tagged as root, pentatonic or added. */
export function fretboardMap(mode: ModeId, from = 4, to = 9): MapCell[] {
  const { base } = pentatonicDiff(mode);
  const penta: readonly number[] = base === "minor" ? MINOR_PENTATONIC : MAJOR_PENTATONIC;
  const out: MapCell[] = [];
  for (const s of [1, 2, 3, 4, 5, 6] as StringNo[]) {
    for (let f = from; f <= to; f++) {
      const interval = intervalAt(s, f);
      if (!inMode(mode, interval)) continue;
      out.push({
        s,
        f,
        interval,
        label: degreeLabel(mode, interval),
        role: interval === 0 ? "root" : penta.includes(interval) ? "penta" : "added",
        char: CHARACTERISTIC[mode].includes(interval),
      });
    }
  }
  return out;
}
