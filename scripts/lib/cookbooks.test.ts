import { describe, expect, it } from "vitest";
import { BookSchema } from "../../src/tools/cookbooks/data";
import {
  actionsUrl, addRecipe, isDuplicate, parseEntryLine, parsePage, removeRecipe, serializeBook, slugForNewBook, slugify, sortRecipes, validateBook,
} from "./cookbooks.mjs";

describe("parseEntryLine", () => {
  it("reads 'Title, page' and 'Title page' forms", () => {
    expect(parseEntryLine("Moussaka, 123")).toEqual({ kind: "recipe", title: "Moussaka", page: 123 });
    expect(parseEntryLine("  Pasta   Bake 45 ")).toEqual({ kind: "recipe", title: "Pasta Bake", page: 45 });
    expect(parseEntryLine("Pasta Bake - p. 45")).toEqual({ kind: "recipe", title: "Pasta Bake", page: 45 });
    expect(parseEntryLine("Pasta Bake; p45")).toEqual({ kind: "recipe", title: "Pasta Bake", page: 45 });
  });

  it("takes the last number as the page, so titles can contain numbers", () => {
    expect(parseEntryLine("5-Minute Noodles, 42")).toEqual({ kind: "recipe", title: "5-Minute Noodles", page: 42 });
    expect(parseEntryLine("Chicken 65, 112")).toEqual({ kind: "recipe", title: "Chicken 65", page: 112 });
  });

  it("returns a title alone when there's no page", () => {
    expect(parseEntryLine("Gratin Dauphinois")).toEqual({ kind: "recipe", title: "Gratin Dauphinois" });
    expect(parseEntryLine("5-Minute Noodles")).toEqual({ kind: "recipe", title: "5-Minute Noodles" });
  });

  it("recognises commands and blank lines", () => {
    expect(parseEntryLine("")).toBeNull();
    expect(parseEntryLine("   ")).toBeNull();
    expect(parseEntryLine("UNDO")).toEqual({ kind: "command", command: "undo" });
    expect(parseEntryLine("list")).toEqual({ kind: "command", command: "list" });
    expect(parseEntryLine("quit")).toEqual({ kind: "command", command: "quit" });
  });

  it("rejects page 0 and a bare number", () => {
    expect(parseEntryLine("Soup, 0")).toMatchObject({ kind: "error" });
    expect(parseEntryLine("123")).toMatchObject({ kind: "error" });
  });
});

describe("parsePage", () => {
  it("accepts positive whole numbers", () => {
    expect(parsePage("12")).toBe(12);
    expect(parsePage(" p. 7 ")).toBe(7);
    expect(parsePage("0")).toBeNull();
    expect(parsePage("-3")).toBeNull();
    expect(parsePage("1.5")).toBeNull();
    expect(parsePage("twelve")).toBeNull();
  });
});

describe("book editing", () => {
  const book = { book: "Test", recipes: [{ title: "Stew", page: 20 }] };

  it("slugifies book names into file names", () => {
    expect(slugify("Ottolenghi SIMPLE")).toBe("ottolenghi-simple");
    expect(slugify("Salt, Fat, Acid, Heat")).toBe("salt-fat-acid-heat");
    expect(slugify("Jamie's 30-Minute Meals")).toBe("jamie-s-30-minute-meals");
    expect(slugify("Rick Stein: Mediterranean & Crème")).toBe("rick-stein-mediterranean-and-creme");
    expect(slugForNewBook("Test", ["test", "test-2"])).toBe("test-3");
    expect(slugForNewBook("!!!", [])).toBe("book");
  });

  it("adds in page order and spots duplicates ignoring case and punctuation", () => {
    const b = addRecipe(addRecipe(book, { title: "Soup", page: 3 }), { title: "Bread", page: 20 });
    expect(b.recipes).toEqual([
      { title: "Soup", page: 3 },
      { title: "Bread", page: 20 },
      { title: "Stew", page: 20 },
    ]);
    expect(isDuplicate(b, { title: "stew!", page: 20 })).toBe(true);
    expect(isDuplicate(b, { title: "Stew", page: 21 })).toBe(false);
    expect(book.recipes).toHaveLength(1); // not mutated
  });

  it("removes one recipe for undo", () => {
    const b = addRecipe(book, { title: "Soup", page: 3 });
    expect(removeRecipe(b, { title: "Soup", page: 3 })).toEqual(book);
    expect(removeRecipe(b, { title: "Nope", page: 3 })).toBe(b);
  });

  it("sorts by page then title", () => {
    expect(sortRecipes([{ title: "B", page: 2 }, { title: "A", page: 2 }, { title: "Z", page: 1 }]).map((r) => r.title)).toEqual(["Z", "A", "B"]);
  });

  it("serialises one recipe per line and round-trips through the site's schema", () => {
    const b = addRecipe(book, { title: 'Nan\'s "Best" Soup', page: 3 });
    const text = serializeBook(b);
    expect(text).toBe(`{
  "book": "Test",
  "recipes": [
    { "title": "Nan's \\"Best\\" Soup", "page": 3 },
    { "title": "Stew", "page": 20 }
  ]
}
`);
    expect(BookSchema.parse(JSON.parse(text))).toEqual(b);
    expect(serializeBook({ book: "Empty", recipes: [] })).toBe(`{\n  "book": "Empty",\n  "recipes": []\n}\n`);
  });

  it("validates book files", () => {
    expect(validateBook(book)).toEqual([]);
    expect(validateBook(null)).toEqual(["not a JSON object"]);
    expect(validateBook({ book: "", recipes: [{ title: "x", page: 0 }] })).toHaveLength(2);
    expect(validateBook({ book: "X" })).toEqual(['"recipes" must be an array']);
  });
});

describe("actionsUrl", () => {
  it("handles ssh and https remotes", () => {
    expect(actionsUrl("git@github.com:sebcarss/sebcarss.github.io.git")).toBe("https://github.com/sebcarss/sebcarss.github.io/actions");
    expect(actionsUrl("https://github.com/sebcarss/sebcarss.github.io")).toBe("https://github.com/sebcarss/sebcarss.github.io/actions");
    expect(actionsUrl("https://gitlab.com/x/y.git")).toBeNull();
  });
});
