import { describe, expect, it } from "vitest";
import { bookIndex, bookRecipes, bookSummaries, levenshtein, normalize, search, searchBooks, singular, stats, type Match } from "./engine";
import { toEntries, toIndexRows, type Book, type Entry } from "./data";

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
const titles = (q: string, opts?: { book?: string }) => search(q, ENTRIES, opts).recipes.map((m) => m.title);

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
    const r = search("Moussaka", ENTRIES).recipes;
    expect(r[0]).toMatchObject({ title: "Moussaka", book: "Book C", page: 12, kind: "exact" });
    expect(r[1]).toMatchObject({ title: "Vegetarian Moussaka", kind: "strong" });
  });

  it("pasta bake: exact, then containing, then every word, then partial", () => {
    const r = search("pasta bake", ENTRIES).recipes;
    expect(r.map((m) => m.title)).toEqual(["Pasta Bake", "Easy Pasta Bake", "Baked Pasta with Ricotta", "Chicken Pasta"]);
    expect(r.map((m) => m.kind)).toEqual(["exact", "strong", "strong", "partial"]);
    expect(r[0]!.score).toBeGreaterThan(r[1]!.score);
    expect(r[2]!.score).toBeGreaterThan(r[3]!.score);
  });

  it("is case, accent and punctuation insensitive", () => {
    expect(search("GRATIN dauphinois!", ENTRIES).recipes[0]).toMatchObject({ title: "Gratin Dauphinois", kind: "exact" });
    expect(search("mac and cheese", ENTRIES).recipes[0]).toMatchObject({ title: "Mac & Cheese", kind: "exact" });
  });

  it("tolerates plurals and typos", () => {
    expect(search("pasta bakes", ENTRIES).recipes[0]).toMatchObject({ title: "Pasta Bake", kind: "exact" });
    expect(search("tomato soups", ENTRIES).recipes[0]).toMatchObject({ title: "Tomato Soup", kind: "exact" });
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
    expect(search("", ENTRIES).recipes).toEqual([]);
    expect(search("  !! ", ENTRIES).recipes).toEqual([]);
    expect(search("sushi", ENTRIES).recipes).toEqual([]);
  });

  it("short words don't fuzzy-match unrelated titles", () => {
    expect(titles("pie")).toEqual([]);
  });
});

describe("books", () => {
  const r = (title: string) => ({ title, page: 1 });
  const BOOKS = bookSummaries([
    { book: "Salt, Fat, Acid, Heat", recipes: [r("Soup")] },
    { book: "Ottolenghi Simple", recipes: [r("Stew"), r("Salad")] },
    { book: "Ottolenghi Flavour", recipes: [r("Curry")] },
    { book: "The Pie Book", recipes: [r("Pie")] },
    { book: "River Cottage Every Day", recipes: [], index: [{ term: "Salo", pages: [3] }, { term: "Pork", sub: "salo", pages: [3] }] },
  ]);

  it("counts recipes and index lines per book, A–Z, including a book with only an index", () => {
    expect(BOOKS).toEqual([
      { book: "Ottolenghi Flavour", recipes: 1, index: 0 },
      { book: "Ottolenghi Simple", recipes: 2, index: 0 },
      { book: "River Cottage Every Day", recipes: 0, index: 2 },
      { book: "Salt, Fat, Acid, Heat", recipes: 1, index: 0 },
      { book: "The Pie Book", recipes: 1, index: 0 },
    ]);
    expect(stats(ENTRIES)).toEqual({ books: 3, recipes: ENTRIES.length });
  });

  it("finds books by name with the same tolerance as recipes", () => {
    const names = (q: string) => searchBooks(q, BOOKS).map((b) => b.book);
    expect(searchBooks("ottolenghi simple", BOOKS)[0]).toMatchObject({ book: "Ottolenghi Simple", kind: "exact", recipes: 2 });
    expect(names("river cottage")).toEqual(["River Cottage Every Day"]);
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
      { title: "American hot pizza pie", page: 160 },
    ],
    index: [
      { term: "Salo", pages: [80, 136] },
      { term: "Pork", sub: "salo", pages: [136] },
      { term: "Pork", sub: "roast loin", pages: [135] },
      { term: "Pork", sub: "shoulder: American hot pizza pie", pages: [160] },
      { term: "Cheese", sub: "American hot pizza pie", pages: [160] },
      { term: "Pizza", sub: "American hot pizza pie", pages: [160] },
      { term: "Pork", sub: "buns: dim sum pork buns", pages: [164] },
      { term: "Rabbit", pages: [139] },
      { term: "Preserving", pages: [5] },
    ],
  };
  const entries = toEntries([book]);
  const rows = toIndexRows([book]);
  const find = (q: string) => search(q, entries, { index: rows });
  const show = (ms: Match[]) => ms.map((m) => `${m.title} p. ${m.page}`);

  it("titles an index line by the dish it points at", () => {
    const title = (label: string, page: number) => rows.find((r) => r.label === label && r.page === page)?.title;
    expect(title("Pork › shoulder: American hot pizza pie", 160)).toBe("American hot pizza pie"); // the recipe its sub names
    expect(title("Salo", 136)).toBe("Ukrainian 'narcotics'"); // the recipe starting on that page
    expect(title("Pork › buns: dim sum pork buns", 164)).toBe("dim sum pork buns"); // not a recipe, and not the one on p. 160
    expect(title("Salo", 80)).toBe("Salo"); // a page about salo
  });

  it("finds a recipe by an index term its title doesn't mention, as an ingredient match", () => {
    const r = find("salo");
    expect(r.recipes).toEqual([]);
    expect(show(r.index)).toEqual(["Salo p. 80", "Ukrainian 'narcotics' p. 136"]);
    expect(r.index[1]).toMatchObject({ kind: "strong", via: "Salo" });
  });

  it("keeps recipes and ingredient matches apart, listing a recipe once", () => {
    const pizza = find("pizza");
    expect(show(pizza.recipes)).toEqual(["American hot pizza pie p. 160"]);
    expect(pizza.index).toEqual([]); // "Pizza › American hot pizza pie" is the same recipe
    const pork = find("pork");
    expect(show(pork.recipes)).toEqual(["Aromatic roast pork loin p. 135"]);
    expect(show(pork.index)).toEqual(["Ukrainian 'narcotics' p. 136", "dim sum pork buns p. 164", "American hot pizza pie p. 160"]); // closer lines first
    expect(find("cheese").index.map((m) => m.via)).toEqual(["Cheese › American hot pizza pie"]);
  });

  it("only lists index lines that match every word", () => {
    // "pork" alone matches Pork › … lines, but they aren't "roast pork shoulder" dishes.
    expect(find("pork shoulder").index.map((m) => m.title)).toEqual(["American hot pizza pie"]);
    expect(find("pork belly").index).toEqual([]);
  });

  it("names a page with no recipe after its index line", () => {
    expect(find("preserving").index).toEqual([expect.objectContaining({ title: "Preserving", page: 5, via: "Preserving" })]);
  });

  it("filters index hits by book too", () => {
    expect(search("salo", entries, { index: rows, book: "Other" })).toEqual({ recipes: [], index: [] });
  });

  it("groups a book's index like the printed one", () => {
    const groups = bookIndex([...book.index!, { term: "salo", pages: [117, 80] }]);
    expect(groups.map((g) => g.term)).toEqual(["Cheese", "Pizza", "Pork", "Preserving", "Rabbit", "Salo"]);
    expect(groups[2]).toMatchObject({ pages: [], subs: [{ sub: "buns: dim sum pork buns", pages: [164] }, { sub: "roast loin", pages: [135] }, { sub: "salo", pages: [136] }, { sub: "shoulder: American hot pizza pie", pages: [160] }] });
    expect(groups[5]!.pages).toEqual([80, 117, 136]);
  });
});
