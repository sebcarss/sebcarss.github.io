import type { Ingredient, Solids } from "./schema";

export const totalSolids = (s: Solids) =>
  s.fat + s.protein + s.sugars + s.lactose + s.ash + s.other;

/** Water per 100 g. Everything that isn't a solid is treated as water. */
export const water = (i: Ingredient) => Math.max(0, 100 - totalSolids(i.solids));

/** Milk solids non-fat: protein + lactose + minerals, for dairy only. */
export const msnf = (i: Ingredient) =>
  i.category === "dairy" ? i.solids.protein + i.solids.lactose + i.solids.ash : 0;

/**
 * "Other solids" in the ice-cream sense: everything that is neither fat,
 * sugar, lactose nor (dairy) MSNF.
 */
export const otherSolids = (i: Ingredient) =>
  i.category === "dairy"
    ? i.solids.other
    : i.solids.protein + i.solids.ash + i.solids.other;

export const isFlourLike = (i: Ingredient) => i.category === "flour" || i.category === "starch";

/** Guard used by the DB test and the custom-ingredient form. */
export const solidsValid = (s: Solids) => totalSolids(s) <= 100 + 1e-9;
