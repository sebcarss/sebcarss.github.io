# Importing a cookbook from photos

The Cookbook Finder searches each book's recipe titles and its printed index.
Searching "American hot pizza pie" lists that recipe first, under
**Recipes**. Searching an ingredient such as "pork" lists recipes named after
it first, then every dish the indexes file under it, under **By ingredient**,
for ideas. To add a book without typing it in, photograph its pages, have an
AI transcribe them with the prompt below, and import the result.

## 1. Photograph the pages

- Photograph the **contents / recipe list** pages (these give the recipe titles)
  and the **index** pages. If a book has no recipe list, the index alone works.
- Take one page per photo. Keep the page flat and evenly lit, and keep the
  page edges and the column tops in shot.

## 2. Transcribe them

**In the Claude app (or any AI chat):** start a new chat. Paste the prompt
below, replace `<BOOK TITLE>` with the title exactly as it appears in the app
(e.g. `Mamushka`), and attach **2–4 photos**. For the next batch, send
"Same again for these pages" with the next photos. Smaller batches mean
fewer skipped lines.

**Or in Claude Code:** put the photos in `photos/<book>/` (git-ignored) and
ask: *"Import photos/mamushka into the Cookbook Finder using
docs/cookbook-import-prompt.md."* Claude reads the photos, runs
`npm run import-book` and `npm test`, and shows you the diff.

## 3. Import

```
npm run import-book                      # paste the JSON block, it's read when complete
npm run import-book -- mamushka.json     # or from a saved file
npm run import-book -- --no-git          # save the file without committing
```

The script merges into the book with the same name, or creates it. Recipes
and index lines that are already there aren't duplicated, so you can import a
book a batch at a time or re-import a page safely. Along the way it:

- drops any "see" / "see also" cross-references;
- splits a "pizza: American hot pizza pie" line into heading and sub-entry;
- moves a dish the AI left in the index into the recipes. That's a heading
  that is also listed under its ingredients on the same page. It leaves
  categories (headings with sub-entries of their own) and glossary pages
  alone.

It prints what's new and anything worth checking: entries the AI marked `[?]`
and pages past the last recipe. Then it offers to commit and push. Fix anything flagged by editing `src/tools/cookbooks/books/<book>.json`.

Spot-check a few page numbers against the book. The tests catch bad
formatting, but they can't catch a 136 misread as 186.

## The prompt

````text
I'm attaching photos of pages from the cookbook "<BOOK TITLE>". They are
either CONTENTS / recipe-list pages or INDEX pages. Transcribe them into
ONE JSON object in exactly this format, and output only the JSON in a
single ```json code block:

{
  "book": "<BOOK TITLE>",
  "recipes": [ { "title": "Recipe name", "page": 123 } ],
  "index":   [ { "term": "Heading", "pages": [12, 40] },
               { "term": "Heading", "sub": "Sub-entry", "pages": [12] } ]
}

Rules
- Transcribe exactly what is printed. Do not invent, correct, translate,
  merge or reorder entries, and do not add entries that aren't on the page.
- "recipes" lists the dishes: one object per recipe, title as printed (keep
  capitalisation, accents, quotes), page as a whole number.
  - From contents / recipe-list pages: every recipe. Skip chapter headings
    and non-recipe sections (introduction, acknowledgements).
  - From index pages: a main heading that is the name of a dish goes in
    "recipes" INSTEAD of "index", with its first page. A dish is something
    you'd cook, like "American hot pizza pie 160" or "Banana katsu 176".
    Ingredients, dish types and topics ("Pork 154", "Pies", "Equipment",
    "Kneading") are not dishes; they stay in "index". If unsure, keep it
    in "index".
  - If there are no recipes on these pages, use [].
- "index" comes only from index pages. If there are no index pages, use [].
  One object per line with a page number:
  - A main heading with its own pages → { "term": "Salo", "pages": [80, 117, 136] }
  - An indented sub-entry → repeat its heading as "term" and put the
    sub-entry text in "sub": { "term": "Pork", "sub": "salo", "pages": [136] }.
    Keep every sub-entry, even when it's a dish that is also in "recipes":
    "Cheese › American hot pizza pie 160" is how an ingredient search finds it.
  - A sub-entry that continues from a previous column or page ("Pork
    (cont.)") uses the same heading without "(cont.)".
  - A heading printed on one line with its only sub-entry ("pizza: American
    hot pizza pie 160") → { "term": "pizza", "sub": "American hot pizza pie", "pages": [160] }
  - A heading with no pages of its own and only sub-entries gets no object
    of its own.
  - Leave out "see X" and "see also X" cross-references. A "see" line with
    no pages of its own gets no object. A "see also" line keeps its own pages
    only: "Fish 216, see also seafood" → { "term": "Fish", "pages": [216] }.
- Page numbers: integers only. A range such as "136–7" or "136-138" → the first
  page (136). Ignore bold/italic styling, but keep any words.
- Read two-column pages column by column: left column top to bottom, then
  the right.
- If a page number or word is unreadable, still include the entry, append
  " [?]" to the text and use your best reading of the number.
- After the code block, list in one line any entries marked [?] and the
  first and last index entry you transcribed, so I can check nothing was
  skipped.

If I send more photos of the same book later, output a new JSON object for
just those pages, in the same format.
````

## The format

This is what the app reads (`src/tools/cookbooks/books/*.json`, checked by
`BookSchema` in `src/tools/cookbooks/data.ts`):

| Field | Meaning |
| --- | --- |
| `book` | The book's name, the same in every import for that book |
| `recipes[].title`, `.page` | A dish and its first page, from the contents or from the index |
| `index[].term` | An index heading: an ingredient, dish type or topic, e.g. `Pork` |
| `index[].sub` | Optional indented sub-entry, e.g. `salo` or `shoulder: American hot pizza pie` |
| `index[].pages` | Page numbers (first page of a range); required |

There is no `see` field. Cross-references only point at headings that are
already there, and searching them listed the same recipes again.

A search lists matching recipe titles under **Recipes**. Below them, under
**By ingredient**, come the index lines that match every word of the search,
leaving out recipes already listed. Each one is titled by the dish it points at:

1. the recipe its sub-entry names;
2. else the recipe starting on that page;
3. else the dish its sub-entry names;
4. else the heading itself.

It shows "Ukrainian 'narcotics' · p. 136" with "Index: Pork › salo"
underneath.
