# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Seb Carss's personal homepage, served from sebcarss.github.io — a plain static
HTML/CSS site with no build step, no dependencies, and no package.json. Push to
`master` and GitHub Pages serves the tree as-is (`.nojekyll` disables Jekyll
processing).

There is no test/lint/build tooling in this repo. To check a change, open the
HTML file directly in a browser or serve the directory with any static file
server (e.g. `python3 -m http.server`).

## Structure

```
index.html                    Homepage — lists categories and utility cards
styles.css                    Shared styles for every page (nav, cards, footer)
404.html                      Not-found page
music/index.html              "Music" category page
music/tab-caster/index.html   Tab Caster utility (fully self-contained)
music/scale-charts/index.html Scale Charts utility (fully self-contained)
food/index.html               "Food" category page
food/ice-cream-calculator/index.html   Ice Cream Calculator utility
food/bakers-percentage/index.html      Baker's Percentage Calculator utility
```

Each category (e.g. `music/`) has its own `index.html` listing the utilities
in that category, mirroring the cards shown on the homepage.

## Adding a new utility

1. Drop the self-contained app at `<category>/<name>/index.html` — it should
   not depend on anything outside its own file (see Tab Caster below for why).
2. Add a `.card` link to it on the homepage `index.html`, and on the relevant
   `<category>/index.html`.
3. If it's a new category, add a nav link in `styles.css`-styled pages and,
   optionally, a `<category>/index.html`.
4. Reuse `styles.css` and the existing nav/footer markup for consistency
   unless the utility needs a fully custom layout (as Tab Caster does).

## Tab Caster (`music/tab-caster/index.html`)

A single self-contained HTML file (no external requests at runtime) that
converts an Ultimate Guitar PDF into a single-screen, TV-castable tab sheet.
Key things to know before touching it:

- **pdf.js is embedded inline** (minified, versioned in a comment as
  "pdf.js 3.11.174") in a `<script>` block near the top of the file, including
  the worker (exposed as `globalThis.pdfjsWorker`), so the app works fully
  offline with no network requests or separate worker file. Don't try to
  "clean this up" into a separate file/CDN reference — self-containment is
  intentional.
- The actual application logic lives in the second `<script>` block, after
  the embedded library. It has three main parts:
  - **Segmentation** (`segmentPage`): recursive XY-cut algorithm that slices
    a rendered PDF page into content blocks along whitespace gaps, so the
    original Ultimate Guitar layout is preserved. Two-column pages need the
    column-grouping pass inside `cut`: bands whose ink straddles a shared
    vertical gutter (plus one-sided neighbours whose whitespace spans the
    cut point) are cut at the gutter *first*, so blocks come out in
    column-major reading order (left column top-to-bottom, then right)
    instead of interleaved. Don't "simplify" that pass away — aligned
    section gaps in the two columns otherwise masquerade as full-width
    horizontal cuts.
  - **Classification & tinting** (`classifyBands`, `tintAll`): classifies
    each line of a block as chord/lyric/section/neutral using pixel
    statistics (stroke weight for bold chord names, tall thin glyphs for
    `[section]` brackets), then recolors ink pixels accordingly. Palettes
    for light/dark are in `PALETTES`.
  - **Layout & controls** (`buildSheet`, `applyLayout`, `autoLayout`,
    keyboard shortcuts, drag-and-drop, fullscreen handling): arranges
    segmented blocks into a CSS multi-column sheet and picks the
    column count/zoom that best fills the screen.
  - **Playlist** (`setPlaylist`, `playSong`): multi-select or drop a whole
    folder of PDFs; files are sorted by name into a toolbar `<select>`
    (shown only for >1 song) and switched with ←/→ or [ ] — songs re-parse
    on switch, nothing is cached. The toolbar also has a "‹ Home" link
    back to the homepage.
- Everything is plain DOM/canvas JS — no framework, no build step. `$()` is
  a `getElementById` shorthand defined near the top of the app script.

## Scale Charts (`music/scale-charts/index.html`)

A single self-contained HTML file (no external requests) showing, for one
scale type at a time, a grid of every key (rows) against every scale degree
(columns), with the note and the diatonic chord in each cell. Built for
casting to a TV, so it shares Tab Caster's chrome: dark toolbar, orange
accent, `body.dark` / `body.fs` classes, fullscreen with a toolbar that
reappears near the top edge, `--barH` kept in sync by a `ResizeObserver`.
Key things to know:

- **Spelling is computed, not tabulated.** `scaleNotes()` gives each degree
  its own letter name (root letter + `letterSteps[i]`) and derives the
  accidental from the semitone interval, so C major is C D E F G A B and
  D♭ major is D♭ E♭ F G♭ A♭ B♭ C — never enharmonic mush. `pickRoots()`
  then chooses between the enharmonic spellings in `ROOT_CANDIDATES`
  (e.g. D♭ vs C♯) by picking whichever spells the scale with the fewest
  accidentals, double accidentals heavily penalised. Consequence: the 12
  row labels change with the selected scale (D♭ major, but C♯ natural
  minor). That's intended.
- **Scales** live in `SCALES` (7-note modes plus harmonic/melodic minor,
  and pentatonic/blues). A scale with `degLabels` is note-only: it has no
  diatonic chords, sets `body.nochords`, and needs `letterSteps` because
  its degrees don't advance one letter at a time.
- **Chords** come from `chordAt()` (stacked thirds within the scale) and
  `romanFor()` (numeral case + °/ø/+ and seventh suffixes). Roman numerals
  are a property of the scale, not the key, so they render once in `<thead>`.
- **Progressions**: `progression` is an array of 1-based degrees, set from
  the text box (`parseProgression()` accepts `1 4 5` or `ii V I`), the
  `PRESETS` list, or number keys 1–7. Each step gets a colour from
  `STEP_COLOURS`, passed into CSS as a `--c` rgb triple on the cell.
- **Sizing**: `fit()` measures the table at a known font size and scales
  `#chart`'s `font-size` so it fills the viewport; every inner dimension is
  in `em` so the whole grid scales together. `autoFit` stays true until the
  user touches the zoom slider or +/-.

## Ice Cream Calculator (`food/ice-cream-calculator/index.html`)

A single-file recipe balancing tool: pick ingredients and amounts in grams,
and it computes fat / sugar / MSNF / other solids / total solids percentages
plus POD (relative sweetness) and PAC (anti-freezing power), compared against
target ranges for ice cream and gelato. Unlike Tab Caster it reuses
`/styles.css` and the standard nav/footer, with page-specific styles inline.
Key things to know:

- **Ingredient data** (`BUILTINS`) is per 100 g of ingredient. `pod`/`pac`
  cover only the ingredient's own sugars — the lactose inside MSNF is added
  globally in `compute()` (`LACTOSE_*` constants), so don't add lactose
  contributions to individual dairy entries or it will be double-counted.
- **Target ranges** live in `BASELINES` (ice cream vs gelato); metric labels
  and meter scales in `METRICS`. All figures are approximate published ranges
  and safe to tune.
- Custom ingredients and saved recipes persist to localStorage under
  `icc:ingredients` and `icc:recipes`; recipes reference ingredients by name.
- Plain DOM JS, no dependencies. `$()` is a `getElementById` shorthand.

## Baker's Percentage Calculator (`food/bakers-percentage/index.html`)

A single-file bread-dough tool built on baker's percentages (flour = 100%,
everything else a % of total flour). Same house style as the ice cream
calculator: reuses `/styles.css` + standard nav/footer, page-local `<style>`
with a `bpc-` prefix, plain DOM JS, `$()` shorthand. Key things to know:

- **Percentages are the source of truth**; gram inputs write back to the %
  on change ("flour weight" mode only — in "target dough" mode gram fields
  are read-only and the flour weight is derived from loaves × g/loaf).
- **Preferments** (`PREFERMENTS`): poolish/biga/levain split the recipe into
  Preferment and Final dough tables. The preferment's flour, water and yeast
  pinch are subtracted from the overall totals, so the grand totals and
  percentages never change; levain zeroes/disables the commercial yeast row.
- **Guidance ranges** live in `HYDRATION_BANDS`, `SALT_TARGET` and the yeast
  verdict logic — approximate published figures, safe to tune.
- Saved recipes persist to localStorage under `bpc:recipes` as full state
  snapshots (`snapshot()`/`applyRecipe()`).
