import { z } from "zod";
import type { Ingredient } from "@/lib/ingredients";
import type { SavedRecipe } from "@/lib/recipes/store";
import type { LegacyResolver } from "@/lib/recipes/legacy";
import { readJSON } from "@/lib/storage";
import { num, uid } from "@/lib/math";
import { DEFAULT_PREF, SCHEMA_VERSION, type BreadState } from "./state";
import { PREF_TYPES } from "./data";

const Legacy = z.object({
  name: z.string(),
  mode: z.string().optional(),
  flourGrams: z.unknown().optional(),
  loaves: z.unknown().optional(),
  loafWeight: z.unknown().optional(),
  flours: z.array(z.object({ name: z.string().default(""), share: z.unknown() })).default([]),
  water: z.unknown().optional(),
  salt: z.unknown().optional(),
  yeast: z.unknown().optional(),
  extras: z.array(z.object({ name: z.string().default(""), pct: z.unknown() })).default([]),
  pref: z.object({ type: z.string().optional(), flourPct: z.unknown(), hydration: z.unknown(), yeastPct: z.unknown() }).optional(),
});

const FLOUR_MAP: Record<string, string> = {
  "white bread flour": "strong-white-flour",
  "strong white bread flour": "strong-white-flour",
  "strong white flour": "strong-white-flour",
  "bread flour": "strong-white-flour",
  "plain flour": "plain-flour",
  "all-purpose flour": "plain-flour",
  wholemeal: "wholemeal-flour",
  "wholemeal flour": "wholemeal-flour",
  rye: "rye-light",
  "rye flour": "rye-light",
  spelt: "spelt-white",
  "00": "00-flour",
  "00 flour": "00-flour",
  semolina: "semolina",
};
const EXTRA_MAP: Record<string, string> = {
  "olive oil": "olive-oil",
  sugar: "sugar",
  honey: "honey",
  butter: "butter",
  milk: "whole-milk",
  "whole milk": "whole-milk",
  "mixed seeds": "mixed-seeds",
  seeds: "mixed-seeds",
  egg: "egg-whole",
  eggs: "egg-whole",
  oil: "vegetable-oil",
};

function customFlour(name: string, id: string): Ingredient {
  return {
    id,
    name,
    category: "flour",
    tools: ["bread", "ramen"],
    solids: { fat: 1.4, protein: 11.5, sugars: 1.5, lactose: 0, ash: 0.55, other: 71 },
    custom: true,
    source: "migrated from the old baker's percentage calculator — protein/ash are placeholders",
  };
}
function customExtra(name: string, id: string): Ingredient {
  return {
    id,
    name,
    category: "other",
    tools: ["bread"],
    solids: { fat: 0, protein: 0, sugars: 0, lactose: 0, ash: 0, other: 100 },
    custom: true,
    source: "migrated from the old baker's percentage calculator — composition unknown, treated as dry",
  };
}

export function migrateBread(resolve: LegacyResolver): { recipes: SavedRecipe<BreadState>[]; customs: Ingredient[] } {
  const customs: Ingredient[] = [];
  const recipes: SavedRecipe<BreadState>[] = [];
  const now = new Date().toISOString();

  const idFor = (name: string, map: Record<string, string>, make: (n: string, id: string) => Ingredient) => {
    const n = name.trim();
    if (!n) return undefined;
    const hit = resolve.idFor("bread", n) ?? map[n.toLowerCase()];
    if (hit) return hit;
    const id = resolve.customId(n);
    customs.push(make(n, id));
    resolve.register(n, id);
    return id;
  };

  for (const raw of readJSON("bpc:recipes", z.array(z.unknown()), [])) {
    const p = Legacy.safeParse(raw);
    if (!p.success) continue;
    const d = p.data;
    const flours = d.flours.map((f) => ({ ing: idFor(f.name || "Flour", FLOUR_MAP, customFlour) ?? "strong-white-flour", share: num(f.share) }));
    const extras = d.extras
      .map((e) => ({ ing: idFor(e.name || "Extra", EXTRA_MAP, customExtra), pct: num(e.pct) }))
      .filter((e): e is { ing: string; pct: number } => !!e.ing);
    const prefType = (PREF_TYPES as readonly string[]).includes(d.pref?.type ?? "") ? (d.pref!.type as BreadState["pref"]["type"]) : "none";
    recipes.push({
      id: uid(),
      tool: "bread",
      name: d.name,
      notes: "",
      createdAt: now,
      updatedAt: now,
      schema: SCHEMA_VERSION,
      state: {
        mode: d.mode === "target" ? "target" : "flour",
        flourGrams: num(d.flourGrams) || 500,
        loaves: num(d.loaves) || 2,
        loafWeight: num(d.loafWeight) || 800,
        flours: flours.length ? flours : [{ ing: "strong-white-flour", share: 100 }],
        water: num(d.water),
        salt: num(d.salt),
        yeast: { ing: "instant-yeast", pct: num(d.yeast) },
        extras,
        pref: {
          ...DEFAULT_PREF,
          type: prefType,
          flourPct: d.pref ? num(d.pref.flourPct) || DEFAULT_PREF.flourPct : DEFAULT_PREF.flourPct,
          hydration: d.pref ? num(d.pref.hydration) || DEFAULT_PREF.hydration : DEFAULT_PREF.hydration,
          yeastPct: d.pref ? num(d.pref.yeastPct) : DEFAULT_PREF.yeastPct,
        },
      },
    });
  }
  return { recipes, customs };
}
