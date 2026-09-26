import { describe, expect, it } from "vitest";
import { BookSchema } from "../../src/tools/cookbooks/data";
import {
  actionsUrl, addRecipe, checkBook, cleanBook, isDuplicate, mergeBook, parseEntryLine, parseImport, parsePage, removeRecipe, resolveSee, serializeBook,
  slugForNewBook, slugify, sortRecipes, validateBook,
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

describe("book indexes and imports", () => {
  const book = {
    book: "Mamushka",
    recipes: [{ title: "Ukrainian 'narcotics'", page: 136 }],
    index: [
      { term: "Salo", pages: [80, 136] },
      { term: "Pork", sub: "salo", pages: [136] },
      { term: "Pork belly", see: "Salo" },
    ],
  };

  it("serialises one index line per line, sorted, and round-trips through the site's schema", () => {
    const text = serializeBook(book);
    expect(text).toBe(`{
  "book": "Mamushka",
  "recipes": [
    { "title": "Ukrainian 'narcotics'", "page": 136 }
  ],
  "index": [
    { "term": "Pork", "sub": "salo", "pages": [136] },
    { "term": "Pork belly", "see": "Salo" },
    { "term": "Salo", "pages": [80, 136] }
  ]
}
`);
    expect(BookSchema.parse(JSON.parse(text))).toEqual({ ...book, index: expect.arrayContaining(book.index) });
  });

  it("keeps the index when add-recipes adds or removes a recipe", () => {
    const b = addRecipe(book, { title: "Soup", page: 3 });
    expect(b.index).toBe(book.index);
    expect(removeRecipe(b, { title: "Soup", page: 3 }).index).toBe(book.index);
  });

  it("validates index lines", () => {
    expect(validateBook(book)).toEqual([]);
    expect(validateBook({ ...book, index: "x" })).toEqual(['"index" must be an array']);
    expect(validateBook({ ...book, index: [{ term: "Salo" }] })).toEqual(['index entry 1 (Salo): needs pages or "see"']);
    expect(validateBook({ ...book, index: [{ term: "", pages: [1.5] }] })).toHaveLength(2);
  });

  it("tidies an import: spaces, page order and duplicates", () => {
    expect(cleanBook({ book: " Mamushka ", recipes: [{ title: "Beef  stew ", page: 4 }], index: [{ term: "Salo ", pages: [136, 80, 136] }, { term: "X", pages: [], see: "Salo" }] })).toEqual({
      book: "Mamushka",
      recipes: [{ title: "Beef stew", page: 4 }],
      index: [{ term: "Salo", pages: [80, 136] }, { term: "X", see: "Salo" }],
    });
  });

  it("merges an import without duplicating, unioning an index line's pages", () => {
    const incoming = {
      book: "Mamushka",
      recipes: [{ title: "ukrainian 'narcotics'", page: 136 }, { title: "Borscht", page: 12 }],
      index: [{ term: "salo", pages: [117] }, { term: "Pork", sub: "salo", pages: [136] }, { term: "Beetroot", pages: [12] }],
    };
    const { book: merged, recipes, index } = mergeBook(book, incoming);
    expect(recipes).toBe(1);
    expect(index).toBe(2); // Salo gained p. 117, Beetroot is new
    expect(merged.recipes.map((r) => r.title)).toEqual(["Borscht", "Ukrainian 'narcotics'"]);
    expect(merged.index).toContainEqual({ term: "Salo", pages: [80, 117, 136] });
    expect(merged.index).toHaveLength(4);
    expect(mergeBook(merged, incoming)).toMatchObject({ recipes: 0, index: 0 }); // importing twice is a no-op
    expect(mergeBook({ book: "New", recipes: [] }, { book: "New", recipes: [] }).book).not.toHaveProperty("index");
  });

  it("resolves see lists and headings named by their start", () => {
    const terms = ["butter beans, pot-roast pheasant with", "white beans", "blue cheese", "goat's cheese", "dried fruit", "apples", "stews and casseroles", "smoked haddock, scrambled eggs with"];
    expect(resolveSee("butter beans, white beans etc", terms)).toEqual(["butter beans, pot-roast pheasant with", "white beans"]);
    expect(resolveSee("blue cheese; goat's cheese", terms)).toEqual(["blue cheese", "goat's cheese"]);
    expect(resolveSee("dried fruit and apples, strawberries etc", terms)).toEqual(["dried fruit", "apples"]);
    expect(resolveSee("stews and casseroles", terms)).toEqual(["stews and casseroles"]);
    expect(resolveSee("smoked haddock", terms)).toEqual(["smoked haddock, scrambled eggs with"]);
    expect(resolveSee("basil", terms)).toEqual([]);
  });

  it("flags likely misreadings", () => {
    const warnings = checkBook({ ...book, index: [...book.index, { term: "Beef [?]", pages: [960] }, { term: "Lamb", see: "Mutton" }] });
    expect(warnings).toHaveLength(3);
    expect(warnings.join("\n")).toMatch(/p\. 960 is after the last recipe/);
    expect(warnings.join("\n")).toMatch(/"Mutton", which matches no heading/);
    expect(warnings.join("\n")).toMatch(/unreadable/);
    expect(checkBook(book)).toEqual([]);
  });

  it("reads JSON pasted from an AI chat, fence and chatter included", () => {
    expect(parseImport('Here it is:\n```json\n{ "book": "B", "recipes": [] }\n```\nFirst: Apple')).toEqual({ book: "B", recipes: [] });
    expect(() => parseImport("no json here")).toThrow(/No JSON object/);
  });
});

describe("actionsUrl", () => {
  it("handles ssh and https remotes", () => {
    expect(actionsUrl("git@github.com:sebcarss/sebcarss.github.io.git")).toBe("https://github.com/sebcarss/sebcarss.github.io/actions");
    expect(actionsUrl("https://github.com/sebcarss/sebcarss.github.io")).toBe("https://github.com/sebcarss/sebcarss.github.io/actions");
    expect(actionsUrl("https://gitlab.com/x/y.git")).toBeNull();
  });
});
