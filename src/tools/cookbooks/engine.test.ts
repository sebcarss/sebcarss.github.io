import { describe, expect, it } from "vitest";
import { levenshtein, normalize, search, singular, stats } from "./engine";
import type { Entry } from "./data";

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

describe("stats", () => {
  it("counts recipes and lists books alphabetically", () => {
    expect(stats(ENTRIES)).toEqual({ books: ["Book A", "Book B", "Book C"], recipes: ENTRIES.length });
  });
});
