import type { CourseInput } from "../schema";

/**
 * Finger Picking: seven 45-minute days, from hand setup to a full
 * arrangement. Every block states why the technique works, what to play,
 * how you'll know you've got it, and what usually goes wrong.
 */

type Crit = { bpm: number; bars: number; mode?: "click" | "free"; maxMeanAbsMs?: number; maxMissed?: number; maxChangeMs?: number; maxDriftBpm?: number; maxThumbMs?: number };
const ch = (id: string, goal: string, criteria: Crit, checklist: string[] = []) => ({ id, goal, criteria, checklist });
const ex = (id: string, title: string, pattern: string, start: number, target: number, how: string[] = [], challenge?: ReturnType<typeof ch>) => ({
  id,
  title,
  pattern,
  bpm: { start, target },
  how,
  ...(challenge ? { challenge } : {}),
});
const pit = (symptom: string, cause: string, fix: string) => ({ symptom, cause, fix });

const REVIEW_TIME = "Log your best clean tempo on each exercise before you stop. Tomorrow's warm-up starts from it.";

export const fingerpicking: CourseInput = {
  id: "fingerpicking",
  title: "Finger Picking",
  emoji: "🖐️",
  blurb: "Seven 45-minute days from hand setup to Travis picking, triads, hybrid strumming and a full arrangement, with a timing check that listens to you play.",
  goal:
    "Most people who've been fingerpicking for a few months can play one arpeggio pattern over open chords, slowly. By day 7 you should pass seven tests they usually can't: a steady Travis bass at 90, chord changes with no gap, a melody over the bass, clean switching between picking and strumming, triads anywhere on the top strings, and time good enough to hold without a click.",
  minutesPerDay: 45,
  tests: [
    {
      id: "t1",
      title: "Thumb independence",
      what: "Melody over the Travis bass at 80. Thumb timing within 25 ms while the melody syncopates.",
      pattern: "melody-travis",
      criteria: { bpm: 80, bars: 8, maxThumbMs: 25, maxMeanAbsMs: 35, maxMissed: 2 },
      checklist: ["The bass never stopped or doubled when a melody note fell off the beat"],
    },
    {
      id: "t2",
      title: "Travis at 90",
      what: "The full Travis pattern through C–Am–Fmaj7–G, eighth notes at 90, right root for every chord.",
      pattern: "travis",
      criteria: { bpm: 90, bars: 8, maxMeanAbsMs: 30, maxMissed: 2 },
      checklist: ["The thumb started each chord on its root string: C 5, Am 5, Fmaj7 4, G 6"],
      baseline: true,
    },
    {
      id: "t3",
      title: "Changes without the gap",
      what: "Travis with a chord change every two beats at 80. No note at a change more than 40 ms out.",
      pattern: "travis-half",
      criteria: { bpm: 80, bars: 8, maxChangeMs: 40, maxMeanAbsMs: 35, maxMissed: 2 },
    },
    {
      id: "t4",
      title: "Melody over bass",
      what: "The Lanterns melody over the Travis pattern at 80, with the melody clearly louder than the rest.",
      pattern: "melody-travis",
      criteria: { bpm: 80, bars: 8, maxMeanAbsMs: 35, maxMissed: 2 },
      checklist: ["Recorded it on your phone and listened back: the melody stands out over the pattern", "Someone else could hum the melody back from your recording"],
    },
    {
      id: "t5",
      title: "Pick-to-strum switch",
      what: "Four bars of Travis, four bars of bass-strum groove, twice, at 85 with the click off after the count-in. Tempo drift under 3 bpm.",
      pattern: "switch",
      criteria: { bpm: 85, bars: 16, mode: "free", maxDriftBpm: 3, maxMeanAbsMs: 40, maxMissed: 4 },
    },
    {
      id: "t6",
      title: "Triads over bass",
      what: "D, G and A triads in all three inversions on strings 3–1, over an open bass, at 70.",
      pattern: "triad-ladder",
      criteria: { bpm: 70, bars: 9, maxMeanAbsMs: 40, maxMissed: 2 },
      checklist: ["Played all nine shapes from memory, without the tab", "Can say which chord tone is on top of each shape"],
    },
    {
      id: "t7",
      title: "Internal time",
      what: "The p-i-m-a arpeggio for 16 bars at 90 with the click off after the count-in. Within 25 ms of your own pulse, drift under 2 bpm.",
      pattern: "pima",
      criteria: { bpm: 90, bars: 16, mode: "free", maxMeanAbsMs: 25, maxDriftBpm: 2 },
      baseline: true,
    },
  ],
  days: [
    // ---------------------------------------------------------------- Day 1
    {
      n: 1,
      title: "Hand setup and a thumb on autopilot",
      focus: "Give each finger a string, make the thumb independent, and measure where you're starting.",
      outcome: "Your thumb keeps a steady alternating bass through four chords, you can play a clean p-i-m-a arpeggio, and you have a baseline to beat on day 7.",
      blocks: [
        {
          id: "d1-warmup",
          kind: "warmup",
          title: "Set the hand",
          minutes: 5,
          why: [
            "Fingerpicking gives each finger a job so you never have to think about which finger plays which string. The thumb (p) takes the bass strings 6, 5 and 4, index (i) string 3, middle (m) string 2 and ring (a) string 1. It's the same idea as a pick player's down-up rule: a fixed system you can automate, which leaves your attention free for time and tone.",
            "The thumb strikes with its side, just left of the nail, and moves from the base joint, not the tip. The fingers flick up into the palm from the knuckle. If thumb and fingers move in the same plane they collide. So keep the thumb about a finger's width towards the neck from the index, so they make an X. Never a claw.",
          ],
          steps: [
            "Rest your forearm on the edge of the body so the hand hangs over the strings, just behind the soundhole.",
            "Thumb on string 6; i, m and a resting on strings 3, 2 and 1. This is home position.",
            "Play the open strings with the thumb only, one note per click. Listen for four even notes at the same volume.",
          ],
          exercises: [
            ex("d1-open-thumb", "Open-string thumb", "open-thumb", 50, 70, [
              "Thumb only. Let it follow through and come to rest on the next string down (a rest stroke) for a fuller bass note.",
            ]),
          ],
          pitfalls: [
            pit("Thumb and index knock into each other", "The thumb is behind the fingers instead of ahead of them", "Move the thumb towards the neck until you can see an X between thumb and index."),
            pit("The bass sounds thin and clicky", "Striking with the nail tip, or moving from the thumb's top joint", "Use the side of the thumb and move from the base joint, like pressing a doorbell sideways."),
          ],
        },
        {
          id: "d1-technique",
          kind: "technique",
          title: "Thumb on autopilot",
          minutes: 10,
          why: [
            "Every style this week sits on top of a bass that never stops. If the thumb keeps time on its own, you can put anything above it. If it can't, every new finger part makes it stumble. The most common reason players stall after months is a thumb that waits for the fingers. So we build the thumb first and make it boring.",
            "On each chord the thumb plays the root, the note the chord is named after, which is the lowest note of the shape. Then it alternates to a string above. Root on beats 1 and 3, alternate on 2 and 4. The bass map: C 5→4, Am 5→4, Fmaj7 4→3, G 6→4, Em 6→4. It works because the alternate note is the chord's fifth or third, which backs up the harmony instead of blurring it.",
          ],
          exercises: [
            ex("d1-thumb-roots", "Thumb on the root", "thumb-roots", 60, 80, [
              "Thumb only, one note per click on the root. Change chords with the fretting hand while the thumb keeps going.",
              "At a change, the thumb arrives on the new root even if the chord isn't fully down yet. Being on time matters more than being tidy.",
            ]),
            ex(
              "d1-thumb-alt",
              "Alternating bass",
              "thumb-alt",
              60,
              80,
              ["Now alternate: root, alternate, root, alternate.", "Say the string numbers out loud: \"five, four, five, four\". It feels silly, but it gets the bass map into your hands quickly."],
              ch("c-thumb-alt", "Alternating bass through C–Am–Fmaj7–G for 8 bars at 80 without a stumble", { bpm: 80, bars: 8, maxMeanAbsMs: 35, maxMissed: 1 }, [
                "Right root string on every chord",
              ]),
            ),
          ],
          pitfalls: [
            pit("The bass is late on beat 1 of a new chord", "The fretting hand places its fingers one at a time and the thumb waits", "Put down the finger for the bass note first (ring finger for C, middle for Am, ring for G). The thumb only needs that one."),
            pit("You hit string 5 on G", "G's root is on string 6, unlike C and Am", "Loop the G to C change on its own: 6-4-6-4 | 5-4-5-4."),
          ],
        },
        {
          id: "d1-pattern",
          kind: "pattern",
          title: "p-i-m-a and planting",
          minutes: 10,
          why: [
            "An arpeggio is a chord played one note at a time. p-i-m-a climbs from the bass to the top string, and each string keeps ringing as the next one sounds. That overlap is why it sounds like a chord and not a scale.",
            "Planting means setting a finger on its string just before you play it. You get accuracy without looking, because the finger never has to find the string in mid-air. Classical players plant p, i, m and a together at the start of an arpeggio and release them one at a time. It's the quickest cure for missed strings.",
          ],
          exercises: [
            ex("d1-pima", "p-i-m-a arpeggio", "pima", 60, 80, [
              "Before beat 1, plant p, i, m and a on the root, 3, 2 and 1. Play them in order, then plant again on beat 3 (the thumb goes to the alternate string).",
              "Once it's clean at 70, stop planting all four together. Plant each finger just before its own note (sequential planting).",
              "Watch a finger after it plays: if it curls right into your palm, it's travelling too far.",
            ]),
          ],
          pitfalls: [
            pit("a (the ring finger) is quieter than the others", "The ring finger is weaker and shares a tendon with m", "For a day, play the a notes a bit harder on purpose. You get balance by over-correcting first."),
            pit("A buzz or a note cut short as the next finger plants", "Planting on a string that's supposed to be ringing", "Only plant on the string you're about to play, never on one that should sustain."),
          ],
        },
        {
          id: "d1-challenge",
          kind: "challenge",
          title: "Baseline, then your first clean arpeggio",
          minutes: 15,
          why: [
            "You can't improve what you haven't measured. The baseline takes a snapshot of where you are now: the Travis pattern (which you can't play yet, and that's the point) and your timing without a click. On day 7 you take the same tests, and the course page shows before and after side by side.",
            "The timing check listens through the microphone and compares every note with where it should have landed. It tells you whether you rush or drag, whether it's the thumb or the fingers that are late, and whether chord changes cost you time. It hears when notes start, not which notes they are, so it can't tell a wrong note from a right one. The checklists cover that.",
          ],
          steps: [
            "Put your phone or laptop 30–50 cm from the soundhole, in a quiet room.",
            "Calibrate once: pluck a muted string on each of 8 clicks. This measures your device's audio delay so the results are accurate.",
            "Baseline tests: choose a tempo where you can play at least some of it. It's fine to fail them.",
            "Then the day's challenge.",
          ],
          tests: ["t2", "t7"],
          exercises: [
            ex(
              "d1-pima-challenge",
              "Clean p-i-m-a",
              "pima",
              60,
              70,
              ["Plant each finger before you play it. Stay relaxed and keep the notes even."],
              ch("c-pima", "p-i-m-a over C–Am–G–Em for 8 bars at 70", { bpm: 70, bars: 8, maxMeanAbsMs: 40, maxMissed: 2 }, [
                "No missed strings or buzzes",
                "The thumb landed on the correct root in every bar",
              ]),
            ),
          ],
        },
        {
          id: "d1-review",
          kind: "review",
          title: "Review",
          minutes: 5,
          prompts: [
            "Which chord change made your thumb late? Loop that change for a minute now.",
            "Did the timing report say you rushed or dragged? Most people rush. If you did, play tomorrow's warm-up 5 bpm slower than feels natural.",
            "Look at your picking hand in a mirror or a phone camera: X or claw?",
            REVIEW_TIME,
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Day 2
    {
      n: 2,
      title: "Arpeggios, pinches and changes without the gap",
      focus: "More patterns, the pinch, and chord changes that don't stop the music.",
      outcome: "You can play three arpeggio patterns and a 6/8 pattern, your pinches are clean, and your chord changes have no audible gap.",
      blocks: [
        {
          id: "d2-warmup",
          kind: "warmup",
          title: "Thumb and p-i-m-a",
          minutes: 5,
          steps: ["Anything you didn't pass yesterday appears first. Otherwise, alternating bass then p-i-m-a, starting 5 bpm under yesterday's best."],
          exercises: [ex("d2-thumb", "Alternating bass", "thumb-alt", 70, 85), ex("d2-pima", "p-i-m-a arpeggio", "pima", 65, 80)],
        },
        {
          id: "d2-technique",
          kind: "technique",
          title: "The pinch",
          minutes: 10,
          why: [
            "A pinch is the thumb and a finger playing at the same moment, usually the bass and the top string. It marks the downbeat and gives a pattern its shape, where plain arpeggios can sound like an exercise. The hard part is making it one event. A flam (thumb then finger a few milliseconds apart) sounds sloppy and smears the beat.",
            "Squeeze thumb and finger towards each other as if picking up a coin: one motion, not two. On the timing check a flam shows up as finger notes landing later than thumb notes.",
          ],
          exercises: [
            ex("d2-pinch", "Pinch arpeggio", "pinch", 60, 80, [
              "Pinch p and a on beat 1 (and on beat 3, with the alternate bass), then play i-m-i up and back.",
              "Make the pinch a little louder than the rest: it's the downbeat.",
            ]),
            ex("d2-pami", "p-a-m-i arpeggio", "pami", 60, 80, [
              "The reverse direction: thumb, then ring, middle, index down the strings.",
              "Mixing upward and downward arpeggios is what makes a part sound like a song rather than a drill.",
            ]),
          ],
          pitfalls: [
            pit("The pinch sounds like two notes", "Thumb and finger moving separately, usually thumb first", "Plant both, then squeeze. Do ten plant-and-squeezes without the click, then add it at 50."),
            pit("The hand bounces on the pinch and the next note is late", "Pulling the pinch up and away from the guitar", "Pinch towards the palm and keep the hand still. Only the thumb and fingers move."),
          ],
        },
        {
          id: "d2-pattern",
          kind: "pattern",
          title: "6/8 feel",
          minutes: 10,
          why: [
            "6/8 groups eighth notes in threes, 1-2-3 4-5-6, which gives two big beats per bar. The click here counts those big beats (dotted quarters), so 50 on the click is 150 eighth notes a minute. p-i-m-a-m-i fills one bar exactly and rolls up and back down, which is why so many ballads and folk songs use it.",
            "Am–G–Fmaj7–E steps down the scale in the bass: A, G, F, E. That falling bass line is what gives the progression its pull. Bring the bass notes out and you'll hear it.",
          ],
          exercises: [
            ex("d2-68", "p-i-m-a-m-i in 6/8", "pimami-68", 40, 60, [
              "The thumb plays on 1. On 4, pinch the alternate bass with a: \"ONE two three FOUR five six\".",
              "E's root is on string 6, so get there early.",
            ]),
          ],
        },
        {
          id: "d2-challenge",
          kind: "challenge",
          title: "Changes without the gap",
          minutes: 15,
          why: [
            "A gap at chord changes is the clearest sign of an intermediate player. It happens because the fretting hand lifts off on the downbeat of the new chord while the picking hand waits for it. The fix is to change earlier, not faster.",
            "In C, Em, Am and Fmaj7 the last note of every bar is the open top string. You can lift the fretting hand during that note, because the open string covers the lift and the new chord only has to be ready for beat 1. Almost every fingerstyle player does this. Once you start listening for it, you'll hear it everywhere.",
          ],
          exercises: [
            ex(
              "d2-changes",
              "p-i-m-a through the changes",
              "pima-changes",
              60,
              80,
              ["Lift the fretting hand on the last eighth (a on the open string) and land the new chord in time for the bass.", "Start at 60 with the speed trainer on."],
              ch("c-changes", "p-i-m-a through C–Em–Am–Fmaj7 at 75, with no timing spike at the changes", { bpm: 75, bars: 8, maxChangeMs: 40, maxMeanAbsMs: 35, maxMissed: 2 }, [
                "No change had an audible gap or a dead note",
              ]),
            ),
            ex(
              "d2-pinch-challenge",
              "Pinch arpeggio",
              "pinch",
              60,
              80,
              [],
              ch("c-pinch", "Pinch arpeggio through C–Am–Fmaj7–G at 80", { bpm: 80, bars: 8, maxMeanAbsMs: 35, maxMissed: 2, maxThumbMs: 30 }, [
                "Every pinch sounded as one note, with no flams",
              ]),
            ),
          ],
          pitfalls: [
            pit("The timing report shows a spike on beat 1 of every bar", "The chord change starts on the downbeat", "Lift on the last eighth. If that's too hard, play the whole last beat on open strings and build back up."),
            pit("You look at the fretting hand and the picking hand misses", "Split attention", "Practise the change without picking, eyes closed. Then add the picking back."),
          ],
        },
        {
          id: "d2-review",
          kind: "review",
          title: "Review",
          minutes: 5,
          prompts: [
            "Which change had the biggest spike in the timing report? Tomorrow the Travis pattern uses the same chords, so loop that one now.",
            "Pinch or flam? Record five pinches on your phone and listen at the end of the note: one attack or two?",
            REVIEW_TIME,
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Day 3
    {
      n: 3,
      title: "Travis picking",
      focus: "The alternating-bass pattern behind folk, country blues and a lot of fingerstyle pop.",
      outcome: "You can play the full Travis pattern through C–Am–Fmaj7–G at 80, with the bass map right.",
      blocks: [
        {
          id: "d3-warmup",
          kind: "warmup",
          title: "Bass on autopilot",
          minutes: 5,
          steps: ["Today the thumb has to run on its own, so warm it up faster than yesterday."],
          exercises: [ex("d3-thumb", "Alternating bass", "thumb-alt", 80, 95)],
        },
        {
          id: "d3-technique",
          kind: "technique",
          title: "Build Travis one layer at a time",
          minutes: 10,
          why: [
            "Travis picking (named after Merle Travis) is two independent parts. The thumb plays steady quarter notes, alternating bass on every beat. Above it, the fingers play mostly on the off-beats, the \"&\"s between the thumb notes. They aren't following a fixed arpeggio: they're syncopated against the thumb. That independence is why it sounds like two guitarists.",
            "The standard pattern is: pinch on 1 (thumb plus m on string 1), then i on the & of 2 (string 2), m on the & of 3 and i on the & of 4. Learning it all at once fails for almost everyone, because the brain wants to sync the fingers to the thumb. So you add one finger note at a time, and don't move on to the next layer until the current one is automatic.",
          ],
          steps: [
            "Each layer: 8 clean bars at 60, then 8 at 70. Only then move to the next layer.",
            "If a new layer makes the thumb stumble, go back one layer at the same tempo.",
          ],
          exercises: [
            ex("d3-l1", "Layer 1: thumb only", "travis-l1", 60, 75),
            ex("d3-l2", "Layer 2: add the pinch on 1", "travis-l2", 60, 75),
            ex("d3-l3", "Layer 3: add i on the & of 2", "travis-l3", 60, 75, [
              "This is the hard step: your first note off the beat. Count \"1, 2 & 3, 4\" out loud and feel the i note fall between two thumb notes.",
            ]),
            ex("d3-l4", "Layer 4: add m on the & of 3", "travis-l4", 60, 75),
            ex("d3-l5", "Layer 5: add i on the & of 4 (the full pattern)", "travis-l5", 60, 75),
          ],
          pitfalls: [
            pit("Finger notes drift onto the beat and the pattern straightens out", "The fingers are syncing to the thumb", "Go back to layer 3 and exaggerate the gap: say \"and\" out loud on every finger note."),
            pit("The thumb plays the same string twice", "It loses the alternation when a finger note comes in", "Layer 1 again, eyes closed, for 20 bars. The thumb has to run without being watched."),
          ],
        },
        {
          id: "d3-pattern",
          kind: "pattern",
          title: "Travis through the changes",
          minutes: 10,
          why: [
            "The bass map carries over from day 1, and the fingers stay on strings 2 and 1 for every chord. So the only thing that changes is which string the thumb starts on. Fmaj7 is the odd one out: its root is on string 4 and it alternates to string 3.",
          ],
          exercises: [
            ex("d3-travis", "Travis pattern", "travis", 55, 80, [
              "Loop C–Am–Fmaj7–G with the speed trainer on.",
              "If one change is the problem, practise just those two bars.",
            ]),
          ],
          pitfalls: [
            pit("Fmaj7 sounds muddy", "The thumb plays string 5 or 6 out of habit", "Fmaj7 is 4-3-4-3. Touch string 5 with the tip of the finger on string 4 to mute it."),
          ],
        },
        {
          id: "d3-challenge",
          kind: "challenge",
          title: "Travis at 70, then 80",
          minutes: 15,
          why: [
            "Speed comes from accuracy. The pass mark is 80, but a clean 70 beats a sloppy 80 every time. The timing report shows thumb and fingers separately, and that split tells you what's wrong. Late finger notes mean the fingers are waiting for the thumb. An unsteady thumb means it's reacting to the fingers.",
          ],
          exercises: [
            ex("d3-travis-70", "Travis at 70", "travis", 60, 70, [], ch("c-travis-70", "Travis through C–Am–Fmaj7–G for 8 bars at 70", { bpm: 70, bars: 8, maxMeanAbsMs: 35, maxMissed: 2 }, ["Right root string on every chord"])),
            ex("d3-travis-80", "Travis at 80", "travis", 70, 80, [], ch("c-travis-80", "Travis through C–Am–Fmaj7–G for 8 bars at 80", { bpm: 80, bars: 8, maxMeanAbsMs: 30, maxMissed: 2 }, ["Right root string on every chord"])),
          ],
          pitfalls: [
            pit("The top notes drown the bass", "The fingers dig in harder than the thumb", "Play the thumb a little louder than the fingers, because the bass drives the pattern. Record 8 bars and listen back."),
            pit("The report shows finger notes late and the thumb steady", "Fingers waiting for the thumb", "Go back to layer 3 at the tempo you failed at and add layers back one at a time."),
          ],
        },
        {
          id: "d3-review",
          kind: "review",
          title: "Review",
          minutes: 5,
          prompts: [
            "What was your thumb figure compared with your finger figure in the report? The bigger one is tomorrow's focus.",
            "Play 4 bars of Travis without looking at either hand. If you can't yet, that's normal for day 3. Do it again at the start of tomorrow.",
            REVIEW_TIME,
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Day 4
    {
      n: 4,
      title: "Melody on top, and triads",
      focus: "Put a tune on top of the pattern, and learn the three-string triads that work anywhere on the neck.",
      outcome: "You can bring a melody out over a steady Travis bass, and you know D, G and A triads in all three inversions on the top strings.",
      blocks: [
        {
          id: "d4-warmup",
          kind: "warmup",
          title: "Travis",
          minutes: 5,
          exercises: [ex("d4-travis", "Travis pattern", "travis", 70, 85)],
        },
        {
          id: "d4-technique",
          kind: "technique",
          title: "Triads on the top three strings",
          minutes: 10,
          why: [
            "A major triad is three notes: the root, third and fifth (D, F# and A for D). On strings 3, 2 and 1 there are three ways to stack them. Root position has the root at the bottom, first inversion the third, second inversion the fifth. The three shapes follow each other up the neck and repeat from fret 12.",
            "Why bother when you already know open chords? Because each shape has a different chord tone on top, so each gives you a different melody note. And a triad over an open bass string (D over open D, G over open D, A over open A) sounds big with only three fretted notes. It's how a lot of folk and ballad players get a full sound from simple parts.",
          ],
          steps: [
            "Frets on strings 3-2-1. D: 2-3-2 (the open D shape), 7-7-5, 11-10-10. G: 4-3-3, 7-8-7, 12-12-10. A: 2-2-0, 6-5-5, 9-10-9.",
            "Say the top note of each shape out loud as you play it.",
          ],
          exercises: [
            ex("d4-ladder", "Triad inversions up the neck", "triad-ladder", 50, 70, [
              "The thumb plays the open bass. Pinch the whole triad with p, i, m and a on beats 1 and 3.",
              "Move up to the next shape on beat 4 and land it on 1.",
            ]),
          ],
          pitfalls: [
            pit("The top string doesn't sound in 11-10-10 or 12-12-10", "The barre finger isn't flat", "Use two fingers instead of a barre, or roll the finger slightly onto its side."),
          ],
        },
        {
          id: "d4-pattern",
          kind: "pattern",
          title: "Melody on top",
          minutes: 10,
          why: [
            "A fingerstyle arrangement has three layers: melody, bass and harmony. The melody has to be the loudest, and you get that from dynamics: the melody finger plays harder and the pattern notes around it play softer. The Travis pattern already puts m on string 1, so a melody note simply replaces a pattern note.",
            "Some melody notes fall on the & of 3, before the beat. That's syncopation, and it's why fingerstyle melodies feel like they pull forward. The thumb has to ignore it completely.",
          ],
          exercises: [
            ex("d4-melody", "Melody over the Travis bass", "melody-travis", 55, 80, [
              "The accented notes (>) are the melody: G–E | E–G | F–E | G–D. Hum it first.",
              "Use your pinky for string 1, fret 3 over C and Am. Over Fmaj7, lay the index flat across strings 1 and 2 at fret 1.",
            ]),
          ],
        },
        {
          id: "d4-challenge",
          kind: "challenge",
          title: "Melody and voice leading",
          minutes: 15,
          why: [
            "There are two challenges today. The melody challenge tests thumb independence (the thumb figure in the report). The triad challenge checks the shapes are in your hands and not just on the page.",
          ],
          exercises: [
            ex(
              "d4-melody-challenge",
              "Melody Travis",
              "melody-travis",
              60,
              80,
              [],
              ch("c-melody", "Melody over the Travis bass at 75, with the thumb within 30 ms", { bpm: 75, bars: 8, maxMeanAbsMs: 35, maxThumbMs: 30, maxMissed: 2 }, [
                "Recorded 8 bars on your phone: the melody is clear over the pattern",
                "The thumb didn't stop or double on the syncopated melody notes",
              ]),
            ),
            ex(
              "d4-triads",
              "Triads in one position",
              "triad-voices",
              50,
              70,
              ["D–G–A–D using the middle shapes (7-7-5, 7-8-7, 6-5-5). No note moves more than a tone, which is called voice leading. It's why the change sounds so smooth."],
              ch("c-triads", "D–G–A–D triads in one position at 70", { bpm: 70, bars: 8, maxMeanAbsMs: 40, maxMissed: 2 }, [
                "Played it without looking at the tab",
                "Can find all nine triad shapes from memory",
              ]),
            ),
          ],
          pitfalls: [
            pit("Accenting the melody makes the bass jump too", "The whole hand pushes harder, not just the finger", "Accent with the finger alone. Practise with the thumb deliberately soft."),
            pit("The report shows the thumb late after syncopated notes", "The thumb waits for the off-beat melody", "Play the bass alone while you sing the melody, then add the fingers back."),
          ],
        },
        {
          id: "d4-review",
          kind: "review",
          title: "Review",
          minutes: 5,
          prompts: [
            "Can you play the melody Travis without the tab? If not, write the melody notes on a sticky note and put it on the headstock.",
            "Test yourself: without looking, play a G triad with B on top, then D on top, then G on top.",
            REVIEW_TIME,
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Day 5
    {
      n: 5,
      title: "Hybrid picking and strumming",
      focus: "Mix picking and strumming with the thumb brush, index flick and a percussive chunk.",
      outcome: "You can switch between Travis picking and a bass-strum groove without the tempo moving.",
      blocks: [
        {
          id: "d5-warmup",
          kind: "warmup",
          title: "Melody Travis",
          minutes: 5,
          exercises: [ex("d5-melody", "Melody over the Travis bass", "melody-travis", 70, 80)],
        },
        {
          id: "d5-technique",
          kind: "technique",
          title: "Strokes without a pick",
          minutes: 10,
          why: [
            "Without a pick you have three strumming strokes. The thumb brush is a down strum from the root with the side of the thumb, warm and full. The index flick is a down strum with the back of the index nail, flicking out from the palm; it's bright and the closest to a pick. The up strum brushes 2 or 3 strings with the flesh of the index. Add the chunk, where the side of the palm drops onto the strings to mute them with a slap, and you have a backbeat without a drummer.",
            "The chunk goes on beats 2 and 4, where a snare drum would play. That's why it makes fingerstyle sound like a band.",
          ],
          exercises: [
            ex("d5-strokes", "Brush, chunk, flick", "strokes", 60, 80, [
              "Brush on 1, chunk on 2, flick on 3, chunk on 4.",
              "Chunk: drop the side of the palm onto all six strings near the bridge. It should thud, not ring.",
            ]),
            ex("d5-boom", "Bass and flick", "boom-chick", 60, 90, ["The thumb plays the bass and the index flicks the chord. This is country's boom-chick."]),
          ],
          pitfalls: [
            pit("The flick snags on the strings", "Hitting with the fingertip instead of the back of the nail", "Curl the index in and flick it out from the knuckle, like flicking a crumb off a table. Strings 4–1 only."),
            pit("The chunk rings instead of thudding", "The hand lands too slowly or too far from the bridge", "Drop fast and relaxed, and leave the hand there until the next note."),
          ],
        },
        {
          id: "d5-pattern",
          kind: "pattern",
          title: "Percussive Travis and the groove",
          minutes: 10,
          why: [
            "Replace the alternate bass on 2 and 4 with the chunk and the Travis pattern becomes a groove: bass, chunk, bass, chunk, with the finger notes in between. The bass-strum groove (bass, down, up, bass, down, up) is its strummed version. You'll use it for the chorus of the capstone.",
          ],
          exercises: [
            ex("d5-perc", "Percussive Travis", "perc-travis", 55, 80, ["The finger notes on the &s stay exactly the same. Only beats 2 and 4 change."]),
            ex("d5-groove", "Bass-strum groove", "strum-chorus", 60, 90),
          ],
        },
        {
          id: "d5-challenge",
          kind: "challenge",
          title: "Switch without the tempo moving",
          minutes: 15,
          why: [
            "Switching between picking and strumming is where tempo gets lost. Strumming feels faster than picking, so most players speed up. For today's check the click stops after the count-in and you keep time yourself. The app measures your tempo over the first half of the take and the second half, and compares them.",
          ],
          exercises: [
            ex(
              "d5-switch",
              "Pick four, strum four",
              "switch",
              60,
              85,
              ["Four bars of Travis, then four bars of the groove, looped."],
              ch("c-switch", "Switch between Travis and the groove for 16 bars at 80, click off, drift under 3 bpm", { bpm: 80, bars: 16, mode: "free", maxDriftBpm: 3, maxMeanAbsMs: 40, maxMissed: 4 }, [
                "The strummed bars weren't louder or rushed compared with the picked ones",
              ]),
            ),
          ],
          pitfalls: [
            pit("The strummed half is faster", "Strumming feels easier, so you push", "Strum with a lighter hand and let the thumb bass anchor it. It still plays on 1 and 3."),
            pit("You stumble on the first picked bar after strumming", "The hand drifts away from the strings to strum", "Keep the strum small, just the index moving from the knuckle, so the hand stays at home."),
          ],
        },
        {
          id: "d5-review",
          kind: "review",
          title: "Review",
          minutes: 5,
          prompts: [
            "Look at your drift figure. Did you speed up or slow down? Whichever it was, you'll probably do it on stage too, so remember it.",
            "Try one verse of any song you already strum using the bass-strum groove instead of a pick.",
            REVIEW_TIME,
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Day 6
    {
      n: 6,
      title: "Connecting and colouring",
      focus: "Bass walks between chords, hammer-ons inside the pattern, palm muting, and stamina.",
      outcome: "The bass joins your chord changes together, you have more tone colours to use, and you can play for 3 minutes without the pattern falling apart.",
      blocks: [
        {
          id: "d6-warmup",
          kind: "warmup",
          title: "Percussive Travis",
          minutes: 5,
          exercises: [ex("d6-perc", "Percussive Travis", "perc-travis", 70, 85)],
        },
        {
          id: "d6-technique",
          kind: "technique",
          title: "Bass walks",
          minutes: 10,
          why: [
            "A walk joins two roots with the notes in between. G to C walks up G–A–B–C, with bass notes on beats 3 and 4 of the G bar leading into the C. C to Am walks down C–B–A. A walk tells the listener the change is coming, which makes it sound intentional and hides any small gap.",
            "The thumb plays the walk notes on beats 3 and 4 in place of the alternating bass, so the finger notes don't change at all.",
          ],
          exercises: [
            ex("d6-walks", "Bass walks", "walks", 55, 80, [
              "In the C bar, beat 4 is string 5 fret 2 (B), leading down to A. In the G bar, beats 3 and 4 are string 5 open (A) and fret 2 (B), leading up to C.",
              "Fret the B with your middle finger in both walks and keep the rest of the chord held down.",
            ]),
          ],
          pitfalls: [pit("The walk notes are late", "The fretting finger moves on the beat instead of before it", "Move the finger during the & before the walk note.")],
        },
        {
          id: "d6-pattern",
          kind: "pattern",
          title: "Colour: hammer-ons and palm muting",
          minutes: 10,
          why: [
            "A hammer-on sounds a note by bringing a fretting finger down hard on a string that's still ringing, without picking it. Inside a pattern it gives you an extra note for free: the picking hand keeps the same rhythm and the fretting hand adds the decoration. It should sound as smooth as a picked note, just a little softer.",
            "Palm muting means resting the side of the picking hand on the bass strings at the bridge. It makes the thumb notes short and percussive while the treble strings ring. That contrast between a thudding bass and ringing treble is the classic Travis and Chet Atkins sound, and it makes the melody clearer.",
          ],
          exercises: [
            ex("d6-hammer", "Hammer-on in the pattern", "hammer", 55, 75, [
              "The thumb picks string 4 open on beat 2, then you hammer onto fret 2 on the & without picking again.",
              "The timing check treats the hammer-on as optional, but it should still land on the &.",
            ]),
            ex("d6-pm", "Palm-muted Travis", "pm-travis", 60, 80, ["Rest the side of your palm on strings 6–4 right at the saddle. Any further forward and the bass goes dead."]),
          ],
          pitfalls: [
            pit("The hammered note is quiet or doesn't sound", "The finger comes down from too close or too slowly", "Hammer from about 1 cm up, fast, landing on the fingertip just behind the fret."),
            pit("The palm mute kills the top strings too", "The palm is resting across all six strings", "Rotate the hand so only its edge touches strings 6–4."),
          ],
        },
        {
          id: "d6-challenge",
          kind: "challenge",
          title: "Walks and stamina",
          minutes: 15,
          why: [
            "Parts break down after a minute or two, not in the first 8 bars. Tension builds, the forearm tires and the thumb speeds up. A 3-minute take shows where your technique gives way when you're tired. The report shows whether your timing drifts and where the missed notes cluster.",
          ],
          exercises: [
            ex("d6-walks-challenge", "Bass walks", "walks", 60, 80, [], ch("c-walks", "Walks through C–Am–G–C at 80", { bpm: 80, bars: 8, maxMeanAbsMs: 35, maxMissed: 2 }, ["The walk notes landed on beats 3 and 4, not late"])),
            ex(
              "d6-stamina",
              "Stamina loop",
              "stamina",
              70,
              85,
              [
                "Melody Travis into the walks, looped. 3 minutes at 85 is 64 bars.",
                "Shake your hands out before you start. If your forearm burns, you're squeezing. Loosen your grip on the neck until notes start to buzz, then add a little pressure back.",
              ],
              ch("c-stamina", "3 minutes (64 bars) at 85 without the pattern breaking down", { bpm: 85, bars: 64, maxMeanAbsMs: 35, maxMissed: 6, maxDriftBpm: 3 }, [
                "Played the whole take without stopping",
              ]),
            ),
          ],
        },
        {
          id: "d6-review",
          kind: "review",
          title: "Review",
          minutes: 5,
          prompts: [
            "Where in the 3-minute take did the misses cluster? That's where fatigue starts. Tomorrow's piece is about 2 minutes.",
            "Tomorrow is the capstone and the exit test. Look through Lanterns on day 7 now so nothing in it is a surprise.",
            REVIEW_TIME,
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Day 7
    {
      n: 7,
      title: "Capstone: Lanterns, and the exit test",
      focus: "Play everything together in an original piece, then take the exit test.",
      outcome: "You can play Lanterns from start to finish, and the exit test shows where you now stand.",
      blocks: [
        {
          id: "d7-warmup",
          kind: "warmup",
          title: "Switch warm-up",
          minutes: 5,
          exercises: [ex("d7-switch", "Pick four, strum four", "switch", 70, 85)],
        },
        {
          id: "d7-technique",
          kind: "technique",
          title: "Lanterns, part 1: intro, verse, chorus",
          minutes: 10,
          why: [
            "Lanterns uses one technique from this week in each section. The intro is day 4's melody Travis, with a walk-up into the verse. The verse is day 2's pinch arpeggio on Am–Fmaj7–C–G. The chorus is day 5's bass-strum groove, ending on brush, chunk, flick, chunk. The bridge is day 4's triads over an open A. The outro is day 6's walks, finishing on a thumb brush you let ring.",
            "A song is harder than its parts because of the joins between sections. Learn each section, then practise the last bar of one into the first bar of the next.",
          ],
          exercises: [
            ex("d7-intro", "Intro", "lanterns-intro", 60, 80, ["The melody twice. The second time, the G bar walks up (A, B) into the verse."]),
            ex("d7-verse", "Verse", "lanterns-verse", 60, 80, ["Pinch arpeggio. Am's root is string 5, Fmaj7's is string 4."]),
            ex("d7-chorus", "Chorus", "lanterns-chorus", 60, 85, ["Bass-strum groove. The last bar is brush, chunk, flick, chunk."]),
          ],
        },
        {
          id: "d7-pattern",
          kind: "pattern",
          title: "Lanterns, part 2: bridge and outro",
          minutes: 10,
          why: [
            "In the bridge the open A string rings on every beat while the triads move above it: Am, F/A, C/A, G/A. Over an A in the bass, F becomes F/A (sweet), C becomes Am7, and G becomes a suspended sound that pulls back to Am. The same three-string shapes sound different over a different bass, which is why the triads were worth learning.",
          ],
          exercises: [
            ex("d7-bridge", "Bridge", "lanterns-bridge", 50, 75, ["Frets on strings 3-2-1: 5-5-5, 5-6-5, 5-5-3, 7-8-7, then 9-10-8, 10-10-8, 9-8-8, 7-8-7."]),
            ex("d7-outro", "Outro", "lanterns-outro", 60, 80, ["The walks from day 6, then one thumb brush on C. Let it ring."]),
          ],
        },
        {
          id: "d7-challenge",
          kind: "challenge",
          title: "Performance and exit test",
          minutes: 15,
          why: [
            "The exit test uses the same standard as the course page. Pass all seven and you're ahead of most people who've been fingerpicking for months. Where you miss, the report tells you which skill to work on next week. If you run out of time today, finish the tests tomorrow.",
          ],
          tests: ["t1", "t2", "t3", "t4", "t5", "t6", "t7"],
          exercises: [
            ex(
              "d7-lanterns",
              "Lanterns, start to finish",
              "lanterns",
              60,
              80,
              ["37 bars. Record it on your phone as well as running the timing check. It's worth keeping."],
              ch("c-lanterns", "The whole of Lanterns at 72 without stopping", { bpm: 72, bars: 37, maxMeanAbsMs: 40, maxMissed: 6 }, [
                "Played start to finish without stopping",
                "The melody is clear in the intro",
                "The chorus didn't speed up",
                "The bridge pedal never stopped",
              ]),
            ),
          ],
        },
        {
          id: "d7-review",
          kind: "review",
          title: "Review and next week",
          minutes: 5,
          prompts: [
            "Compare your baseline and exit results on the course page.",
            "Any failed tests are next week's plan: go back to the day that teaches that skill and redo its challenge 10 bpm faster.",
            "Next steps: arrange a song you know using the same tools. Travis bass under the verse, a melody on top, and the bass-strum groove for the chorus.",
          ],
        },
      ],
    },
  ],
};
