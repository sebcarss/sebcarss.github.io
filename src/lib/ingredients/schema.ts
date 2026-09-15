import { z } from "zod";

export const TOOLS = ["ice-cream", "bread", "ramen"] as const;
export type Tool = (typeof TOOLS)[number];

export const CATEGORIES = [
  "dairy",
  "liquid",
  "sweetener",
  "egg",
  "fat",
  "flour",
  "starch",
  "yeast",
  "salt",
  "flavour",
  "inclusion",
  "stabiliser",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  dairy: "Dairy",
  liquid: "Liquids",
  sweetener: "Sweeteners",
  egg: "Eggs",
  fat: "Fats & oils",
  flour: "Flours",
  starch: "Starches",
  yeast: "Yeast",
  salt: "Salt",
  flavour: "Flavours",
  inclusion: "Inclusions",
  stabiliser: "Stabilisers & emulsifiers",
  other: "Other",
};

/** g per 100 g of the ingredient as bought. Water is 100 − the sum. */
export const SolidsSchema = z.object({
  fat: z.number().min(0).max(100).default(0),
  protein: z.number().min(0).max(100).default(0),
  /** Added/native sugars other than lactose (sucrose, glucose, fructose…). */
  sugars: z.number().min(0).max(100).default(0),
  lactose: z.number().min(0).max(100).default(0),
  /** Minerals; for salt this is the whole thing. */
  ash: z.number().min(0).max(100).default(0),
  /** Starch, fibre, cocoa solids, anything else that isn't water. */
  other: z.number().min(0).max(100).default(0),
});
export type Solids = z.infer<typeof SolidsSchema>;

export const IngredientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(CATEGORIES),
  tools: z.array(z.enum(TOOLS)).min(1),
  solids: SolidsSchema,
  /**
   * Sweetness (POD) and anti-freezing power (PAC) per 100 g of the ingredient
   * as bought, for its own sugars/solutes only. Lactose is never included
   * here — the ice-cream engine adds it from `solids.lactose`.
   */
  sweet: z.object({ pod: z.number().min(0), pac: z.number().min(0) }).optional(),
  /** Egg facet: whole-egg equivalence by solids, and how much it yellows. */
  egg: z.object({ wholeEq: z.number().min(0), colour: z.number().min(0) }).optional(),
  /** Yeast facet: grams of instant yeast one gram of this is worth. */
  yeast: z.object({ instantEq: z.number().positive() }).optional(),
  source: z.string().optional(),
  custom: z.boolean().optional(),
});
export type Ingredient = z.infer<typeof IngredientSchema>;

export const CustomIngredientListSchema = z.array(IngredientSchema);
