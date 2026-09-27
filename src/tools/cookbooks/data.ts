import { z } from "zod";
import { subDish, titleKey } from "../../../scripts/lib/cookbooks.mjs";

// One JSON file per book in ./books, written by `npm run add-recipes`,
// `npm run import-book` (scripts/) or by hand.
export const RecipeSchema = z.object({
  title: z.string().trim().min(1),
  page: z.number().int().positive(),
});
// One line of the book's printed index: "Salo 80, 117, 136" or the indented
// "Pork › salo 136" (term + sub). Dish names live in `recipes`, and "see"
// cross-references aren't kept.
export const IndexEntrySchema = z.object({
  term: z.string().trim().min(1),
  sub: z.string().trim().min(1).optional(),
  pages: z.array(z.number().int().positive()).min(1),
});
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
  /** As printed: "Salo", "Pork › salo". */
  label: string;
  /** Texts the query is matched against: "term sub" and "sub". */
  texts: string[];
  /** The dish the line points at (see toIndexRows). */
  title: string;
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

/**
 * Every page reference in every book's index, titled by the dish it points
 * at: the recipe its sub-entry names ("Pork › shoulder: American hot pizza
 * pie" 160), else the recipe starting on that page, else the dish the
 * sub-entry names ("Pork › shoulder: dim sum pork buns"), else the heading
 * itself ("Pork" 154, a page about pork).
 */
export function toIndexRows(books: Book[]): IndexRow[] {
  return books.flatMap((b) => {
    const named = new Map(b.recipes.map((r) => [`${titleKey(r.title)}|${r.page}`, r.title]));
    const starts = new Map(b.recipes.map((r) => [r.page, r.title]));
    return (b.index ?? []).flatMap((e) => {
      const label = e.sub ? `${e.term} › ${e.sub}` : e.term;
      const texts = e.sub ? [`${e.term} ${e.sub}`, e.sub] : [e.term];
      const dish = e.sub && subDish(e.sub);
      return [...new Set(e.pages)].map((page) => ({
        book: b.book,
        page,
        label,
        texts,
        title: (dish && (named.get(`${titleKey(e.sub!)}|${page}`) ?? named.get(`${titleKey(dish)}|${page}`))) || starts.get(page) || dish || e.term,
      }));
    });
  });
}

const files = import.meta.glob<{ default: unknown }>("./books/*.json", { eager: true });

export const BOOK_FILES: Record<string, unknown> = Object.fromEntries(Object.entries(files).map(([path, mod]) => [path, mod.default]));
export const BOOKS = parseBooks(BOOK_FILES);
export const ENTRIES = toEntries(BOOKS);
export const INDEX_ROWS = toIndexRows(BOOKS);
