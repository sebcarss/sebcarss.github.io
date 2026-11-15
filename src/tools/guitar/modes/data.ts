import { z } from "zod";
import type { Pattern } from "../schema";
import { MODE_CHORDS, vampPattern, type ModeChord } from "./chords";
import { riffPattern } from "./riff";
import type { ModeId } from "./theory";

/**
 * The Mode Library: every mode from A, each with a vamp to record on a
 * looper and original riffs that lean on the notes that make its sound.
 * Riff notation is documented in riff.ts; data.test.ts checks every note
 * against the mode.
 */

export const RIFF_KINDS = ["bridge", "lead", "finger", "genre"] as const;
export type RiffKind = (typeof RIFF_KINDS)[number];
export const KIND_LABEL: Record<RiffKind, string> = {
  bridge: "From the pentatonic",
  lead: "Lead lines",
  finger: "Fingerpicked",
  genre: "Genre flavour",
};

const Meta = z.object({
  id: z.string(),
  name: z.string().min(1),
  /** The sound in a few words, for the card. */
  sound: z.string().min(1),
  /** What it feels like and where you hear it. */
  feel: z.string().min(1),
  /** How to get there from the pentatonic box at fret 5. */
  fromBox: z.string().min(1),
  vampWhy: z.string().min(1),
  vampTip: z.string().min(1),
  bpm: z.number().positive(),
});

export interface Riff {
  id: string;
  kind: RiffKind;
  title: string;
  listenFor: string;
  pattern: Pattern;
}

export interface Mode extends z.infer<typeof Meta> {
  id: ModeId;
  /** Chords per vamp bar. */
  vampBars: readonly (readonly ModeChord[])[];
  vamp: Pattern;
  riffs: Riff[];
}

type RiffInput = [kind: RiffKind, slug: string, title: string, listenFor: string, bars: [string, string]];

function mode(meta: z.input<typeof Meta> & { id: ModeId }, vampBars: readonly (readonly ModeChord[])[], riffs: RiffInput[]): Mode {
  const m = Meta.parse(meta);
  const labels = vampBars.map((b) => b.map((c) => MODE_CHORDS[c].name).join("  "));
  return {
    ...m,
    id: meta.id,
    vampBars,
    vamp: vampPattern(`${meta.id}-vamp`, `A ${m.name} vamp`, vampBars),
    riffs: riffs.map(([kind, slug, title, listenFor, bars]) => ({
      id: `${meta.id}-${slug}`,
      kind,
      title,
      listenFor,
      pattern: riffPattern(meta.id, `${meta.id}-${slug}`, title, bars, labels),
    })),
  };
}

// The picking pattern shared by the fingerpicked riffs over an A-string bass.
const A_SHAPE = "0:5/0p+1/0a 0.5:3/2i 1:4/2p 1.5:2/2m 2:5/0p+1/0a 2.5:3/2i 3:4/2p 3.5:2/2m";
const BB_OVER_A = "0:5/0p+2/3m 0.5:3/3i 1:4/3p 1.5:2/3m 2:5/0p+2/3m 2.5:3/3i 3:4/3p 3.5:3/3i";

/** In suggested learning order: nearest to the blues box first. */
export const MODES: Mode[] = [
  mode(
    {
      id: "mixolydian",
      name: "Mixolydian",
      sound: "Bluesy but major: a major scale with a ♭7.",
      feel: "The sound of classic rock, country and jam-band soloing. It is major and happy, but the ♭7 keeps it loose and stops it sounding like a nursery rhyme.",
      fromBox:
        "You already play its ♭7 (G) in the minor pentatonic box. The change is the third: push C up a fret to C♯. Then add B and F♯. Hammering from C to C♯ is the whole sound in one move.",
      vampWhy: "A to G is the giveaway: a major chord a whole step below a major home chord only exists in Mixolydian. D brings it back round to A.",
      vampTip: "Record two bars: a full bar of A, then G and D for two beats each. Keep the strum light so the lead sits on top.",
      bpm: 92,
    },
    [["A"], ["G", "D"]],
    [
      ["bridge", "minor-to-major", "Minor third to major third", "The C to C♯ hammer-on in beat 1. The first note is from your blues box; the second is the mode.", [
        "0:3/5* 0.5:3/6~h 1:2/5 1.5:2/8 2:2/5 2.5:3/6 3:4/7",
        "0:4/5 0.5:4/7 1:3/4 1.5:4/7 2:3/7 2.5:4/4 3:4/7",
      ]],
      ["bridge", "box-plus-two", "The box with two changes", "The familiar box shape coming down, but through F♯ and C♯ instead of straight to C.", [
        "0:1/5 0.5:2/8 1:2/7 1.5:2/5 2:3/6 2.5:3/7 3:3/6 3.5:4/7",
        "0:4/5 0.5:3/4 1:3/7 1.5:3/4 2:4/4 2.5:4/7 3:3/7 3.5:4/7",
      ]],
      ["lead", "bend-to-seven", "Bend into the flat seven", "A half-step bend from F♯ up to G, then the major third answering it.", [
        "0:2/7^0.5> 1:2/5 1.5:3/6 2:3/7 2.5:3/6 3:4/7",
        "0:2/8 0.5:3/7 1:3/4 2:2/7 2.5:2/5 3:3/7 3.5:3/6",
      ]],
      ["lead", "chord-chase", "Chase the chords", "An A7 arpeggio, then the notes of G and D as each chord arrives. Chord tones make any mode obvious.", [
        "0:4/7 0.5:3/6 1:2/5 1.5:2/8 2:1/5 2.5:2/8 3:2/5 3.5:3/6",
        "0:4/5 0.5:3/4 1:3/7 1.5:2/8 2:2/7 2.5:3/7 3:4/7",
      ]],
      ["finger", "open-a7", "Open A with a seventh on top", "The G on the top string over an A major chord: that clash-that-works is Mixolydian.", [
        "0:5/0p+1/3a 0.5:3/2i 1:4/2p 1.5:2/2m 2:5/0p+1/0a 2.5:3/2i 3:4/2p 3.5:2/2m",
        "0:6/3p+1/3a 0.5:3/0i 1:4/0p 1.5:2/0m 2:4/0p+1/2a 2.5:3/2i 3:4/0p 3.5:2/3m",
      ]],
      ["genre", "country-rock", "Country-rock double stops", "Two strings at a time, sliding up into C♯ and E. Let both notes ring together.", [
        "0:3/4+2/3 0.5:3/6+2/5~s 1:4/7 1.5:3/6+2/5 2:4/7 2.5:3/7+2/8 3:3/6+2/5 3.5:4/7",
        "0:3/4+2/3 0.5:4/5 1:3/4+2/3 1.5:4/5 2:3/2+2/3 2.5:4/4 3:3/2+2/3",
      ]],
    ],
  ),
  mode(
    {
      id: "dorian",
      name: "Dorian",
      sound: "Minor with a bright 6th: smooth, soulful, a little jazzy.",
      feel: "The sound of minor-key funk, Latin rock and soul-jazz solos. It is minor, but not sad: the natural 6th lifts it.",
      fromBox: "Keep the whole A minor pentatonic box. Add F♯ (the 6th) on the B string at fret 7, and B (the 2nd) on the G string at fret 4. F♯ is the one that matters.",
      vampWhy: "Am7 to D is a minor home chord followed by a major chord a fourth up. That D major contains F♯, so the backing itself spells out the mode.",
      vampTip: "One bar each of Am7 and D. Let the open A string ring under the D so the root never leaves.",
      bpm: 96,
    },
    [["Am7"], ["D/A"]],
    [
      ["bridge", "bright-sixth", "The bright sixth", "The box run that goes one note further than usual on the B string: E, F♯, G.", [
        "0:3/5 0.5:3/7 1:2/5 1.5:2/7 2:2/8 2.5:2/7 3:2/5 3.5:3/7",
        "0:2/7> 1:3/7 1.5:2/5 2:2/7 2.5:3/7 3:4/7",
      ]],
      ["bridge", "two-and-six", "Add the two as well", "B and F♯ filling the gaps in the box, so it starts to sound like a scale rather than a lick.", [
        "0:4/7 0.5:3/4 1:3/5 1.5:3/7 2:2/5 2.5:2/7 3:3/7 3.5:3/5",
        "0:3/4 0.5:4/7 1:4/4 1.5:4/7 2:3/4 2.5:3/7 3:4/7",
      ]],
      ["lead", "lean-on-six", "Lean on the six", "A whole-step bend from E to F♯, held. Bending to the 6th instead of the root is the Dorian habit to build.", [
        "0:2/5^1> 1:2/5 1.5:3/7 2:3/5 2.5:3/7 3:2/5",
        "0:2/7 0.5:2/8 1:2/7 1.5:2/5 2:3/7 3:4/7",
      ]],
      ["lead", "two-arpeggios", "Minor seventh, then major", "An Am7 arpeggio up and down, then a D major arpeggio. The only note that changes the colour is F♯.", [
        "0:4/7 0.5:3/5 1:2/5 1.5:2/8 2:1/5 2.5:2/8 3:2/5 3.5:3/5",
        "0:3/7 0.5:2/7 1:1/5 1.5:2/7 2:3/7 2.5:4/4 3:4/7",
      ]],
      ["finger", "am7-to-d", "Am7 to D over a ringing A", "The top note moves from E to F♯ while the thumb keeps the A going.", [
        "0:5/0p+2/1m 0.5:3/0i 1:4/2p 1.5:1/0a 2:5/0p+2/1m 2.5:3/0i 3:4/2p 3.5:1/0a",
        "0:4/0p+1/2a 0.5:3/2i 1:5/0p 1.5:2/3m 2:4/0p+1/2a 2.5:3/2i 3:5/0p 3.5:2/3m",
      ]],
      ["genre", "latin-rock", "Latin-rock sustain", "Long notes with space after them. The F♯ at the start of bar 2 is held over the D chord.", [
        "0:1/5> 1.5:2/8 2:2/7~p 2.5:2/5 3:3/7 3.5:2/5",
        "0:2/7> 1.5:2/5 2:3/7 2.5:3/4 3:4/7",
      ]],
    ],
  ),
  mode(
    {
      id: "aeolian",
      name: "Aeolian",
      sound: "The natural minor: dark, sad, dramatic.",
      feel: "The sound of rock ballads and most minor-key pop. Where Dorian is cool, Aeolian is heavy-hearted: the ♭6 pulls down onto the 5th.",
      fromBox: "Keep the whole A minor pentatonic box. Add F (the ♭6) on the B string at fret 6, and B (the 2nd) on the G string at fret 4. F is one fret above the E you already play.",
      vampWhy: "Am, F, G: the F major chord is built on the ♭6, so it is the chord that separates this from Dorian.",
      vampTip: "A full bar of Am, then Fmaj7 and G for two beats each.",
      bpm: 84,
    },
    [["Am"], ["Fmaj7", "G"]],
    [
      ["bridge", "dark-sixth", "The dark sixth", "The hammer-on and pull-off between E and F in bar 1: one fret, and the mood drops.", [
        "0:3/5 0.5:3/7 1:2/5 1.5:2/6~h 2:2/5~p 2.5:3/7 3:3/5 3.5:4/7",
        "0:2/6> 0.5:3/5 1:4/7 1.5:3/5 2:2/8 2.5:3/7 3:3/4 3.5:3/7",
      ]],
      ["bridge", "two-and-flat-six", "Down through both new notes", "A full octave down the scale from the top A, passing F and B on the way.", [
        "0:1/5 0.5:2/8 1:2/6 1.5:2/5 2:3/7 2.5:3/5 3:3/4 3.5:3/5",
        "0:5/8 0.5:4/7 1:3/5 1.5:4/7 2:4/5 2.5:3/4 3:3/7 3.5:3/4",
      ]],
      ["lead", "half-step-sigh", "Half-step sigh", "A half-step bend from E up to F and back. Compare it with the whole-step bend in the Dorian riffs.", [
        "0:2/5^0.5> 1:2/5 1.5:3/7 2:3/5 3:4/7",
        "0:2/6 0.5:2/5 1:3/5 1.5:2/5 2:2/8 2.5:2/6 3:2/5 3.5:3/7",
      ]],
      ["lead", "climb", "Climb to the top", "The whole scale rising through an octave, then chord tones of F and G on the way down.", [
        "0:4/7 0.5:3/4 1:3/5 1.5:3/7 2:2/5 2.5:2/6 3:2/8 3.5:1/5",
        "0:1/8> 1:1/5 1.5:2/6 2:1/7 2.5:2/8 3:3/7 3.5:2/5",
      ]],
      ["finger", "am-f-g", "Am, F, G arpeggios", "The bass dropping from A to F under a top string that stays on E.", [
        "0:5/0p+1/0a 0.5:3/2i 1:4/2p 1.5:2/1m 2:5/0p+1/0a 2.5:3/2i 3:4/2p 3.5:2/1m",
        "0:4/3p+1/0a 0.5:3/2i 1:2/1m 1.5:3/2i 2:6/3p+1/3a 2.5:3/0i 3:4/0p 3.5:2/0m",
      ]],
      ["genre", "rock-ballad", "Rock ballad", "The F held over the F chord, then a whole-step bend from G up to the root to finish.", [
        "0:2/5 0.5:2/6 1:2/8> 2:2/6 2.5:2/5 3:3/5 3.5:3/7",
        "0:2/6> 1:3/5 1.5:2/6 2:2/8^1> 3:2/8 3.5:2/5",
      ]],
    ],
  ),
  mode(
    {
      id: "ionian",
      name: "Ionian",
      sound: "The major scale: bright, settled, sing-along.",
      feel: "The sound of folk, pop and country melodies. Everything resolves: the 7th leans up into the root and the 4th leans down into the 3rd.",
      fromBox:
        "Slide the pentatonic shape you know down three frets and it becomes A major pentatonic (A B C♯ E F♯). Ionian adds D (the 4th) and G♯ (the 7th). Neither is a note to sit on: they are notes to pass through on the way home.",
      vampWhy: "A, D, E are the three major chords of the key. E major contains G♯, which is what tells the ear this is not Mixolydian.",
      vampTip: "A full bar of A, then D and E for two beats each.",
      bpm: 100,
    },
    [["A"], ["D", "E"]],
    [
      ["bridge", "major-plus-two", "Major pentatonic plus two", "One octave straight up. D and G♯ are the two notes the major pentatonic skips.", [
        "0:4/7 0.5:3/4 1:3/6 1.5:3/7 2:2/5 2.5:2/7 3:1/4 3.5:1/5",
        "0:2/7 0.5:3/7 1:4/7 1.5:3/7 2:1/4 2.5:2/5 3:3/4 3.5:2/5",
      ]],
      ["bridge", "leading-note", "The leading note", "A to G♯ and straight back: the 7th wants to resolve up by one fret, so let it.", [
        "0:1/5 0.5:1/4 1:1/5 1.5:2/7 2:2/5 2.5:3/6 3:3/7 3.5:3/6",
        "0:3/7 0.5:2/7 1:1/5 1.5:2/7 2:2/5 2.5:1/4 3:1/7 3.5:1/4",
      ]],
      ["lead", "sweet", "Sweet and resolved", "Long notes on the root and on G♯ over the E chord. The tension is in the backing, not the line.", [
        "0:2/5 0.5:2/7 1:1/5> 2:1/4 2.5:2/7 3:2/5",
        "0:3/7 0.5:3/6 1:3/7 1.5:2/7 2:1/4> 3:2/5 3.5:3/4",
      ]],
      ["lead", "thirds", "The scale in thirds", "Pairs of notes a third apart climbing the scale. It turns a scale into a melody at once.", [
        "0:4/7 0.5:3/6 1:3/4 1.5:3/7 2:3/6 2.5:2/5 3:3/7 3.5:2/7",
        "0:2/5 0.5:1/4 1:2/7 1.5:1/5 2:1/4 2.5:2/5 3:1/5",
      ]],
      ["finger", "a-d-e", "A, D, E arpeggios", "The G♯ inside the E chord at the end of bar 2, pulling back to A.", [
        A_SHAPE,
        "0:4/0p+1/2a 0.5:3/2i 1:2/3m 1.5:3/2i 2:6/0p+1/0a 2.5:3/1i 3:4/2p 3.5:2/0m",
      ]],
      ["genre", "folk-pop", "Folk-pop hook", "A tune you could sing. It lands on D in the middle of bar 1 and falls back to C♯.", [
        "0:2/5 0.5:2/7 1:2/5 1.5:3/6 2:3/7> 3:3/6 3.5:3/4",
        "0:3/7 0.5:2/7 1:3/7 1.5:4/7 2:4/6 2.5:3/4 3:2/5",
      ]],
    ],
  ),
  mode(
    {
      id: "lydian",
      name: "Lydian",
      sound: "Major with a raised 4th: floating, dreamy, wide-eyed.",
      feel: "The sound of film scores and instrumental rock ballads. It is brighter than major, and the ♯4 never quite settles, so the music seems to hover.",
      fromBox: "Start from A major pentatonic (A B C♯ E F♯). Add D♯ (the ♯4), one fret below E, and G♯ (the 7th). Landing on D♯ and holding it is the sound.",
      vampWhy: "B major over an A bass: a major chord a whole step above the home chord, with the root still underneath, only exists in Lydian.",
      vampTip: "Play an open A chord, then slide the same three fingers up two frets and keep the open A and E strings ringing.",
      bpm: 80,
    },
    [["A"], ["B/A"]],
    [
      ["bridge", "raise-the-fourth", "Raise the fourth", "The climb goes C♯, D♯, E where your ear expects C♯, D, E.", [
        "0:4/7 0.5:3/4 1:3/6 1.5:3/8 2:2/5 2.5:3/8 3:3/6 3.5:3/4",
        "0:3/4 0.5:2/4 1:2/7 1.5:2/4 2:3/4 2.5:2/4 3:2/5",
      ]],
      ["bridge", "one-new-note", "Major pentatonic, one new note", "A major pentatonic line that dips to D♯ just below E, twice.", [
        "0:1/5 0.5:2/7 1:2/5 1.5:2/4 2:2/5 2.5:3/6 3:3/4 3.5:4/7",
        "0:2/4> 1:2/5 1.5:2/7 2:1/4 2.5:2/7 3:2/5",
      ]],
      ["lead", "floating", "Floating", "Slow notes at the top of the neck position. Hold the D♯ in bar 2 as long as the backing allows.", [
        "0:2/5> 1:2/4 1.5:2/5 2:1/4 2.5:1/5 3:1/7",
        "0:1/7 0.5:2/7 1:2/4> 2:2/5 2.5:3/6 3:4/7",
      ]],
      ["lead", "bend-to-sharp-four", "Bend to the sharp four", "A whole-step bend from C♯ up to D♯. Hold it at the top before letting go.", [
        "0:3/6^1> 1:3/6 1.5:3/4 2:4/7 2.5:3/4 3:3/6 3.5:2/5",
        "0:2/7 0.5:2/4 1:3/4 1.5:2/4 2:2/5> 3:3/6 3.5:3/4",
      ]],
      ["finger", "sliding-shape", "The sliding shape", "The same picking pattern over both chords; only the fretting hand moves.", [
        A_SHAPE,
        "0:5/0p+1/0a 0.5:3/4i 1:4/4p 1.5:2/4m 2:5/0p+1/0a 2.5:3/4i 3:4/4p 3.5:2/4m",
      ]],
      ["genre", "film-score", "Film-score leaps", "Wide jumps from the open A up to D♯ and G♯. Let every note ring into the next.", [
        "0:5/0 0.5:4/7 1:3/6 1.5:2/4> 3:2/5",
        "0:5/0 0.5:4/4 1:3/4 1.5:2/4 2:1/4> 3:2/7",
      ]],
    ],
  ),
  mode(
    {
      id: "phrygian",
      name: "Phrygian",
      sound: "Minor with a ♭2: Spanish, tense, menacing.",
      feel: "The sound of flamenco-flavoured lines and heavy riffs. The ♭2 sits one fret above the root and grinds against it.",
      fromBox: "Keep the whole A minor pentatonic box. Add B♭ (the ♭2), one fret above every A, and F (the ♭6), one fret above every E. B♭ falling to A is the sound.",
      vampWhy: "B♭ major over an A bass: a major chord a half step above the root is the Phrygian signature.",
      vampTip: "Play Am, then barre the D, G and B strings at fret 3 over the open A string. Mute the top string on the second chord.",
      bpm: 88,
    },
    [["Am"], ["B♭/A"]],
    [
      ["bridge", "flat-two", "The flat two", "A, B♭, A on the D string: the half step above the root, straight away.", [
        "0:4/7 0.5:4/8 1:4/7 1.5:4/5 2:4/7 2.5:3/5 3:4/8 3.5:4/7",
        "0:4/8 0.5:3/7 1:2/6 1.5:3/7 2:4/8 2.5:4/7 3:4/5 3.5:4/7",
      ]],
      ["bridge", "two-dark-notes", "The box with two dark notes", "Down the box from the top A, through F and B♭ instead of jumping over them.", [
        "0:1/5 0.5:2/8 1:2/6 1.5:2/5 2:3/7 2.5:3/5 3:4/8 3.5:4/7",
        "0:1/6> 1:1/5 1.5:2/8 2:2/6 2.5:2/5 3:3/7 3.5:2/5",
      ]],
      ["lead", "half-step-tension", "Half-step tension", "A half-step bend from the root up to B♭ and back down. Slow bends suit this mode.", [
        "0:1/5^0.5> 1:1/5 1.5:2/8 2:2/6 2.5:2/5 3:1/5",
        "0:1/6 0.5:1/5 1:1/6 1.5:1/8 2:1/6 2.5:1/5 3:2/8 3.5:1/5",
      ]],
      ["lead", "low-growl", "Low-string growl", "The same A to B♭ move on the bottom two strings. Pick hard and keep it tight.", [
        "0:6/5 0.5:6/6 1:6/5 1.5:6/8 2:6/5 2.5:6/6 3:5/5 3.5:6/6",
        "0:6/6 0.5:5/5 1:5/8 1.5:5/5 2:6/6 2.5:6/8 3:6/6 3.5:6/5",
      ]],
      ["finger", "am-to-bb", "Am to B♭ over a ringing A", "The whole chord rising a half step while the thumb stays on the open A.", [
        "0:5/0p+2/1m 0.5:3/2i 1:4/2p 1.5:1/0a 2:5/0p+2/1m 2.5:3/2i 3:4/2p 3.5:1/0a",
        BB_OVER_A,
      ]],
      ["genre", "spanish", "Spanish run", "Up to C, down the scale to E and back up, turning on B♭ each way. End on the open A and let it ring.", [
        "0:4/7 0.5:4/8 1:3/5 1.5:4/8 2:4/7 2.5:4/5 3:5/8 3.5:5/7",
        "0:5/8 0.5:4/5 1:4/7 1.5:4/8 2:4/7> 3:5/0",
      ]],
    ],
  ),
  mode(
    {
      id: "locrian",
      name: "Locrian",
      sound: "Minor with a ♭2 and a ♭5: unstable, unresolved.",
      feel: "The rarest of the seven, heard in heavy riffs and passing moments in jazz. Its home chord is diminished, so it never sounds at rest. Learn it last, as a colour rather than a place to stay.",
      fromBox:
        "Take the A minor pentatonic box and move every E down a fret to E♭: the 5th is gone. Then add B♭ (the ♭2) and F (the ♭6). The missing 5th is what makes it feel like the floor has moved.",
      vampWhy: "Am7♭5 has E♭ where the ear wants E. B♭ over A adds the ♭2. Neither chord resolves, which is the point.",
      vampTip: "Both chords sit over the open A string and both mute the top string. Keep the strum quiet; this one is about tension.",
      bpm: 80,
    },
    [["Am7♭5"], ["B♭/A"]],
    [
      ["bridge", "flatten-the-fifth", "Flatten the fifth", "The run stops at E♭ on the G string, one fret short of where the box normally goes.", [
        "0:4/7 0.5:3/5 1:3/7 1.5:3/8 2:3/7 2.5:3/5 3:4/8 3.5:4/7",
        "0:4/8 0.5:3/7 1:2/6 1.5:3/7 2:3/8 2.5:3/7 3:4/8 3.5:4/7",
      ]],
      ["bridge", "no-safe-fifth", "No safe fifth", "Down from the top A with no E to rest on: G, F, E♭, D.", [
        "0:1/5 0.5:2/8 1:2/6 1.5:3/8 2:3/7 2.5:3/5 3:4/8 3.5:4/7",
        "0:3/8> 1:3/7 1.5:3/5 2:4/8> 3:4/7",
      ]],
      ["lead", "unstable", "Unstable", "E♭ held at the start of each phrase, B♭ held near the end. Both lean on the root without settling.", [
        "0:3/8> 1:3/5 1.5:4/7 2:4/8 2.5:4/7 3:4/5 3.5:4/7",
        "0:2/6 0.5:3/8 1:3/7 1.5:3/5 2:4/8> 3:4/7",
      ]],
      ["lead", "diminished-outline", "Outline the chords", "An Am7♭5 arpeggio (A C E♭ G), then a B♭ major arpeggio.", [
        "0:4/7 0.5:3/5 1:3/8 1.5:2/8 2:1/5 2.5:2/8 3:3/8 3.5:3/5",
        "0:4/8 0.5:3/7 1:2/6 1.5:1/6 2:2/6 2.5:3/7 3:4/8 3.5:4/7",
      ]],
      ["finger", "half-diminished", "Half-diminished to B♭", "The E♭ under the thumb on beats 2 and 4 of the first bar.", [
        "0:5/0p+2/1m 0.5:3/0i 1:4/1p 1.5:2/1m 2:5/0p+2/1m 2.5:3/0i 3:4/1p 3.5:3/0i",
        BB_OVER_A,
      ]],
      ["genre", "heavy-riff", "Heavy low riff", "Open A chugging against B♭ and E♭ on the bottom strings. Palm-mute the open notes.", [
        "0:5/0 0.5:5/0 1:5/1 1.5:5/0 2:4/1 2.5:5/0 3:5/3 3.5:5/1",
        "0:5/0 0.5:5/0 1:4/1 1.5:4/0 2:5/3 2.5:5/1 3:5/0",
      ]],
    ],
  ),
];

export function getMode(id: string | undefined): Mode | undefined {
  return MODES.find((m) => m.id === id);
}
