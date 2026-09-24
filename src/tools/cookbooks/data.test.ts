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
});
