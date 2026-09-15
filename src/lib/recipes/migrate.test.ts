// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

// The stores read localStorage at import time, so seed it before importing.
const LEGACY = {
  "icc:ingredients": [{ name: "Oat cream", cat: "Custom", fat: 15, sugar: 2, msnf: 0, other: 3, pod: 2, pac: 2 }],
  "icc:recipes": [
    { name: "Vanilla base", style: "icecream", rows: [{ ing: "Whole milk", grams: 500 }, { ing: "Caster sugar", grams: 120 }, { ing: "Oat cream", grams: 100 }] },
    { name: "Broken", style: "gelato" }, // rows missing → still imported, empty
  ],
  "bpc:recipes": [
    {
      name: "Country loaf", mode: "flour", flourGrams: 1000, loaves: 2, loafWeight: 800,
      flours: [{ name: "White bread flour", share: 80 }, { name: "My stoneground", share: 20 }],
      water: 72, salt: 2, yeast: 0.5, extras: [{ name: "Honey", pct: 3 }, { name: "Nigella seeds", pct: 1 }],
      pref: { type: "poolish", flourPct: 30, hydration: 100, yeastPct: 0.1 },
    },
  ],
  "rnc:flours": [{ name: "Nisshin Camellia", protein: 11.8, ash: 0.37 }],
  "rnc:recipes": [
    {
      name: "House shoyu", mode: "target", flourGrams: 1000, servings: 6, servingG: 130, waste: 6,
      flours: [{ name: "Nisshin Camellia", share: 70, protein: 11.8, ash: 0.37 }, { name: "Chūrikiko (medium)", share: 30, protein: 9.5, ash: 0.4 }],
      water: 34, salt: 1.2, kansuiForm: "powder", kansui: 1, kansuiConc: 30, kansuiRatio: 90,
      eggForm: "yolk", egg: 5, colour: 0, aging: 24, cut: 22, thickness: 1.25, crimp: 1,
    },
  ],
};

beforeEach(() => {
  localStorage.clear();
  for (const [k, v] of Object.entries(LEGACY)) localStorage.setItem(k, JSON.stringify(v));
});

describe("legacy localStorage migration", () => {
  it("imports recipes and custom ingredients from all three old tools", async () => {
    const { runMigrations } = await import("./migrate");
    const { getRecipes } = await import("./store");
    const { getCustomIngredients, findIngredient } = await import("@/lib/ingredients");

    const out = runMigrations();
    expect(out).toEqual({ recipes: 4, customs: 4 });

    const recipes = getRecipes();
    const ice = recipes.filter((r) => r.tool === "ice-cream");
    expect(ice.map((r) => r.name).sort()).toEqual(["Broken", "Vanilla base"]);
    const vanilla = ice.find((r) => r.name === "Vanilla base")!.state as { rows: { ing: string; grams: number }[] };
    expect(vanilla.rows.map((r) => r.ing)).toEqual(["whole-milk", "sugar", "custom-oat-cream"]);
    const oat = findIngredient("custom-oat-cream")!;
    expect(oat.solids.fat).toBe(15);
    expect(oat.sweet).toEqual({ pod: 2, pac: 2 });

    const bread = recipes.find((r) => r.tool === "bread")!.state as { flours: { ing: string }[]; extras: { ing: string }[]; pref: { type: string } };
    expect(bread.flours.map((f) => f.ing)).toEqual(["strong-white-flour", "custom-my-stoneground"]);
    expect(bread.extras.map((e) => e.ing)).toEqual(["honey", "custom-nigella-seeds"]);
    expect(bread.pref.type).toBe("poolish");

    const ramen = recipes.find((r) => r.tool === "ramen")!.state as { flours: { ing: string }[]; egg: { ing: string; pct: number }; thickness: number; mode: string };
    expect(ramen.flours.map((f) => f.ing)).toEqual(["custom-nisshin-camellia", "churikiko"]);
    expect(ramen.egg).toEqual({ ing: "egg-yolk", pct: 5 });
    expect(ramen.thickness).toBe(1.2);
    expect(ramen.mode).toBe("target");
    expect(findIngredient("custom-nisshin-camellia")!.solids.protein).toBe(11.8);

    expect(getCustomIngredients()).toHaveLength(4);
    // Old keys are left in place; the flag stops a second run.
    expect(localStorage.getItem("rnc:recipes")).not.toBeNull();
    expect(runMigrations()).toBeNull();
  });
});
