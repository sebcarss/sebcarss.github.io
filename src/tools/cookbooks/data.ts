import { z } from "zod";

// One JSON file per book in ./books, written by `npm run add-recipes`
// (scripts/add-recipes.mjs) or by hand.
export const RecipeSchema = z.object({
  title: z.string().trim().min(1),
  page: z.number().int().positive(),
});
export const BookSchema = z.object({
  book: z.string().trim().min(1),
  recipes: z.array(RecipeSchema),
});
export type Book = z.infer<typeof BookSchema>;

/** One searchable row: a recipe and where to find it. */
export interface Entry {
  title: string;
  book: string;
  page: number;
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

const files = import.meta.glob<{ default: unknown }>("./books/*.json", { eager: true });

export const BOOK_FILES: Record<string, unknown> = Object.fromEntries(Object.entries(files).map(([path, mod]) => [path, mod.default]));
export const BOOKS = parseBooks(BOOK_FILES);
export const ENTRIES = toEntries(BOOKS);
