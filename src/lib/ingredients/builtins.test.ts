import { describe, expect, it } from "vitest";
import { BUILTIN_INGREDIENTS } from "./builtins";
import { IngredientSchema } from "./schema";
import { solidsValid, water, msnf } from "./derive";

describe("built-in ingredient database", () => {
  it("has unique ids", () => {
    const ids = BUILTIN_INGREDIENTS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every entry validates against the schema", () => {
    for (const i of BUILTIN_INGREDIENTS) {
      const r = IngredientSchema.safeParse(i);
      expect(r.success, `${i.id}: ${r.success ? "" : r.error.message}`).toBe(true);
    }
  });

  it("solids never exceed 100 g per 100 g", () => {
    for (const i of BUILTIN_INGREDIENTS) {
      expect(solidsValid(i.solids), i.id).toBe(true);
      expect(water(i)).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps the legacy dairy MSNF figures", () => {
    const get = (id: string) => BUILTIN_INGREDIENTS.find((i) => i.id === id)!;
    expect(msnf(get("whole-milk"))).toBeCloseTo(8.9, 1);
    expect(msnf(get("double-cream"))).toBeCloseTo(4.6, 1);
    expect(msnf(get("skimmed-milk-powder"))).toBeCloseTo(96, 0);
    expect(msnf(get("condensed-milk"))).toBeCloseTo(20, 0);
  });

  it("flours carry protein and ash and are tagged for dough tools", () => {
    for (const i of BUILTIN_INGREDIENTS.filter((i) => i.category === "flour")) {
      expect(i.solids.protein, i.id).toBeGreaterThan(0);
      expect(i.tools).toContain("bread");
    }
  });

  it("eggs have an egg facet", () => {
    for (const i of BUILTIN_INGREDIENTS.filter((i) => i.category === "egg")) {
      expect(i.egg, i.id).toBeDefined();
    }
  });
});
