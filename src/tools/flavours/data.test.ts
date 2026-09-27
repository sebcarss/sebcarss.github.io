import { describe, expect, it } from "vitest";
import raw from "./recipes.json";
import { FlavourSchema, KINDS, SOURCE_HOSTS, parseFlavours } from "./data";

const list = raw as unknown[];

// Imperial units and °F must be converted; tsp and tbsp are the only spoons.
// "Pound" is only a weight after a number ("pound the pork" is fine).
const IMPERIAL = /\b(cups?|oz|ounces?|inch(es)?|quarts?|pints?|sticks? of butter)\b|\d\s*(lbs?|pounds?)\b|°\s*F\b|\d\s*"/i;

describe("recipes.json", () => {
  it("every recipe is valid", () => {
    list.forEach((r, i) => {
      const res = FlavourSchema.safeParse(r);
      expect(res.success, `#${i} ${(r as { id?: string }).id}: ${JSON.stringify(res.error?.issues[0])}`).toBe(true);
    });
    expect(parseFlavours(list)).toHaveLength(list.length);
  });

  it("ids are unique", () => {
    const ids = parseFlavours(list).map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("measurements are metric (spoons excepted)", () => {
    for (const f of parseFlavours(list)) {
      const texts = [...f.ingredients.map((i) => i.item), ...f.method, f.tips ?? "", f.makes ?? ""];
      for (const t of texts) expect(t, `${f.id}: "${t}"`).not.toMatch(IMPERIAL);
    }
  });

  it("sources are on the allowed recipe sites", () => {
    for (const f of parseFlavours(list)) {
      if (!f.source) continue;
      const host = new URL(f.source.url).host;
      expect(SOURCE_HOSTS as readonly string[], `${f.id}: ${host}`).toContain(host);
      expect(f.source.url.startsWith("https://"), f.id).toBe(true);
    }
  });

  it("has every kind, and most recipes are validated", () => {
    const all = parseFlavours(list);
    for (const k of KINDS) expect(all.some((f) => f.kind === k), k).toBe(true);
    expect(all.filter((f) => f.source).length).toBeGreaterThan(all.length / 2);
  });

  it("skips a bad entry instead of failing", () => {
    expect(parseFlavours([{ id: "x" }, list[0]])).toHaveLength(1);
    expect(parseFlavours("nope")).toEqual([]);
  });
});
