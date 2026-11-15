import type { Bar, Finger, Note, Pattern, StringNo, TabEvent } from "../schema";
import { OPEN_MIDI } from "../patterns";
import { characteristic, intervalOf, type ModeId } from "./theory";

/**
 * Riffs are written one bar per string, as space-separated notes:
 *
 *   at:string/fret            0.5:3/7
 *   two notes at once         0:5/0+1/3
 *   picking-hand finger       0:5/0p+1/3a      (p i m a, for fingerpicked riffs)
 *   hammer / pull / slide     1.5:2/7~h  ~p  ~s
 *   bend (in whole steps)     0:2/7^0.5   0:2/5^1
 *   accent                    0:2/8>
 *   passing note, off-scale   0:3/5*
 *
 * `at` is in beats from the bar line. Notes are marked automatically as the
 * root or as one of the mode's characteristic notes (a bend by where it lands).
 */

const TOKEN = /^([\d.]+):([\d/+pima]+)(.*)$/;
const NOTE = /^([1-6])\/(\d+)([pima])?$/;

export function parseBar(mode: ModeId, text: string, chord?: string): Bar {
  const chars = characteristic(mode);
  const events: TabEvent[] = text
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const m = TOKEN.exec(tok);
      if (!m) throw new Error(`Bad riff note "${tok}"`);
      const flags = m[3]!;
      const bend = /\^([\d.]+)/.exec(flags);
      const slur = /~([hps])/.exec(flags);
      const pass = flags.includes("*");
      const notes: Note[] = m[2]!.split("+").map((part) => {
        const n = NOTE.exec(part);
        if (!n) throw new Error(`Bad riff note "${tok}"`);
        const s = Number(n[1]) as StringNo;
        const f = Number(n[2]);
        const iv = intervalOf(OPEN_MIDI[s] + f + (bend ? Number(bend[1]) * 2 : 0));
        const mark = pass ? "pass" : iv === 0 ? "root" : chars.includes(iv) ? "char" : undefined;
        return { s, f, finger: (n[3] as Finger | undefined) ?? "i", ...(mark ? { mark } : {}) };
      });
      return {
        at: Number(m[1]),
        kind: "pick" as const,
        notes,
        ...(slur ? { slur: slur[1] as "h" | "p" | "s" } : {}),
        ...(bend ? { bend: Number(bend[1]) } : {}),
        ...(flags.includes(">") ? { accent: true } : {}),
      };
    });
  return { ...(chord ? { chord } : {}), events };
}

export function riffPattern(mode: ModeId, id: string, name: string, bars: readonly string[], chords: readonly string[]): Pattern {
  return { id, name, beats: 4, subdiv: 2, bars: bars.map((b, i) => parseBar(mode, b, chords[i % chords.length])) };
}

/** Interval above A that an event's note actually sounds (after any bend). */
export const soundingInterval = (ev: TabEvent, n: Note) => intervalOf(OPEN_MIDI[n.s] + n.f + (ev.bend ?? 0) * 2);
