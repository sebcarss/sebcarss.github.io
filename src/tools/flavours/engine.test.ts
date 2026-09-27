import { describe, expect, it } from "vitest";
import { FLAVOURS } from "./data";
import { parseIngredients, suggest } from "./engine";

const ids = (text: string, extra: Partial<Parameters<typeof suggest>[0]> = {}) => suggest({ text, ...extra }, FLAVOURS).map((s) => s.flavour.id);

describe("parseIngredients", () => {
  it("maps cuts and synonyms to tags", () => {
    expect(parseIngredients("ribeye").tags).toEqual(["steak", "beef"]);
    expect(parseIngredients("Zucchini & eggplant").tags).toEqual(["courgette", "aubergine"]);
    expect(parseIngredients("sweet potatoes").tags).toEqual(["roots", "squash"]);
    expect(parseIngredients("prawns, green beans").tags).toEqual(["seafood", "greens"]);
  });

  it("a cut only names the animal when nothing else does", () => {
    expect(parseIngredients("salmon fillet").tags).toEqual(["salmon", "fish"]);
    expect(parseIngredients("pork chops").tags).toEqual(["pork"]);
    expect(parseIngredients("fillet").tags).toEqual(["steak", "beef"]);
  });

  it("keeps unknown words for the name search", () => {
    expect(parseIngredients("korean beef").rest).toEqual(["korean"]);
    expect(parseIngredients("some veg and meat").rest).toEqual([]);
  });
});

describe("suggest", () => {
  it("steak and broccoli leads with steak sauces and rubs", () => {
    const top = ids("beef steak, broccoli").slice(0, 12);
    for (const id of ["diane", "peppercorn", "chimichurri", "cajun-rub", "bearnaise"]) expect(top).toContain(id);
  });

  it("salmon gets fish recipes, not Diane", () => {
    const r = ids("salmon");
    expect(r).toContain("miso-marinade");
    expect(r).toContain("teriyaki");
    expect(r).not.toContain("diane");
  });

  it("proteins outrank sides", () => {
    const r = suggest({ text: "lamb potatoes" }, FLAVOURS);
    const lamb = r.find((s) => s.flavour.id === "greek-lemon-oregano")!;
    const potOnly = r.find((s) => !s.flavour.pairsWith.includes("lamb"))!;
    expect(lamb.score).toBeGreaterThan(potOnly.score);
  });

  it("filters by kind and region", () => {
    expect(suggest({ text: "chicken", kind: "rub" }, FLAVOURS).every((s) => s.flavour.kind === "rub")).toBe(true);
    const asia = suggest({ text: "", region: "Asia" }, FLAVOURS);
    expect(asia.length).toBeGreaterThan(0);
    expect(asia.every((s) => s.flavour.region === "Asia")).toBe(true);
  });

  it("finds recipes by name or cuisine", () => {
    expect(ids("diane")[0]).toBe("diane");
    expect(ids("korean")).toContain("bulgogi");
    expect(ids("chimmichurri")[0]).toBe("chimichurri"); // typo
  });

  it("no text lists everything A–Z; nonsense lists nothing", () => {
    const all = suggest({ text: "" }, FLAVOURS);
    expect(all).toHaveLength(FLAVOURS.length);
    const names = all.map((s) => s.flavour.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(ids("xyzzy")).toEqual([]);
  });
});
