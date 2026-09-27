import type { Bar, Finger, Note, Pattern, StringNo, TabEvent } from "./schema";

/**
 * Chord shapes and pattern builders shared by every course. Patterns are
 * written as templates over *roles* (R = root bass, A = alternate bass,
 * B = second bass, "3"/"2"/"1" = the top three strings) and then applied to
 * a chord progression, which is how a real player thinks about them too.
 */

export interface Chord {
  name: string;
  /** Frets from string 6 to string 1; null = not played. */
  frets: readonly (number | null)[];
  /** Root bass string (thumb, beats 1 and 3). */
  R: StringNo;
  /** Alternate bass string (thumb, beats 2 and 4). */
  A: StringNo;
}

export const CHORDS = {
  C: { name: "C", frets: [null, 3, 2, 0, 1, 0], R: 5, A: 4 },
  Am: { name: "Am", frets: [null, 0, 2, 2, 1, 0], R: 5, A: 4 },
  G: { name: "G", frets: [3, 2, 0, 0, 0, 3], R: 6, A: 4 },
  Fmaj7: { name: "Fmaj7", frets: [null, null, 3, 2, 1, 0], R: 4, A: 3 },
  Em: { name: "Em", frets: [0, 2, 2, 0, 0, 0], R: 6, A: 4 },
  E: { name: "E", frets: [0, 2, 2, 1, 0, 0], R: 6, A: 4 },
  D: { name: "D", frets: [null, null, 0, 2, 3, 2], R: 4, A: 3 },
} as const satisfies Record<string, Chord>;
export type ChordName = keyof typeof CHORDS;

/** Open-string bass numbers for each chord, used by the bass-map tables. */
export const OPEN_MIDI: Record<StringNo, number> = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };

export function fretOf(ch: Chord, s: StringNo): number {
  return ch.frets[6 - s] ?? 0;
}

/** A triad on strings 3-2-1 over an open bass string, as a chord. */
export function triad(name: string, [f3, f2, f1]: [number, number, number], R: StringNo, A: StringNo = R): Chord {
  const frets: (number | null)[] = [null, null, null, f3, f2, f1];
  frets[6 - R] = 0;
  frets[6 - A] = 0;
  return { name, frets, R, A };
}

type Role = "R" | "A" | "B" | "3" | "2" | "1";
type Hit = Role | readonly [Role, Finger] | Note;
export interface Step {
  at: number;
  hits: readonly Hit[];
  accent?: boolean;
}
export type Template = readonly Step[];

const DEFAULT_FINGER: Record<Role, Finger> = { R: "p", A: "p", B: "p", "3": "i", "2": "m", "1": "a" };

function resolve(ch: Chord, hit: Hit): Note {
  if (typeof hit === "object" && !Array.isArray(hit)) return hit as Note;
  const [role, finger] = (Array.isArray(hit) ? hit : [hit, undefined]) as [Role, Finger | undefined];
  const s: StringNo = role === "R" || role === "B" ? ch.R : role === "A" ? ch.A : (Number(role) as StringNo);
  return { s, f: fretOf(ch, s), finger: finger ?? DEFAULT_FINGER[role] };
}

export function barFrom(ch: Chord, tpl: Template): Bar {
  return {
    chord: ch.name,
    events: tpl.map((st) => ({
      at: st.at,
      kind: "pick" as const,
      notes: st.hits.map((h) => resolve(ch, h)),
      ...(st.accent ? { accent: true } : {}),
    })),
  };
}

export const prog = (names: ChordName[]) => names.map((n) => CHORDS[n]);
const bars = (chords: Chord[], tpl: Template) => chords.map((c) => barFrom(c, tpl));

// ---- Templates -----------------------------------------------------------

export const T_THUMB_ROOT: Template = [0, 1, 2, 3].map((at) => ({ at, hits: ["R"] }));
export const T_THUMB_ALT: Template = [
  { at: 0, hits: ["R"] },
  { at: 1, hits: ["A"] },
  { at: 2, hits: ["B"] },
  { at: 3, hits: ["A"] },
];
export const T_PIMA: Template = [
  { at: 0, hits: ["R"] },
  { at: 0.5, hits: ["3"] },
  { at: 1, hits: ["2"] },
  { at: 1.5, hits: ["1"] },
  { at: 2, hits: ["A"] },
  { at: 2.5, hits: ["3"] },
  { at: 3, hits: ["2"] },
  { at: 3.5, hits: ["1"] },
];
export const T_PAMI: Template = [
  { at: 0, hits: ["R"] },
  { at: 0.5, hits: ["1"] },
  { at: 1, hits: ["2"] },
  { at: 1.5, hits: ["3"] },
  { at: 2, hits: ["A"] },
  { at: 2.5, hits: ["1"] },
  { at: 3, hits: ["2"] },
  { at: 3.5, hits: ["3"] },
];
export const T_PINCH: Template = [
  { at: 0, hits: ["R", "1"] },
  { at: 0.5, hits: ["3"] },
  { at: 1, hits: ["2"] },
  { at: 1.5, hits: ["3"] },
  { at: 2, hits: ["A", "1"] },
  { at: 2.5, hits: ["3"] },
  { at: 3, hits: ["2"] },
  { at: 3.5, hits: ["3"] },
];
const third = 1 / 3;
/** 6/8: two dotted-quarter clicks per bar, three eighths per click. */
export const T_PIMAMI_68: Template = [
  { at: 0, hits: ["R"] },
  { at: third, hits: ["3"] },
  { at: 2 * third, hits: ["2"] },
  { at: 1, hits: ["A", "1"] },
  { at: 1 + third, hits: ["2"] },
  { at: 1 + 2 * third, hits: ["3"] },
];

/** The Travis pattern, built one layer at a time (layer 5 is the full thing). */
export const TRAVIS_LAYERS: Template[] = [
  T_THUMB_ALT,
  [{ at: 0, hits: ["R", ["1", "m"]] }, ...T_THUMB_ALT.slice(1)],
  [{ at: 0, hits: ["R", ["1", "m"]] }, { at: 1, hits: ["A"] }, { at: 1.5, hits: [["2", "i"]] }, { at: 2, hits: ["B"] }, { at: 3, hits: ["A"] }],
  [
    { at: 0, hits: ["R", ["1", "m"]] },
    { at: 1, hits: ["A"] },
    { at: 1.5, hits: [["2", "i"]] },
    { at: 2, hits: ["B"] },
    { at: 2.5, hits: [["1", "m"]] },
    { at: 3, hits: ["A"] },
  ],
  [
    { at: 0, hits: ["R", ["1", "m"]] },
    { at: 1, hits: ["A"] },
    { at: 1.5, hits: [["2", "i"]] },
    { at: 2, hits: ["B"] },
    { at: 2.5, hits: [["1", "m"]] },
    { at: 3, hits: ["A"] },
    { at: 3.5, hits: [["2", "i"]] },
  ],
];
export const T_TRAVIS = TRAVIS_LAYERS[4]!;

export const T_TRIAD: Template = [
  { at: 0, hits: ["R", "3", "2", "1"] },
  { at: 1, hits: ["A"] },
  { at: 2, hits: ["R", "3", "2", "1"] },
  { at: 3, hits: ["A"] },
];
/** Bridge texture: block triad, then roll it back down over a bass pedal. */
export const T_TRIAD_ROLL: Template = [
  { at: 0, hits: ["R", "3", "2", "1"], accent: true },
  { at: 1, hits: ["R"] },
  { at: 1.5, hits: ["1"], accent: true },
  { at: 2, hits: ["R"] },
  { at: 2.5, hits: ["2"] },
  { at: 3, hits: ["R"] },
  { at: 3.5, hits: ["3"] },
];

// ---- Bar builders with overrides ------------------------------------------

export interface TravisOpts {
  /** Replace the bass note at these positions (walk-ups and walk-downs). */
  bass?: Record<number, { s: StringNo; f: number }>;
  /** Melody notes on the top strings; they replace the pattern note there and are accented. */
  melody?: Record<number, { s: StringNo; f: number; finger?: Finger }>;
  mute?: boolean;
  layer?: number;
}

export function travis(ch: Chord, o: TravisOpts = {}): Bar {
  const bar = barFrom(ch, TRAVIS_LAYERS[(o.layer ?? 5) - 1]!);
  const events = bar.events.map((e) => ({ ...e, notes: e.notes.map((n) => ({ ...n })) }));
  for (const [k, b] of Object.entries(o.bass ?? {})) {
    const at = Number(k);
    const ev = events.find((e) => e.at === at);
    const note = { s: b.s, f: b.f, finger: "p" as const };
    if (ev) ev.notes = [note, ...ev.notes.filter((n) => n.finger !== "p")];
    else events.push({ at, kind: "pick", notes: [note] });
  }
  for (const [k, m] of Object.entries(o.melody ?? {})) {
    const at = Number(k);
    const note: Note = { s: m.s, f: m.f, finger: m.finger ?? (m.s === 1 ? "m" : "i") };
    const ev = events.find((e) => e.at === at);
    if (ev) {
      ev.notes = [...ev.notes.filter((n) => n.finger === "p"), note];
      ev.accent = true;
    } else events.push({ at, kind: "pick", notes: [note], accent: true });
  }
  if (o.mute) for (const e of events) for (const n of e.notes) if (n.finger === "p") n.mute = true;
  events.sort((a, b) => a.at - b.at);
  return { chord: ch.name, events };
}

/** Two chords in one bar of Travis: a change every two beats. */
export function travisHalf(a: Chord, b: Chord): Bar {
  const first = barFrom(a, [
    { at: 0, hits: ["R", ["1", "m"]] },
    { at: 1, hits: ["A"] },
    { at: 1.5, hits: [["2", "i"]] },
  ]).events.map((e) => ({ ...e, chord: a.name }));
  const second = barFrom(b, [
    { at: 2, hits: ["R", ["1", "m"]] },
    { at: 3, hits: ["A"] },
    { at: 3.5, hits: [["2", "i"]] },
  ]).events.map((e) => ({ ...e, chord: b.name }));
  return { chord: `${a.name} ${b.name}`, events: [...first, ...second] };
}

function played(ch: Chord, from: StringNo, to: StringNo): Note[] {
  const out: Note[] = [];
  for (let s = from; s >= to; s--) {
    const f = ch.frets[6 - s];
    if (f != null) out.push({ s: s as StringNo, f, finger: "p" });
  }
  return out;
}

type Stroke = "brush" | "flick" | "up" | "chunk" | "R" | "A";
/** Strumming bar: brush = thumb down from the root, flick = index nail down strings 4–1, up = index up 1–3. */
export function strumBar(ch: Chord, strokes: readonly (readonly [number, Stroke])[]): Bar {
  const events: TabEvent[] = strokes.map(([at, k]) => {
    switch (k) {
      case "brush":
        return { at, kind: "strum", dir: "down", finger: "p", notes: played(ch, ch.R, 1) };
      case "flick":
        return { at, kind: "strum", dir: "down", finger: "i", notes: played(ch, 4, 1).map((n) => ({ ...n, finger: "i" as const })) };
      case "up":
        return { at, kind: "strum", dir: "up", finger: "i", notes: played(ch, 3, 1).reverse().map((n) => ({ ...n, finger: "i" as const })) };
      case "chunk":
        return { at, kind: "chunk", notes: [] };
      default:
        return { at, kind: "pick", notes: [resolve(ch, k)] };
    }
  });
  return { chord: ch.name, events };
}

export const S_BOOM_CHICK = [[0, "R"], [1, "flick"], [2, "A"], [3, "flick"]] as const;
export const S_STROKES = [[0, "brush"], [1, "chunk"], [2, "flick"], [3, "chunk"]] as const;
export const S_CHORUS = [[0, "R"], [1, "flick"], [1.5, "up"], [2, "A"], [3, "flick"], [3.5, "up"]] as const;

/** Travis with a percussive chunk (palm slap) in place of the bass on 2 and 4. */
export function percTravis(ch: Chord): Bar {
  const b = travis(ch);
  const events: TabEvent[] = b.events.filter((e) => !(e.at === 1 || e.at === 3));
  events.push({ at: 1, kind: "chunk", notes: [] }, { at: 3, kind: "chunk", notes: [] });
  events.sort((x, y) => x.at - y.at);
  return { chord: ch.name, events };
}

const n = (s: StringNo, f: number, finger: Finger, extra: Partial<Note> = {}): Note => ({ s, f, finger, ...extra });

/** Thumb hammer-on inside the pattern (day 6). */
function hammerBar(ch: Chord): Bar {
  const R = { s: ch.R, f: fretOf(ch, ch.R) };
  return {
    chord: ch.name,
    events: [
      { at: 0, kind: "pick", notes: [n(R.s, R.f, "p"), n(1, 0, "m")] },
      { at: 1, kind: "pick", notes: [n(4, 0, "p")] },
      { at: 1.5, kind: "pick", slur: "h", notes: [n(4, 2, "p")] },
      { at: 2, kind: "pick", notes: [n(R.s, R.f, "p")] },
      { at: 2.5, kind: "pick", notes: [n(1, 0, "m")] },
      { at: 3, kind: "pick", notes: [n(4, 2, "p")] },
      { at: 3.5, kind: "pick", notes: [n(2, 1, "i")] },
    ],
  };
}

function openThumb(s: StringNo): Bar {
  return { chord: `open ${"EADGBE"[6 - s]}`, events: [0, 1, 2, 3].map((at) => ({ at, kind: "pick" as const, notes: [n(s, 0, "p")] })) };
}

const final = (ch: Chord): Bar => ({
  chord: ch.name,
  events: [{ at: 0, kind: "strum", dir: "down", finger: "p", accent: true, notes: played(ch, ch.R, 1) }],
});

// ---- The patterns -----------------------------------------------------------

const C = CHORDS;
const MAIN = prog(["C", "Am", "Fmaj7", "G"]);

/** Melody of "Lanterns": m plays string 1, i plays string 2. */
const MELODY: TravisOpts["melody"][] = [
  { 0: { s: 1, f: 3 }, 2.5: { s: 1, f: 0 } },
  { 0: { s: 1, f: 0 }, 2.5: { s: 1, f: 3 } },
  { 0: { s: 1, f: 1 }, 2.5: { s: 1, f: 0 } },
  { 0: { s: 1, f: 3 }, 2.5: { s: 2, f: 3 } },
];
const melodyBars = (walkUp = false) =>
  MAIN.map((ch, i) => travis(ch, { melody: MELODY[i], ...(walkUp && i === 3 ? { bass: { 2: { s: 5, f: 0 }, 3: { s: 5, f: 2 } } } : {}) }));

const walkBars = () => [
  travis(C.C, { bass: { 3: { s: 5, f: 2 } } }),
  travis(C.Am),
  travis(C.G, { bass: { 2: { s: 5, f: 0 }, 3: { s: 5, f: 2 } } }),
  travis(C.C),
];

const D_TRIADS = [triad("D", [2, 3, 2], 4, 5), triad("D", [7, 7, 5], 4, 5), triad("D", [11, 10, 10], 4, 5)];
const G_TRIADS = [triad("G/D", [4, 3, 3], 4), triad("G/D", [7, 8, 7], 4), triad("G/D", [12, 12, 10], 4)];
const A_TRIADS = [triad("A", [2, 2, 0], 5, 6), triad("A", [6, 5, 5], 5, 6), triad("A", [9, 10, 9], 5, 6)];

const BRIDGE = [
  triad("Am", [5, 5, 5], 5),
  triad("F/A", [5, 6, 5], 5),
  triad("C/A", [5, 5, 3], 5),
  triad("G/A", [7, 8, 7], 5),
  triad("Am", [9, 10, 8], 5),
  triad("F/A", [10, 10, 8], 5),
  triad("C/A", [9, 8, 8], 5),
  triad("G/A", [7, 8, 7], 5),
];

function p(id: string, name: string, b: Bar[], beats = 4, subdiv = 2): Pattern {
  return { id, name, beats, subdiv, bars: b };
}

const intro = melodyBars().concat(melodyBars(true));
const verse = [...bars(prog(["Am", "Fmaj7", "C", "G"]), T_PINCH), ...bars(prog(["Am", "Fmaj7", "C", "G"]), T_PINCH)];
const chorus = [
  ...prog(["Fmaj7", "G", "C", "Am", "Fmaj7", "G", "C"]).map((ch) => strumBar(ch, S_CHORUS)),
  strumBar(C.C, S_STROKES),
];
const bridge = bars(BRIDGE, T_TRIAD_ROLL);
const outro = [...walkBars(), final(C.C)];

const LIST: Pattern[] = [
  p("open-thumb", "Open-string thumb", [openThumb(6), openThumb(5), openThumb(4), openThumb(5)]),
  p("thumb-roots", "Thumb on the root", bars(prog(["C", "Am", "G", "Em"]), T_THUMB_ROOT)),
  p("thumb-alt", "Alternating bass", bars(MAIN, T_THUMB_ALT)),
  p("pima", "p-i-m-a arpeggio", bars(prog(["C", "Am", "G", "Em"]), T_PIMA)),
  p("pima-changes", "p-i-m-a through the changes", bars(prog(["C", "Em", "Am", "Fmaj7"]), T_PIMA)),
  p("pami", "p-a-m-i arpeggio", bars(prog(["C", "Am", "Fmaj7", "G"]), T_PAMI)),
  p("pinch", "Pinch arpeggio", bars(prog(["C", "Am", "Fmaj7", "G"]), T_PINCH)),
  p("pimami-68", "p-i-m-a-m-i in 6/8", bars(prog(["Am", "G", "Fmaj7", "E"]), T_PIMAMI_68), 2, 3),
  ...TRAVIS_LAYERS.map((_, i) => p(`travis-l${i + 1}`, `Travis build: layer ${i + 1}`, [travis(C.C, { layer: i + 1 }), travis(C.C, { layer: i + 1 })])),
  p("travis", "Travis pattern", MAIN.map((ch) => travis(ch))),
  p("travis-half", "Travis, two chords a bar", [travisHalf(C.C, C.G), travisHalf(C.Am, C.Em), travisHalf(C.Fmaj7, C.C), travisHalf(C.D, C.G)]),
  p("triad-ladder", "Triad inversions up the neck", [...D_TRIADS, ...G_TRIADS, ...A_TRIADS].map((ch) => barFrom(ch, T_TRIAD))),
  p("triad-voices", "Triads in one position", [D_TRIADS[1]!, G_TRIADS[1]!, A_TRIADS[1]!, D_TRIADS[1]!].map((ch) => barFrom(ch, T_TRIAD))),
  p("melody-travis", "Melody over the Travis bass", melodyBars()),
  p("strokes", "Brush, chunk, flick", prog(["C", "G"]).map((ch) => strumBar(ch, S_STROKES))),
  p("boom-chick", "Bass and flick", prog(["C", "G", "Am", "Fmaj7"]).map((ch) => strumBar(ch, S_BOOM_CHICK))),
  p("perc-travis", "Percussive Travis", MAIN.map(percTravis)),
  p("strum-chorus", "Bass-strum groove", MAIN.map((ch) => strumBar(ch, S_CHORUS))),
  p("switch", "Pick four, strum four", [...MAIN.map((ch) => travis(ch)), ...MAIN.map((ch) => strumBar(ch, S_CHORUS))]),
  p("walks", "Bass walks", walkBars()),
  p("hammer", "Hammer-on in the pattern", [hammerBar(C.Am), hammerBar(C.C)]),
  p("pm-travis", "Palm-muted Travis", MAIN.map((ch) => travis(ch, { mute: true }))),
  p("stamina", "Stamina loop", [...melodyBars(), ...walkBars()]),
  p("lanterns-intro", "Lanterns: intro", intro),
  p("lanterns-verse", "Lanterns: verse", verse),
  p("lanterns-chorus", "Lanterns: chorus", chorus),
  p("lanterns-bridge", "Lanterns: bridge", bridge),
  p("lanterns-outro", "Lanterns: outro", outro),
  p("lanterns", "Lanterns (full piece)", [...intro, ...verse, ...chorus, ...bridge, ...outro]),
];

export const PATTERNS: Record<string, Pattern> = Object.fromEntries(LIST.map((x) => [x.id, x]));

export function getPattern(id: string): Pattern {
  const pat = PATTERNS[id];
  if (!pat) throw new Error(`Unknown pattern ${id}`);
  return pat;
}
