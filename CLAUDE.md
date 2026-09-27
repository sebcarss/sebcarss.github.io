# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Seb Carss's personal homepage at sebcarss.github.io. Two halves:

- **Food calculators** — a Vite + React 19 + TypeScript single-page app in
  `src/`, installable as a PWA (`vite-plugin-pwa`) so it works offline on a
  phone. Routes: `/`, `/food/`, `/food/ice-cream-calculator/`,
  `/food/bakers-percentage/`, `/food/ramen-noodles/`, `/food/cookbooks/`.
- **Music tools** — `public/music/**` (Tab Caster, Scale Charts). Plain,
  self-contained static HTML that the build copies through unchanged. They
  link `/styles.css`, which lives at `public/styles.css`. Don't refactor them
  into the React app; they only make sense cast to a TV from a desktop.
- **Guitar School** — `src/tools/guitar/`, SPA routes `/guitar/`,
  `/guitar/<course>/` and `/guitar/<course>/day/<n>/` (practice happens on a
  phone next to the guitar, so it lives in the PWA, not under `/music/`).

Commands: `npm run dev`, `npm test` (vitest), `npm run build` (runs `tsc
--noEmit` first, then `scripts/postbuild.mjs`), `npm run preview`,
`npm run dev:phone` (HTTPS on the LAN), `npm run add-recipes` (interactive
cookbook entry that commits and pushes) and `npm run import-book` (merge
AI-transcribed contents/index JSON, then commit and push; see below).
Deployed by `.github/workflows/deploy.yml` on push to `master` (Pages source
must be "GitHub Actions"). `dist/` is generated; never commit it.

## Architecture rules

- **Engines are pure.** Each tool has `engine.ts` exporting
  `compute(state, lookup) → Result | null` with no DOM or React. The page
  (`<Tool>.tsx`) owns state via `useDraft()` (a persisted `useReducer`) and
  calls `compute` in a `useMemo`. Every bug fix gets a test in
  `engine.test.ts`; `fixtures/legacy.json` holds outputs captured from the old
  static pages, and the parity tests assert against them with a documented
  tolerance for deliberate changes.
- **One ingredient database** (`src/lib/ingredients/`). `Ingredient` = id,
  name, category, `tools` tags, `solids` per 100 g (fat, protein, sugars,
  lactose, ash, other — water is derived as the remainder), optional `sweet`
  (POD/PAC, own sugars only), `egg` (wholeEq by solids, colour) and `yeast`
  (instantEq) facets. `derive.ts` has `water()`, `msnf()` (dairy only:
  protein+lactose+ash) and `otherSolids()`. Built-ins live in `builtins.ts`
  with a test that solids ≤ 100. Custom ingredients persist under
  `sc:ingredients:v1`, are referenced by **id**, and a missing id renders as
  "(missing)" rather than being dropped.
- **Recipes** (`src/lib/recipes/store.ts`): `SavedRecipe { id, tool, name,
  notes, createdAt, updatedAt, schema, state }` under `sc:recipes:v1`,
  zod-validated leniently (bad entries skipped, never crash). Each tool's
  `state.ts` has a zod schema, `SCHEMA_VERSION`, `parseState()` and the
  reducer. Drafts autosave under `sc:draft:<tool>`; the current recipe
  id/name/notes under `sc:draft-meta:<tool>`.
- **Legacy migration** (`src/lib/recipes/migrate.ts` + `tools/*/migrate.ts`)
  runs once (flag `sc:migrated:v1`), reads the old `icc:`, `bpc:`, `rnc:`
  keys, maps names → ids and turns unknown names into custom ingredients. Old
  keys are never deleted.
- **Export** (`src/lib/export/`): each tool's `text.ts` builds a fixed-width
  plain-text block (`table()` helper); `share.ts` uses the Web Share API with
  clipboard fallback. `RecipeBar` wires save / save-as / load / delete /
  share / copy / print / notes for every tool.
- **UI** is plain CSS with tokens in `src/styles/global.css` (light + dark via
  `prefers-color-scheme`), shared tool classes in `tools.css`, and a small set
  of components. `NumberInput` keeps its own text while focused; use
  `mode="commit"` for derived gram fields that write back to a %.
- Tests live in `src/**/*.test.ts(x)` and `scripts/**/*.test.ts`
  (`allowJs` lets TS tests import the `.mjs` script helpers).
- `scripts/postbuild.mjs` has the route list — keep it in sync with
  `src/routes.tsx` when adding a tool. Music is excluded from the service
  worker precache (`globIgnores`) and from the navigate fallback.

## Adding a food tool

1. `src/tools/<name>/` with `data.ts` (tables), `state.ts` (zod schema,
   reducer, defaults), `engine.ts` (pure), `engine.test.ts`, `text.ts`
   (export + list summary), `migrate.ts` (or none), `<Name>.tsx` (page using
   `ToolPage`, `Panel`, `RecipeBar`, `CustomIngredients`).
2. Tag the ingredients it can use with its `Tool` id in `builtins.ts`.
3. Add the route in `src/routes.tsx`, the path in `scripts/postbuild.mjs`, a
   card in `src/pages/Food.tsx`, and a smoke test in `src/test/render.test.tsx`.

## Ice Cream (`src/tools/ice-cream/`)

Sums composition per row, adds lactose POD (0.16) / PAC (1.0) exactly once
from `solids.lactose`, and reports fat / sugar (non-lactose) / MSNF / other /
total solids / POD / PAC against `targets.ts` (ice cream, gelato, sorbet). New
outputs: initial freezing point from PAC as sucrose-equivalent molality
(Kf 1.86), ice fraction at −12 °C → hardness label, lactose as % of the water
phase with a sandiness warning above 10 %.

## Baker's Percentage (`src/tools/bread/`)

Percentages are the source of truth; gram fields write back in flour-weight
mode and are read-only in target-dough mode. Ingredient rows carry
composition, so **effective hydration** = added water + water inside every
non-flour ingredient (flour moisture never counts). Yeast is typed
(instant / active dry / fresh) via `yeast.instantEq`; guidance uses the
instant-equivalent. Preferments (`data.ts PREFERMENTS`): poolish, biga,
levain (optional starter seed split into flour+water), pâte fermentée (same
hydration and salt as the dough, yeast taken from it), sponge. The preferment
is a split of the same totals; `pref.yeastSeparate` adds its yeast on top
instead. Flour shares are normalised by their sum with a warning when ≠ 100.

## Ramen Noodles (`src/tools/ramen/`)

Port of the original model: flour blend → alkali normalised to a 90:10
kansui powder (`ALKALI_REF`) → egg → water summed once → geometry from cut
number (width = 30/n) and the KitchenAid `ROLLER` gap → boil time, colour,
texture. Egg is an ingredient from the DB (`egg.wholeEq` is by solids: yolk
2.0, dried 3.9); picking a form seeds a default % so it is never a silent
no-op, and its fat/protein feed texture and a dough-protein note. Kansui is
ignored entirely when the form is "none". Styles (`STYLES`, 22) are scored by
`scoreStyle()` over `ATTRS`; **width is scored in mm** (`styleBand()`
converts cut bands). "Load reference formula" (`referenceFormula()`) keeps the
current egg form, back-solves the egg % from whole-egg equivalence and must
rank its own style first for all 22 — that invariant is a test.

## Cookbook Finder (`src/tools/cookbooks/`)

A search page rather than a calculator: no `compute`, `state.ts`, `useDraft`
or `RecipeBar`. Data is one JSON file per book in `books/`
(`{ book, recipes: [{ title, page }], index?: [{ term, sub?, pages }] }`),
loaded with `import.meta.glob` in `data.ts`.
- `recipes` holds the dishes: from the contents pages, or from the index
  lines that name a dish.
- `index` is the rest of the book's printed index (ingredients, dish types,
  topics), transcribed flat:
  - a sub-entry repeats its heading as `term`;
  - "heading: dish" on one line is split into term + sub;
  - ranges keep their first page;
  - every line needs `pages`.
- There is no `see`: cross-references are dropped, because they only
  duplicated results.

The books are bundled into the JS, so they work offline. Files are validated
leniently with zod (`parseBooks` skips a bad book with a warning).
`data.test.ts` fails CI on:
- any invalid file;
- a duplicate title+page;
- a duplicate index term+sub;
- a top-level index line that is just a recipe on that page;
- a duplicate book name.

`example-cookbook.json` is only a placeholder. The render test mocks
`data.ts`, so deleting it is safe.

`engine.ts` `search(query, entries, { book, index })` is pure and returns
`{ recipes, index }`. Titles and query are normalised (accents, case,
`&`→and, punctuation) and lightly singularised, then scored:
- exact title: 1000;
- title contains the query phrase: 700–800;
- every non-stopword query word matches: 550–650 (all "strong");
- some words match: `400 × avg word score` ("partial", shown under
  "Close matches").

A word matches:
- exactly (1);
- as a prefix of a title word of 3+ chars (0.9);
- within Levenshtein 1 (5+ chars) or 2 (8+ chars) (0.8).

`searchBooks` scores book names with the same `scoreText`.
`bookSummaries(BOOKS)` gives recipe and index-line counts A–Z. It's built from
the book files, not the recipes, so a book with only an index is listed and
opens (on its index, with no toggle). `bookRecipes` gives one book in page
order.

Index search: `toIndexRows` (data.ts) expands each index line × page into an
`IndexRow`, titled by the dish it points at:
1. the recipe its sub-entry names (`subDish` strips a "shoulder: " prefix);
2. else the recipe starting on that page;
3. else the sub-entry's dish;
4. else the heading ("pork" p. 154, a page about pork).

There's no nearby-page join: in books whose recipes came from the index it
mislabelled pages. `search` scores rows against "term sub" and "sub" and
keeps only strong hits (every word), so "beef rendang" doesn't list every
"beef › …" line. It drops rows whose book|page|title is already a recipe hit
and dedupes the rest. That's the `index` group, shown under **By ingredient**
below the recipe titles, each with its `via` ("Pork › salo").
`bookIndex` groups a book's lines A–Z for the Index view.

The page has three states driven by the URL:
- no `q` and no `book`: the list of all books
- `q` only: matching books (top 5, the rest behind "Show all") above the
  recipe results, where each book name links to its book
- `book`: that book's recipes in page order, or with `view=index` (a
  Recipes | Index `Toggle`, shown only when the book has an index) its index
  as printed. The box searches only that book ("Book not found" for an
  unknown name)

Opening a book is a `<Link>` (pushes history, drops `q`) so Back works;
typing uses `setParams(..., { replace: true })`. There is no book `<select>`
any more. The render tests mock `data.ts` with two books (built through the
real `toEntries`/`toIndexRows`), and one of them has an index.

Data gets in through two scripts, or by hand edits. Both must stay plain Node
ESM (the local Node is 20, so no TS).
- `scripts/add-recipes.mjs`: type `Title, page` lines. It rewrites the book
  file after every entry.
- `scripts/import-book.mjs`: paste (or pass a file of) the JSON an AI
  produced from photos with `docs/cookbook-import-prompt.md`. The pipeline:
  1. `parseImport` strips fences and chatter.
  2. `validateBook`.
  3. `cleanBook` drops `see`, removes lines with no pages and splits
     "heading: dish".
  4. `mergeBook` dedupes recipes by `titleKey`+page and index lines by
     term+sub, unioning pages.
  5. `promoteRecipes` moves a top-level index line into `recipes` when it's
     also a sub-entry, or already a recipe, on the same page. It skips
     headings with sub-entries (categories) and pages with `REFERENCE_PAGE`
     (3) or more headings (glossaries).
  6. `checkBook` warnings.

  When asked to import from `photos/<book>/` (git-ignored), follow that
  prompt, write the JSON to the scratchpad and run
  `npm run import-book -- <file> --no-git`, then `npm test`.

Their pure logic lives in `scripts/lib/cookbooks.mjs` (parsing, slugify,
sorting, merge, and `serializeBook`, which writes one recipe or index line per
line and must keep `index`). Tests are in `cookbooks.test.ts`, which
round-trips through `BookSchema`, so keep the two formats in sync.
`scripts/lib/cli.mjs` holds the shared terminal/git plumbing: `loadBooks`,
`startOnMaster` (requires `master`, pulls), and `commitAndPush` (commits
only that file with `git commit -- <file>`, then `pull --rebase --autostash`,
then push). Input is read via the readline async iterator, never
`for await` (which closes readline), so piped or pasted lines aren't dropped.

## Guitar School (`src/tools/guitar/`)

Courses are pure data (`schema.ts`, zod): course → days → blocks (warmup,
technique, pattern, challenge, review; minutes must sum to
`minutesPerDay`, a test) → exercises pointing at a tab pattern by id, with an
optional `challenge` (pass `criteria` + a `checklist` for what the mic can't
hear). Course-level `tests` are the benchmark: `baseline` ones are taken on
day 1, all of them on the last day. A new sub-domain (e.g. country) is one
file in `courses/` plus one line in `registry.ts`, plus its paths in
`scripts/postbuild.mjs`.

- `patterns.ts`: chord shapes with a bass map (`R` root / `A` alternate
  string) and templates over roles (`R A B 3 2 1`), so one template plays
  over any progression. `travis()` takes melody and bass-walk overrides;
  `strumBar()` does brush / flick / up / chunk. `PATTERNS` holds every tab,
  including the "Lanterns" capstone (37 bars built from its sections).
- `engine/` is pure and tested: `rhythm.ts` (event times, speed trainer,
  `expectedOnsets` with thumb/finger group, on/off-beat, chord change, slurs
  optional); `onset.ts` (spectral-flux onsets over 0–1.8 kHz at ~11 kHz,
  ~6 ms accuracy; `estimateLatency`); `timing.ts` (`analyseTiming` in
  "click" mode vs the grid or "free" mode vs a tempo fitted to the player,
  `judge` against criteria, `diagnose` → plain-English causes);
  `progress.ts` (reducer, `carryOver` of unpassed challenges into the next
  warm-up, `dayStatus`). Progress is one object under
  `sc:guitar:progress:v1`; challenge/test/exercise keys are
  `<course>:<id>`.
- `audio/`: `synth.ts` (shared AudioContext, Karplus-Strong demo, the click
  is a soft-attack 4.2 kHz blip so the detector ignores it — keep the test in
  `onset.test.ts` in step if it changes), `transport.ts` (look-ahead
  scheduler; `claim()` keeps one player at a time), `mic.ts` (ScriptProcessor
  capture with echo cancellation/AGC off; nothing stored).
- A take: calibrate once (8 muted plucks → `latencyMs`), then count-in +
  take, onsets shifted by capture start − latency, analysed and recorded as
  an attempt. Self-assessment is the fallback without a mic.
