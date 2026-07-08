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
    original Ultimate Guitar layout is preserved.
  - **Classification & tinting** (`classifyBands`, `tintAll`): classifies
    each line of a block as chord/lyric/section/neutral using pixel
    statistics (stroke weight for bold chord names, tall thin glyphs for
    `[section]` brackets), then recolors ink pixels accordingly. Palettes
    for light/dark are in `PALETTES`.
  - **Layout & controls** (`buildSheet`, `applyLayout`, `autoLayout`,
    keyboard shortcuts, drag-and-drop, fullscreen handling): arranges
    segmented blocks into a CSS multi-column sheet and picks the
    column count/zoom that best fills the screen.
- Everything is plain DOM/canvas JS — no framework, no build step. `$()` is
  a `getElementById` shorthand defined near the top of the app script.
