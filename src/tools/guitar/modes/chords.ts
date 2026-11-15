import type { Bar, Pattern } from "../schema";
import { strumBar, type Chord } from "../patterns";

/**
 * Looper chords for the mode vamps. Several keep the open A string ringing
 * under a shape that moves, which is what pins the ear to A.
 */
export const MODE_CHORDS = {
  A: { name: "A", frets: [null, 0, 2, 2, 2, 0], R: 5, A: 4 },
  Am: { name: "Am", frets: [null, 0, 2, 2, 1, 0], R: 5, A: 4 },
  Am7: { name: "Am7", frets: [null, 0, 2, 0, 1, 0], R: 5, A: 4 },
  "Am7♭5": { name: "Am7♭5", frets: [null, 0, 1, 0, 1, null], R: 5, A: 4 },
  G: { name: "G", frets: [3, 2, 0, 0, 0, 3], R: 6, A: 4 },
  D: { name: "D", frets: [null, null, 0, 2, 3, 2], R: 4, A: 3 },
  "D/A": { name: "D/A", frets: [null, 0, 0, 2, 3, 2], R: 5, A: 4 },
  E: { name: "E", frets: [0, 2, 2, 1, 0, 0], R: 6, A: 4 },
  Fmaj7: { name: "Fmaj7", frets: [null, null, 3, 2, 1, 0], R: 4, A: 3 },
  /** The A shape slid up two frets over the open A and E strings. */
  "B/A": { name: "B/A", frets: [null, 0, 4, 4, 4, 0], R: 5, A: 4 },
  /** The A shape slid up one fret over the open A string; top string muted. */
  "B♭/A": { name: "B♭/A", frets: [null, 0, 3, 3, 3, null], R: 5, A: 4 },
} as const satisfies Record<string, Chord>;
export type ModeChord = keyof typeof MODE_CHORDS;

const FULL = [[0, "brush"], [1, "flick"], [1.5, "up"], [2, "R"], [3, "flick"], [3.5, "up"]] as const;
const HALF = [[0, "brush"], [1, "flick"], [1.5, "up"]] as const;

/** One vamp bar: a single chord, or two chords for two beats each. */
export function vampBar(names: readonly ModeChord[]): Bar {
  const a: Chord = MODE_CHORDS[names[0]!];
  const b: Chord | undefined = names[1] ? MODE_CHORDS[names[1]] : undefined;
  if (!b) return strumBar(a, FULL);
  const first = strumBar(a, HALF).events.map((e) => ({ ...e, chord: a.name }));
  const second = strumBar(b, HALF).events.map((e) => ({ ...e, at: e.at + 2, chord: b.name }));
  return { chord: `${a.name}  ${b.name}`, events: [...first, ...second] };
}

export function vampPattern(id: string, name: string, bars: readonly (readonly ModeChord[])[]): Pattern {
  return { id, name, beats: 4, subdiv: 2, bars: bars.map(vampBar) };
}
