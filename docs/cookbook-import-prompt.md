# Importing a cookbook from photos

The Cookbook Finder searches each book's recipe titles and its printed index,
so "salo" or "pork belly" finds *Ukrainian 'narcotics'* on p. 136. To add a
book without typing it in, photograph its pages, have an AI transcribe them
with the prompt below, and import the result.

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
book a batch at a time or re-import a page safely. It prints what's new and
anything worth checking: entries the AI marked `[?]`, pages past the last
recipe, and "see" references that point at nothing. Then it offers to commit
and push. Fix anything flagged by editing `src/tools/cookbooks/books/<book>.json`.

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
  "index":   [ { "term": "Heading", "sub": "Sub-entry", "pages": [12, 40] },
               { "term": "Heading", "see": "Other heading" } ]
}

Rules
- Transcribe exactly what is printed. Do not invent, correct, translate,
  merge or reorder entries, and do not add entries that aren't on the page.
- "recipes" comes only from contents / recipe-list pages: one object per
  recipe, title as printed (keep capitalisation, accents, quotes), page as a
  whole number. Skip chapter headings and non-recipe sections (introduction,
  acknowledgements). If there are no contents pages, use [].
- "index" comes only from index pages. If there are no index pages, use [].
  One object per line with a page number:
  - A main heading with its own pages → { "term": "Salo", "pages": [80, 117, 136] }
  - An indented sub-entry → repeat its heading as "term" and put the
    sub-entry text in "sub": { "term": "Pork", "sub": "salo", "pages": [136] }
  - A sub-entry that continues from a previous column or page ("Pork
    (cont.)") uses the same heading without "(cont.)".
  - A heading with no pages of its own and only sub-entries gets no object
    of its own.
  - "see X" → { "term": "...", "see": "X" } (no "pages").
    "see also X" → keep "pages" and add "see": "X".
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
| `recipes[].title`, `.page` | A recipe and its first page |
| `index[].term` | An index heading, e.g. `Pork` |
| `index[].sub` | Optional indented sub-entry, e.g. `salo` |
| `index[].pages` | Page numbers (first page of a range) |
| `index[].see` | Optional cross-reference; an entry needs `pages`, `see` or both |

The app matches each index page to the recipe that starts on it or up to 5
pages before it. A search then shows "Ukrainian 'narcotics' · p. 136" with
"Index: Pork › salo" underneath.
