import { z } from "zod";
import raw from "./recipes.json";

// The Flavour Library: rubs, marinades and sauces in recipes.json, each either
// checked against a recipe site (`source`) or flagged AI generated
// (`source: null`). Quantities are metric; only tsp/tbsp are kept as spoons.

export const KINDS = ["rub", "marinade", "sauce"] as const;
export const REGIONS = ["Africa", "Americas", "Asia", "Europe", "Middle East", "Oceania"] as const;

// What a recipe goes with. Proteins weigh more than the rest when ranking
// (engine.ts); `salmon` and `steak` are narrower tags on top of fish and beef.
export const PROTEINS = ["beef", "steak", "lamb", "pork", "chicken", "duck", "fish", "salmon", "seafood", "tofu", "eggs", "cheese"] as const;
export const SIDES = [
  "potatoes", "greens", "roots", "mushrooms", "aubergine", "tomatoes", "peppers", "courgette",
  "cauliflower", "squash", "corn", "beans", "rice", "noodles", "bread",
] as const;
export const TAGS = [...PROTEINS, ...SIDES] as const;
export const COOKING = ["grill", "bbq", "pan-fry", "roast", "braise", "stir-fry", "poach", "no-cook"] as const;
export const UNITS = ["g", "kg", "ml", "l", "tsp", "tbsp", "cm", "pinch"] as const;

// Recipe sites reachable from the dev container (see
// /workspace/.devcontainer/init-firewall.sh). A source must be one of these.
export const SOURCE_HOSTS = [
  "www.bbc.co.uk",
  "www.bbcgoodfood.com",
  "www.theguardian.com",
  "www.recipetineats.com",
  "www.bonappetit.com",
  "www.epicurious.com",
  "www.greatbritishchefs.com",
  "hot-thai-kitchen.com",
  "www.jamieoliver.com",
  "www.americastestkitchen.com",
  "www.justonecookbook.com",
  "www.rickbayless.com",
] as const;

export const IngredientSchema = z.object({
  qty: z.number().positive().optional(),
  /** Upper end of a range: 2–3 tbsp. */
  max: z.number().positive().optional(),
  unit: z.enum(UNITS).optional(),
  item: z.string().trim().min(1),
});

export const SourceSchema = z.object({
  site: z.string().trim().min(1),
  url: z.string().url(),
  title: z.string().trim().min(1),
});

export const FlavourSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1),
  kind: z.enum(KINDS),
  cuisine: z.string().trim().min(1),
  region: z.enum(REGIONS),
  pairsWith: z.array(z.enum(TAGS)).min(1),
  cooking: z.array(z.enum(COOKING)).optional(),
  time: z.string().trim().min(1),
  heat: z.number().int().min(0).max(3).optional(),
  makes: z.string().trim().min(1).optional(),
  ingredients: z.array(IngredientSchema).min(1),
  method: z.array(z.string().trim().min(1)).min(1),
  tips: z.string().trim().min(1).optional(),
  /** null: no reachable site had it, so it's AI generated. */
  source: SourceSchema.nullable(),
});

export type Kind = (typeof KINDS)[number];
export type Region = (typeof REGIONS)[number];
export type Tag = (typeof TAGS)[number];
export type Ingredient = z.infer<typeof IngredientSchema>;
export type Flavour = z.infer<typeof FlavourSchema>;

// Lenient like the cookbooks: a bad entry is skipped with a warning, and
// data.test.ts fails CI on it before deploy.
export function parseFlavours(list: unknown): Flavour[] {
  if (!Array.isArray(list)) return [];
  return list.flatMap((item, i) => {
    const r = FlavourSchema.safeParse(item);
    if (r.success) return [r.data];
    console.warn(`flavours: skipping invalid recipe #${i}`, r.error.issues[0]);
    return [];
  });
}

export const FLAVOURS: Flavour[] = parseFlavours(raw);
