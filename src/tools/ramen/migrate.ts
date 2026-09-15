import { z } from "zod";
import type { Ingredient } from "@/lib/ingredients";
import type { SavedRecipe } from "@/lib/recipes/store";
import type { LegacyResolver } from "@/lib/recipes/legacy";
import { readJSON } from "@/lib/storage";
import { num, uid } from "@/lib/math";
import { DEFAULT_STATE, SCHEMA_VERSION, type RamenState } from "./state";
import { KANSUI_FORM_IDS, rollerFor } from "./data";

const LegacyFlour = z.object({ name: z.string(), protein: z.unknown().optional(), ash: z.unknown().optional() });
const Legacy = z.object({
  name: z.string(),
  mode: z.string().optional(),
  flourGrams: z.unknown().optional(),
  servings: z.unknown().optional(),
  servingG: z.unknown().optional(),
  waste: z.unknown().optional(),
  flours: z.array(z.object({ name: z.string().default(""), share: z.unknown(), protein: z.unknown().optional(), ash: z.unknown().optional() })).default([]),
  water: z.unknown().optional(),
  salt: z.unknown().optional(),
  kansuiForm: z.string().optional(),
  kansui: z.unknown().optional(),
  kansuiConc: z.unknown().optional(),
  kansuiRatio: z.unknown().optional(),
  eggForm: z.string().optional(),
  egg: z.unknown().optional(),
  colour: z.unknown().optional(),
  aging: z.unknown().optional(),
  cut: z.unknown().optional(),
  thickness: z.unknown().optional(),
  crimp: z.unknown().optional(),
});

const FLOUR_MAP: Record<string, string> = {
  "strong bread flour": "strong-white-flour",
  "kyōrikiko (strong)": "kyorikiko",
  "chūrikiko (medium)": "churikiko",
  "hakurikiko (weak/cake)": "hakurikiko",
  "plain / all-purpose": "plain-flour",
  "00 pasta flour": "00-flour",
  "wholemeal (zenryūfun)": "wholemeal-flour",
  rye: "rye-light",
  "vital wheat gluten": "vital-wheat-gluten",
  "potato starch": "potato-starch",
  "tapioca starch": "tapioca-starch",
};
const EGG_MAP: Record<string, string | null> = { none: null, whole: "egg-whole", yolk: "egg-yolk", dried: "dried-egg-yolk" };

export function customFlour(name: string, id: string, protein: number, ash: number): Ingredient {
  const other = Math.max(0, 100 - 14 - 1.4 - 1.5 - protein - ash);
  return {
    id,
    name,
    category: protein < 2 ? "starch" : "flour",
    tools: ["bread", "ramen"],
    solids: { fat: 1.4, protein, sugars: 1.5, lactose: 0, ash, other },
    custom: true,
    source: "migrated from the old ramen noodle calculator",
  };
}

export function migrateRamen(resolve: LegacyResolver): { recipes: SavedRecipe<RamenState>[]; customs: Ingredient[] } {
  const customs: Ingredient[] = [];
  const recipes: SavedRecipe<RamenState>[] = [];
  const now = new Date().toISOString();

  const flourId = (name: string, protein: number, ash: number) => {
    const n = name.trim() || "Flour";
    const hit = resolve.idFor("ramen", n) ?? FLOUR_MAP[n.toLowerCase()];
    if (hit) return hit;
    const id = resolve.customId(n);
    customs.push(customFlour(n, id, protein || 11, ash || 0.45));
    resolve.register(n, id);
    return id;
  };

  for (const raw of readJSON("rnc:flours", z.array(z.unknown()), [])) {
    const p = LegacyFlour.safeParse(raw);
    if (p.success) flourId(p.data.name, num(p.data.protein), num(p.data.ash));
  }

  for (const raw of readJSON("rnc:recipes", z.array(z.unknown()), [])) {
    const p = Legacy.safeParse(raw);
    if (!p.success) continue;
    const d = p.data;
    const flours = d.flours.map((f) => ({ ing: flourId(f.name, num(f.protein), num(f.ash)), share: num(f.share) }));
    const form = (KANSUI_FORM_IDS as readonly string[]).includes(d.kansuiForm ?? "") ? (d.kansuiForm as RamenState["kansui"]["form"]) : "powder";
    const eggIng = d.eggForm && d.eggForm in EGG_MAP ? EGG_MAP[d.eggForm]! : null;
    recipes.push({
      id: uid(),
      tool: "ramen",
      name: d.name,
      notes: "",
      createdAt: now,
      updatedAt: now,
      schema: SCHEMA_VERSION,
      state: {
        ...DEFAULT_STATE,
        mode: d.mode === "target" ? "target" : "flour",
        flourGrams: num(d.flourGrams) || DEFAULT_STATE.flourGrams,
        servings: num(d.servings) || DEFAULT_STATE.servings,
        servingG: num(d.servingG) || DEFAULT_STATE.servingG,
        waste: num(d.waste),
        flours: flours.length ? flours : DEFAULT_STATE.flours,
        water: num(d.water),
        salt: num(d.salt),
        kansui: { form, pct: num(d.kansui), conc: num(d.kansuiConc) || 30, ratio: d.kansuiRatio == null ? 90 : num(d.kansuiRatio) },
        egg: { ing: eggIng, pct: num(d.egg) },
        colour: num(d.colour),
        aging: num(d.aging),
        cut: num(d.cut) || DEFAULT_STATE.cut,
        thickness: rollerFor(num(d.thickness) || DEFAULT_STATE.thickness).mm,
        crimp: Math.min(3, Math.max(0, Math.round(num(d.crimp)))),
      },
    });
  }
  return { recipes, customs };
}
