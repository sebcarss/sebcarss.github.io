# sebcarss.github.io

Personal homepage and small utilities, served from
[sebcarss.github.io](https://sebcarss.github.io).

The food calculators and cookbook finder are a Vite + React + TypeScript app that installs as a
PWA and works offline on a phone. The music tools are plain static pages
under `public/music/` and are served as-is.

## Running locally

```
npm install
npm run dev          # http://localhost:5173 with hot reload
npm test             # engine, migration and rendered smoke tests (vitest)
npm run build        # type-check + production build into dist/
npm run preview      # serve dist/ (service worker active)
npm run dev:phone    # dev server over HTTPS on the LAN, for testing on a phone
npm run add-recipes  # type cookbook recipes in, then commit + push them
```

## Adding cookbook recipes

The Cookbook Finder searches JSON files in `src/tools/cookbooks/books/`, one
per book:

```json
{
  "book": "Ottolenghi Simple",
  "recipes": [
    { "title": "Moussaka", "page": 123 }
  ]
}
```

The easy way to fill them in is `npm run add-recipes`:

1. Pick a book by number, or type a new book's name to create its file.
2. Type one recipe per line as `Moussaka, 123` (or `Moussaka 123`, or
   `Moussaka p. 123`). The page is always the last number, so
   `5-Minute Noodles, 42` works. Type just a title and it asks for the page.
   `undo` removes the last one, `list` shows what you've added, `quit`
   discards the session and `help` repeats this.
3. Press Enter on an empty line when the book is done, then answer `y` to
   commit and push. Only that book's file is committed (`Cookbooks: add N
   recipes to <Book>`), and the push triggers the deploy, so the site updates
   a minute or two later.

The file is saved after every recipe, so Ctrl-C or a failed push loses
nothing. `npm run add-recipes -- --no-git` edits the file without touching
git. The script refuses to run off `master`. You can also edit the files by
hand. `npm test` (which the deploy runs first) rejects a malformed file or a
duplicate recipe. `example-cookbook.json` is a placeholder; delete it once
your own books are in.

## Deploying

Push to `master`. The GitHub Actions workflow in `.github/workflows/deploy.yml`
installs, tests, builds and deploys `dist/` with `actions/deploy-pages`. In the
repository settings, **Pages → Build and deployment → Source** must be set to
**GitHub Actions** (a one-off change from the old "deploy from branch").

## Structure

```
index.html                Vite entry
src/
  main.tsx, routes.tsx    Router: /, /food, /food/<tool>
  components/             Shared UI (NumberInput, Meter, RecipeBar, IngredientPicker…)
  lib/ingredients/        The shared ingredient database and custom-ingredient store
  lib/recipes/            Saved recipes, drafts, legacy migration
  lib/export/             Plain-text recipe formatting, share sheet / clipboard
  tools/ice-cream/        engine.ts (pure maths) + IceCream.tsx (page) + tests
  tools/bread/            Baker's percentage calculator
  tools/ramen/            Ramen noodle calculator
  tools/cookbooks/        Cookbook Finder: search engine, page and books/*.json data
  pages/                  Home, Food (+ backup), NotFound
  styles/                 global.css (tokens, light + dark) and tools.css
public/
  music/**                Tab Caster and Scale Charts — untouched static pages
  styles.css              Stylesheet the static music pages link to
  icons/                  PWA icons
scripts/postbuild.mjs     Writes an index.html per route and 404.html into dist/
scripts/add-recipes.mjs   Interactive cookbook entry → commit → push
scripts/lib/              Its pure, tested helpers
```

## Music

- **[Tab Caster](https://sebcarss.github.io/music/tab-caster)** — turn an
  Ultimate Guitar PDF into a single-screen tab you can cast to a TV.
- **[Scale Charts](https://sebcarss.github.io/music/scale-charts)** — the notes
  and chords for every scale degree in every key, with chord progressions
  highlighted, sized to fill a TV.

## Food

- **[Ice Cream Calculator](https://sebcarss.github.io/food/ice-cream-calculator)** —
  balance fat, sugar and MSNF (plus POD/PAC, freezing point and lactose)
  against ice cream, gelato and sorbet targets.
- **[Baker's Percentage Calculator](https://sebcarss.github.io/food/bakers-percentage)** —
  bread doughs in baker's percentages, with effective hydration, typed yeast
  and poolish, biga, levain, pâte fermentée or sponge preferments.
- **[Ramen Noodle Calculator](https://sebcarss.github.io/food/ramen-noodles)** —
  flour blend, hydration, kansui, egg, cut and crimp, matched against 22
  regional styles.
- **[Cookbook Finder](https://sebcarss.github.io/food/cookbooks)** — search
  the cookbooks on my shelf ("moussaka", "pasta bake") and get the book and
  page. Exact titles come first; close matches and typos still show up.
- **[Dreaming of Noodles](https://dreamingofnoodles.com)** — my Japanese food blog.

Recipes save on the device (with a JSON backup/import on the Food page) and
share to Apple Notes as formatted text via the iOS share sheet.
