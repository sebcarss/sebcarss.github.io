import { readRaw, writeRaw } from "@/lib/storage";
import { getCustomIngredients, replaceCustomIngredients, type Ingredient } from "@/lib/ingredients";
import { importRecipes, type SavedRecipe } from "./store";
import { makeResolver } from "./legacy";
import { migrateIceCream } from "@/tools/ice-cream/migrate";
import { migrateBread } from "@/tools/bread/migrate";
import { migrateRamen } from "@/tools/ramen/migrate";

const FLAG = "sc:migrated:v1";
const LEGACY_KEYS = ["icc:recipes", "icc:ingredients", "bpc:recipes", "rnc:recipes", "rnc:flours"];

/**
 * One-shot import of recipes and custom ingredients saved by the old static
 * calculators. The old keys are left untouched so the previous pages (if
 * ever restored) still work; we only ever read them.
 */
export function runMigrations(): { recipes: number; customs: number } | null {
  if (readRaw(FLAG)) return null;
  if (!LEGACY_KEYS.some((k) => readRaw(k) != null)) {
    writeRaw(FLAG, new Date().toISOString());
    return null;
  }
  const resolve = makeResolver();
  const recipes: SavedRecipe[] = [];
  const customs: Ingredient[] = [];
  for (const run of [migrateIceCream, migrateBread, migrateRamen]) {
    try {
      const out = run(resolve);
      recipes.push(...(out.recipes as SavedRecipe[]));
      customs.push(...out.customs);
    } catch (e) {
      console.warn("migration step failed", e);
    }
  }
  if (customs.length) {
    const existing = getCustomIngredients();
    const byId = new Map(existing.map((i) => [i.id, i]));
    for (const c of customs) if (!byId.has(c.id)) byId.set(c.id, c);
    replaceCustomIngredients([...byId.values()]);
  }
  if (recipes.length) importRecipes(recipes);
  writeRaw(FLAG, new Date().toISOString());
  return { recipes: recipes.length, customs: customs.length };
}
