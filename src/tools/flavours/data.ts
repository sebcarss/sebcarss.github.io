import { z } from "zod";
import raw from "./flavours.json";

// The Flavour Library: a pairing index of rubs, marinades and sauces in
// flavours.json. Names and what they go with only; no ingredients, methods or
// source links (look the recipe up yourself).

export const KINDS = ["rub", "marinade", "sauce"] as const;
export const REGIONS = ["Africa", "Americas", "Asia", "Europe", "Middle East", "Oceania"] as const;

// What a flavour goes with. Proteins weigh more than the rest when ranking
// (engine.ts); `salmon` and `steak` are narrower tags on top of fish and beef.
export const PROTEINS = ["beef", "steak", "lamb", "pork", "chicken", "duck", "fish", "salmon", "seafood", "tofu", "eggs", "cheese"] as const;
export const SIDES = [
  "potatoes", "greens", "roots", "mushrooms", "aubergine", "tomatoes", "peppers", "courgette",
  "cauliflower", "squash", "corn", "beans", "rice", "noodles", "bread",
] as const;
export const TAGS = [...PROTEINS, ...SIDES] as const;
export const COOKING = ["grill", "bbq", "pan-fry", "roast", "braise", "stir-fry", "poach", "no-cook"] as const;

export const FlavourSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1),
  kind: z.enum(KINDS),
  cuisine: z.string().trim().min(1),
  region: z.enum(REGIONS),
  pairsWith: z.array(z.enum(TAGS)).min(1),
  cooking: z.array(z.enum(COOKING)).optional(),
  heat: z.number().int().min(0).max(3).optional(),
});

export type Kind = (typeof KINDS)[number];
export type Region = (typeof REGIONS)[number];
export type Tag = (typeof TAGS)[number];
export type Flavour = z.infer<typeof FlavourSchema>;

// Lenient like the cookbooks: a bad entry is skipped with a warning, and
// data.test.ts fails CI on it before deploy.
export function parseFlavours(list: unknown): Flavour[] {
  if (!Array.isArray(list)) return [];
  return list.flatMap((item, i) => {
    const r = FlavourSchema.safeParse(item);
    if (r.success) return [r.data];
    console.warn(`flavours: skipping invalid entry #${i}`, r.error.issues[0]);
    return [];
  });
}

export const FLAVOURS: Flavour[] = parseFlavours(raw);
