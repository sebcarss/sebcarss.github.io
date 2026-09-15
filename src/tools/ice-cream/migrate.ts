import { z } from "zod";
import type { Ingredient } from "@/lib/ingredients";
import type { SavedRecipe } from "@/lib/recipes/store";
import { readJSON } from "@/lib/storage";
import { num, uid } from "@/lib/math";
import { resolveLegacyName, type LegacyResolver } from "@/lib/recipes/legacy";
import { SCHEMA_VERSION, type IceCreamState } from "./state";

const LegacyIngredient = z.object({
  name: z.string(),
  fat: z.unknown().optional(),
  sugar: z.unknown().optional(),
  msnf: z.unknown().optional(),
  other: z.unknown().optional(),
  pod: z.unknown().optional(),
  pac: z.unknown().optional(),
});
const LegacyRecipe = z.object({
  name: z.string(),
  style: z.string().optional(),
  rows: z.array(z.object({ ing: z.string(), grams: z.unknown() })).default([]),
});

/** Legacy display names → ids in the new database. */
const NAME_MAP: Record<string, string> = {
  "whole milk": "whole-milk",
  "semi-skimmed milk": "semi-skimmed-milk",
  "skimmed milk": "skimmed-milk",
  "double cream": "double-cream",
  "whipping cream": "whipping-cream",
  "skimmed milk powder": "skimmed-milk-powder",
  butter: "butter",
  "condensed milk": "condensed-milk",
  "egg yolk": "egg-yolk",
  "cocoa powder": "cocoa-powder-22",
  "dark chocolate 70%": "dark-chocolate-70",
  "caster sugar": "sugar",
  dextrose: "dextrose",
  "glucose syrup": "glucose-syrup-de42",
  honey: "honey",
  "golden syrup": "golden-syrup",
};

/** An old custom ingredient (fat/sugar/msnf/other/pod/pac) → the new shape. */
export function convertLegacyIngredient(raw: z.infer<typeof LegacyIngredient>, id: string): Ingredient {
  const msnf = num(raw.msnf);
  const sugar = num(raw.sugar);
  return {
    id,
    name: raw.name,
    category: msnf > 0 ? "dairy" : "other",
    tools: ["ice-cream"],
    solids: {
      fat: num(raw.fat),
      sugars: sugar,
      protein: msnf * 0.37,
      lactose: msnf * 0.545,
      ash: msnf * 0.085,
      other: num(raw.other),
    },
    sweet: { pod: raw.pod == null ? sugar : num(raw.pod), pac: raw.pac == null ? sugar : num(raw.pac) },
    custom: true,
    source: "migrated from the old ice cream calculator",
  };
}

export function migrateIceCream(resolve: LegacyResolver): { recipes: SavedRecipe<IceCreamState>[]; customs: Ingredient[] } {
  const customs: Ingredient[] = [];
  for (const raw of readJSON("icc:ingredients", z.array(z.unknown()), [])) {
    const p = LegacyIngredient.safeParse(raw);
    if (!p.success) continue;
    const id = resolve.idFor("ice-cream", p.data.name) ?? resolve.customId(p.data.name);
    if (!resolve.exists(id)) customs.push(convertLegacyIngredient(p.data, id));
    resolve.register(p.data.name, id);
  }
  const now = new Date().toISOString();
  const recipes: SavedRecipe<IceCreamState>[] = [];
  for (const raw of readJSON("icc:recipes", z.array(z.unknown()), [])) {
    const p = LegacyRecipe.safeParse(raw);
    if (!p.success) continue;
    const style = p.data.style === "gelato" ? "gelato" : "icecream";
    const rows = p.data.rows.map((r) => ({
      ing: resolve.idFor("ice-cream", r.ing) ?? resolveLegacyName(NAME_MAP, r.ing) ?? r.ing,
      grams: Math.max(0, num(r.grams)),
    }));
    recipes.push({
      id: uid(),
      tool: "ice-cream",
      name: p.data.name,
      notes: "",
      createdAt: now,
      updatedAt: now,
      schema: SCHEMA_VERSION,
      state: { style, rows },
    });
  }
  return { recipes, customs };
}

export { NAME_MAP as ICE_CREAM_NAME_MAP };
