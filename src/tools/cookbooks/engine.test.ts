import { describe, expect, it } from "vitest";
import { bookIndex, bookRecipes, bookSummaries, levenshtein, normalize, search, searchBooks, singular, stats } from "./engine";
import { RECIPE_SPAN, recipeAt, toEntries, toIndexRows, type Book, type Entry } from "./data";

const E = (title: string, book = "Book A", page = 1): Entry => ({ title, book, page });
const ENTRIES: Entry[] = [
  E("Pasta Bake", "Book A", 34),
  E("Chicken Pasta", "Book A", 36),
  E("Easy Pasta Bake", "Book B", 80),
  E("Baked Pasta with Ricotta", "Book B", 82),
  E("Moussaka", "Book C", 12),
  E("Vegetarian Moussaka", "Book A", 90),
  E("Gratin Dauphinois", "Book C", 58),
  E("Rice with Peas", "Book B", 10),
  E("Lamb with Mint", "Book B", 11),
  E("Lasagne", "Book C", 40),
  E("Mac & Cheese", "Book A", 70),
  E("Tomato Soup", "Book C", 5),
];
const titles = (q: string, opts?: { book?: string }) => search(q, ENTRIES, opts).map((m) => m.title);

describe("normalising", () => {
  it("ignores case, accents, punctuation and ampersands", () => {
    expect(normalize("  Crème Brûlée! ")).toBe("creme brulee");
    expect(normalize("Mac & Cheese")).toBe("mac and cheese");
  });
  it("singularises plurals without mangling -ss/-us words", () => {
    expect(singular("bakes")).toBe("bake");
    expect(singular("dishes")).toBe("dish");
    expect(singular("tomatoes")).toBe("tomato");
    expect(singular("berries")).toBe("berry");
    expect(singular("bass")).toBe("bass");
    expect(singular("hummus")).toBe("hummus");
    expect(singular("moussaka")).toBe("moussaka");
  });
  it("levenshtein", () => {
    expect(levenshtein("mousaka", "moussaka")).toBe(1);
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });
});

describe("search", () => {
  it("ranks an exact title first and marks it exact", () => {
    const r = search("Moussaka", ENTRIES);
    expect(r[0]).toMatchObject({ title: "Moussaka", book: "Book C", page: 12, kind: "exact" });
    expect(r[1]).toMatchObject({ title: "Vegetarian Moussaka", kind: "strong" });
  });

  it("pasta bake: exact, then containing, then every word, then partial", () => {
    const r = search("pasta bake", ENTRIES);
    expect(r.map((m) => m.title)).toEqual(["Pasta Bake", "Easy Pasta Bake", "Baked Pasta with Ricotta", "Chicken Pasta"]);
    expect(r.map((m) => m.kind)).toEqual(["exact", "strong", "strong", "partial"]);
    expect(r[0]!.score).toBeGreaterThan(r[1]!.score);
    expect(r[2]!.score).toBeGreaterThan(r[3]!.score);
  });

  it("is case, accent and punctuation insensitive", () => {
    expect(search("GRATIN dauphinois!", ENTRIES)[0]).toMatchObject({ title: "Gratin Dauphinois", kind: "exact" });
    expect(search("mac and cheese", ENTRIES)[0]).toMatchObject({ title: "Mac & Cheese", kind: "exact" });
  });

  it("tolerates plurals and typos", () => {
    expect(search("pasta bakes", ENTRIES)[0]).toMatchObject({ title: "Pasta Bake", kind: "exact" });
    expect(search("tomato soups", ENTRIES)[0]).toMatchObject({ title: "Tomato Soup", kind: "exact" });
    expect(titles("mousaka")).toEqual(["Moussaka", "Vegetarian Moussaka"]);
    expect(titles("lasagna")).toEqual(["Lasagne"]);
    expect(titles("gratin dauphinoise")[0]).toBe("Gratin Dauphinois");
  });

  it("matches word prefixes", () => {
    expect(titles("mouss")).toContain("Moussaka");
  });

  it("ignores filler words when matching words", () => {
    expect(titles("chicken with rice")).toEqual(["Chicken Pasta", "Rice with Peas"]);
    expect(titles("chicken with rice")).not.toContain("Lamb with Mint");
  });

  it("filters by book", () => {
    expect(titles("pasta", { book: "Book B" })).toEqual(["Easy Pasta Bake", "Baked Pasta with Ricotta"]);
  });

  it("returns nothing for empty or unmatched queries", () => {
    expect(search("", ENTRIES)).toEqual([]);
    expect(search("  !! ", ENTRIES)).toEqual([]);
    expect(search("sushi", ENTRIES)).toEqual([]);
  });

  it("short words don't fuzzy-match unrelated titles", () => {
    expect(titles("pie")).toEqual([]);
  });
});

describe("books", () => {
  const BOOKS = bookSummaries([
    E("Soup", "Salt, Fat, Acid, Heat"),
    E("Stew", "Ottolenghi Simple"),
    E("Salad", "Ottolenghi Simple"),
    E("Curry", "Ottolenghi Flavour"),
    E("Pie", "The Pie Book"),
  ]);

  it("counts recipes per book, A–Z", () => {
    expect(BOOKS).toEqual([
      { book: "Ottolenghi Flavour", recipes: 1 },
      { book: "Ottolenghi Simple", recipes: 2 },
      { book: "Salt, Fat, Acid, Heat", recipes: 1 },
      { book: "The Pie Book", recipes: 1 },
    ]);
    expect(stats(ENTRIES)).toEqual({ books: 3, recipes: ENTRIES.length });
  });

  it("finds books by name with the same tolerance as recipes", () => {
    const names = (q: string) => searchBooks(q, BOOKS).map((b) => b.book);
    expect(searchBooks("ottolenghi simple", BOOKS)[0]).toMatchObject({ book: "Ottolenghi Simple", kind: "exact", recipes: 2 });
    expect(names("ottolengi")).toEqual(["Ottolenghi Flavour", "Ottolenghi Simple"]);
    expect(names("SIMPLE")).toEqual(["Ottolenghi Simple"]);
    expect(names("salt fat")[0]).toBe("Salt, Fat, Acid, Heat");
    expect(names("pie book")).toEqual(["The Pie Book"]);
    expect(names("jamie")).toEqual([]);
    expect(names("  ")).toEqual([]);
  });

  it("lists one book's recipes in page order", () => {
    expect(bookRecipes(ENTRIES, "Book B").map((e) => `${e.page} ${e.title}`)).toEqual([
      "10 Rice with Peas",
      "11 Lamb with Mint",
      "80 Easy Pasta Bake",
      "82 Baked Pasta with Ricotta",
    ]);
    expect(bookRecipes(ENTRIES, "Nope")).toEqual([]);
  });
});

describe("book indexes", () => {
  const book: Book = {
    book: "Mamushka",
    recipes: [
      { title: "Aromatic roast pork loin", page: 135 },
      { title: "Ukrainian 'narcotics'", page: 136 },
      { title: "Garlicky white rabbit", page: 139 },
      { title: "Borscht", page: 78 },
    ],
    index: [
      { term: "Salo", pages: [80, 136] },
      { term: "Pork", sub: "salo", pages: [136] },
      { term: "Pork", sub: "roast loin", pages: [135] },
      { term: "Pork belly", see: "Salo" },
      { term: "Rabbit", pages: [139] },
      { term: "Preserving", pages: [5] },
    ],
  };
  const entries = toEntries([book]);
  const rows = toIndexRows([book]);
  const find = (q: string) => search(q, entries, { index: rows });

  it("joins an index page to the recipe it falls in, within a few pages", () => {
    expect(recipeAt(book.recipes, 136)?.title).toBe("Ukrainian 'narcotics'");
    expect(recipeAt(book.recipes, 138)?.title).toBe("Ukrainian 'narcotics'");
    expect(recipeAt(book.recipes, 80)?.title).toBe("Borscht");
    expect(recipeAt(book.recipes, 5)).toBeNull(); // before the first recipe
    expect(recipeAt(book.recipes, 139 + RECIPE_SPAN + 1)).toBeNull(); // too far past the last
  });

  it("finds a recipe by an index term its title doesn't mention", () => {
    const r = find("salo");
    expect(r.map((m) => `${m.title} p. ${m.page}`)).toEqual(["Borscht p. 80", "Ukrainian 'narcotics' p. 136"]);
    expect(r[1]).toMatchObject({ kind: "strong", via: "Salo" });
  });

  it("follows see references", () => {
    const strong = find("pork belly").filter((m) => m.kind !== "partial");
    expect(strong.map((m) => [m.title, m.page, m.via])).toEqual([
      ["Borscht", 80, "Pork belly → Salo"],
      ["Ukrainian 'narcotics'", 136, "Pork belly → Salo"],
    ]);
  });

  it("lists one recipe once when title and index both match, and ranks titles above index-only hits", () => {
    const r = find("pork");
    // "Pork belly → Salo" sends p. 80 (Borscht) too, as the printed index would.
    expect(r.map((m) => m.title)).toEqual(["Aromatic roast pork loin", "Borscht", "Ukrainian 'narcotics'"]);
    expect(r[0]!.via).toBeUndefined(); // the title match beat the index line
    expect(find("rabbit").filter((m) => m.title === "Garlicky white rabbit")).toHaveLength(1);
  });

  it("names a page with no recipe after its index line", () => {
    expect(find("preserving")).toEqual([expect.objectContaining({ title: "Preserving", page: 5, via: "Preserving" })]);
  });

  it("filters index hits by book too", () => {
    expect(search("salo", entries, { index: rows, book: "Other" })).toEqual([]);
  });

  it("groups a book's index like the printed one", () => {
    const groups = bookIndex([...book.index!, { term: "salo", pages: [117, 80] }]);
    expect(groups.map((g) => g.term)).toEqual(["Pork", "Pork belly", "Preserving", "Rabbit", "Salo"]);
    expect(groups[0]).toMatchObject({ pages: [], subs: [{ sub: "roast loin", pages: [135] }, { sub: "salo", pages: [136] }] });
    expect(groups[1]).toMatchObject({ pages: [], see: "Salo" });
    expect(groups[4]!.pages).toEqual([80, 117, 136]);
  });
});
