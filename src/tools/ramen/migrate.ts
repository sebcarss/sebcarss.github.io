import type { Ingredient } from "@/lib/ingredients";
import type { SavedRecipe } from "@/lib/recipes/store";
import type { LegacyResolver } from "@/lib/recipes/legacy";

export function migrateRamen(_resolve: LegacyResolver): { recipes: SavedRecipe[]; customs: Ingredient[] } {
  return { recipes: [], customs: [] };
}
