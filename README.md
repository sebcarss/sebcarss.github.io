# sebcarss.github.io

Personal homepage and small utilities, served from
[sebcarss.github.io](https://sebcarss.github.io).

Plain static HTML/CSS — no build step. Push to `master` and GitHub Pages serves
the tree as-is (`.nojekyll`).

## Structure

```
index.html                    Homepage
styles.css                    Shared styles
404.html                      Not-found page
music/index.html              Music category page
music/tab-caster/index.html   Tab Caster utility (self-contained)
music/scale-charts/index.html Scale Charts utility (self-contained)
food/index.html               Food category page
food/ice-cream-calculator/index.html   Ice Cream Calculator utility (self-contained)
food/bakers-percentage/index.html      Baker's Percentage Calculator utility (self-contained)
```

## Music

- **[Tab Caster](https://sebcarss.github.io/music/tab-caster)** — turn an
  Ultimate Guitar PDF into a single-screen tab you can cast to a TV.
- **[Scale Charts](https://sebcarss.github.io/music/scale-charts)** — the notes
  and chords for every scale degree in every key, with chord progressions
  highlighted, sized to fill a TV.

## Food

- **[Ice Cream Calculator](https://sebcarss.github.io/food/ice-cream-calculator)** —
  balance fat, sugar and MSNF (plus POD/PAC) against ice cream and gelato
  targets to develop new recipes.
- **[Baker's Percentage Calculator](https://sebcarss.github.io/food/bakers-percentage)** —
  bread doughs in baker's percentages, with hydration/salt/yeast guidance and
  poolish, biga and levain preferments.
- **[Dreaming of Noodles](https://dreamingofnoodles.com)** — my Japanese food blog.

## Adding a new utility

1. Drop the self-contained app at `<category>/<name>/index.html`.
2. Add a `.card` link on `index.html` (and the category page).
3. If it's a new category, add a nav link and, optionally, a `<category>/index.html`.

## Running and testing locally

There's no build step, so any static file server works. From the repo root:

```
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in a browser. Pages
link with absolute paths (e.g. `/food/`), so serve from the repo root rather
than opening the HTML files directly via `file://`.
