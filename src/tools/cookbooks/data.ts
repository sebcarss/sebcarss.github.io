import { z } from "zod";
import { resolveSee, titleKey } from "../../../scripts/lib/cookbooks.mjs";

// One JSON file per book in ./books, written by `npm run add-recipes`,
// `npm run import-book` (scripts/) or by hand.
export const RecipeSchema = z.object({
  title: z.string().trim().min(1),
  page: z.number().int().positive(),
});
// One line of the book's printed index: "Salo 80, 117, 136", the indented
// "Pork › salo 136" (term + sub) or "Pork belly, see Salo".
export const IndexEntrySchema = z
  .object({
    term: z.string().trim().min(1),
    sub: z.string().trim().min(1).optional(),
    pages: z.array(z.number().int().positive()).optional(),
    see: z.string().trim().min(1).optional(),
  })
  .refine((e) => (e.pages?.length ?? 0) > 0 || e.see, { message: "an index entry needs pages or see" });
export const BookSchema = z.object({
  book: z.string().trim().min(1),
  recipes: z.array(RecipeSchema),
  index: z.array(IndexEntrySchema).optional(),
});
export type Recipe = z.infer<typeof RecipeSchema>;
export type IndexEntry = z.infer<typeof IndexEntrySchema>;
export type Book = z.infer<typeof BookSchema>;

/** One searchable row: a recipe and where to find it. */
export interface Entry {
  title: string;
  book: string;
  page: number;
}

/** One page reference from a book's index, joined to the recipe on that page. */
export interface IndexRow {
  book: string;
  page: number;
  /** As printed: "Salo", "Pork › salo", "Pork belly → Salo". */
  label: string;
  /** Texts the query is matched against: "term sub" and "sub". */
  texts: string[];
  /** The recipe the page falls in, or null (an intro page, say). */
  title: string | null;
}

// Parse leniently: a malformed file is skipped with a warning rather than
// taking the whole page down. data.test.ts fails CI on it before deploy.
export function parseBooks(files: Record<string, unknown>): Book[] {
  return Object.entries(files).flatMap(([path, json]) => {
    const r = BookSchema.safeParse(json);
    if (r.success) return [r.data];
    console.warn(`cookbooks: skipping invalid book ${path}`, r.error.issues[0]);
    return [];
  });
}

export const toEntries = (books: Book[]): Entry[] =>
  books.flatMap((b) => b.recipes.map((r) => ({ title: r.title, book: b.book, page: r.page })));

/** How far past a recipe's first page an index page still counts as that recipe. */
export const RECIPE_SPAN = 5;

/** The recipe a page falls in: the last one starting on or before it, within RECIPE_SPAN pages. */
export function recipeAt(recipes: readonly Recipe[], page: number): Recipe | null {
  let best: Recipe | null = null;
  for (const r of recipes) if (r.page <= page && (!best || r.page > best.page)) best = r;
  return best && page - best.page <= RECIPE_SPAN ? best : null;
}

/**
 * Every page reference in every book's index; "see" entries take their
 * targets' pages (resolveSee, shared with the import script, reads lists).
 */
export function toIndexRows(books: Book[]): IndexRow[] {
  return books.flatMap((b) => {
    const index = b.index ?? [];
    const terms = index.map((e) => e.term);
    const ownPages = (term: string) => {
      const same = index.filter((e) => titleKey(e.term) === titleKey(term));
      const own = same.filter((e) => !e.sub).flatMap((e) => e.pages ?? []);
      return own.length ? own : same.flatMap((e) => e.pages ?? []);
    };
    return index.flatMap((e) => {
      const heading = e.sub ? `${e.term} › ${e.sub}` : e.term;
      const texts = e.sub ? [`${e.term} ${e.sub}`, e.sub] : [e.term];
      const pages = e.pages?.length ? e.pages : resolveSee(e.see!, terms).flatMap(ownPages);
      const label = e.pages?.length || !e.see ? heading : `${heading} → ${e.see}`;
      return [...new Set(pages)].map((page) => ({ book: b.book, page, label, texts, title: recipeAt(b.recipes, page)?.title ?? null }));
    });
  });
}

const files = import.meta.glob<{ default: unknown }>("./books/*.json", { eager: true });

export const BOOK_FILES: Record<string, unknown> = Object.fromEntries(Object.entries(files).map(([path, mod]) => [path, mod.default]));
export const BOOKS = parseBooks(BOOK_FILES);
export const ENTRIES = toEntries(BOOKS);
export const INDEX_ROWS = toIndexRows(BOOKS);
