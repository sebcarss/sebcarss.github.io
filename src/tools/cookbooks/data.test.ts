import { describe, expect, it, vi } from "vitest";
import { BOOK_FILES, BookSchema, parseBooks, toEntries } from "./data";
import { titleKey } from "../../../scripts/lib/cookbooks.mjs";

// Guards the deploy: CI runs these, so a bad hand-edit never reaches the site.
describe("book files", () => {
  const files = Object.entries(BOOK_FILES);

  it.each(files)("%s is a valid book", (_path, json) => {
    const r = BookSchema.safeParse(json);
    expect(r.success, r.success ? "" : JSON.stringify(r.error.issues[0])).toBe(true);
  });

  it.each(files)("%s has no duplicate recipe on the same page", (_path, json) => {
    const book = BookSchema.parse(json);
    const keys = book.recipes.map((r) => `${r.page}|${titleKey(r.title)}`);
    expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
  });

  it.each(files)("%s index: no repeated line, and no heading that is just a recipe on that page", (_path, json) => {
    const book = BookSchema.parse(json);
    const index = book.index ?? [];
    const keys = index.map((e) => `${titleKey(e.term)}|${titleKey(e.sub ?? "")}`);
    expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
    // Dish names belong in "recipes"; left in the index too they'd show twice.
    const recipes = new Set(book.recipes.map((r) => `${titleKey(r.title)}|${r.page}`));
    expect(index.filter((e) => !e.sub && e.pages.some((p) => recipes.has(`${titleKey(e.term)}|${p}`))).map((e) => e.term)).toEqual([]);
  });

  it("book names are unique", () => {
    const names = files.map(([, json]) => BookSchema.parse(json).book.trim().toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("parseBooks", () => {
  it("skips an invalid book with a warning and keeps the rest", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const books = parseBooks({
      "./good.json": { book: "Good", recipes: [{ title: "Soup", page: 3 }] },
      "./bad.json": { book: "Bad", recipes: [{ title: "Stew", page: 0 }] },
    });
    expect(books.map((b) => b.book)).toEqual(["Good"]);
    expect(warn).toHaveBeenCalledOnce();
    expect(toEntries(books)).toEqual([{ title: "Soup", book: "Good", page: 3 }]);
    warn.mockRestore();
  });

  it("accepts an index and rejects a line without pages", () => {
    const ok = { book: "B", recipes: [], index: [{ term: "Salo", pages: [3] }, { term: "Pork", sub: "salo", pages: [3] }] };
    expect(BookSchema.safeParse(ok).success).toBe(true);
    expect(BookSchema.safeParse({ ...ok, index: [{ term: "Salo" }] }).success).toBe(false);
    expect(BookSchema.safeParse({ ...ok, index: [{ term: "Pork belly", see: "Salo" }] }).success).toBe(false);
    expect(BookSchema.safeParse({ ...ok, index: [{ term: "Salo", pages: [] }] }).success).toBe(false);
    expect(BookSchema.safeParse({ ...ok, index: [{ term: "Salo", pages: [0] }] }).success).toBe(false);
  });
});
