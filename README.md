# sebcarss.github.io

Personal homepage and small utilities, served from
[sebcarss.github.io](https://sebcarss.github.io).

The food calculators are a Vite + React + TypeScript app that installs as a
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
```

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
  pages/                  Home, Food (+ backup), NotFound
  styles/                 global.css (tokens, light + dark) and tools.css
public/
  music/**                Tab Caster and Scale Charts — untouched static pages
  styles.css              Stylesheet the static music pages link to
  icons/                  PWA icons
scripts/postbuild.mjs     Writes an index.html per route and 404.html into dist/
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
- **[Dreaming of Noodles](https://dreamingofnoodles.com)** — my Japanese food blog.

Recipes save on the device (with a JSON backup/import on the Food page) and
share to Apple Notes as formatted text via the iOS share sheet.
