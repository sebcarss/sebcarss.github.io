import { z } from "zod";
import { PREF_TYPES, PREFERMENTS, type PrefType } from "./data";

export const SCHEMA_VERSION = 1;

export const PrefSchema = z.object({
  type: z.enum(PREF_TYPES),
  flourPct: z.number().min(0),
  hydration: z.number().min(0),
  yeastPct: z.number().min(0),
  /** Add the preferment's yeast on top of the recipe yeast instead of taking it from it. */
  yeastSeparate: z.boolean().default(false),
  /** Starter used to seed a levain, grams and its hydration. */
  seedG: z.number().min(0).default(0),
  seedHydration: z.number().min(0).default(100),
});
export type Pref = z.infer<typeof PrefSchema>;

export const BreadStateSchema = z.object({
  mode: z.enum(["flour", "target"]),
  flourGrams: z.number().min(0),
  loaves: z.number().min(0),
  loafWeight: z.number().min(0),
  flours: z.array(z.object({ ing: z.string(), share: z.number().min(0) })).min(1),
  water: z.number().min(0),
  salt: z.number().min(0),
  yeast: z.object({ ing: z.string(), pct: z.number().min(0) }),
  extras: z.array(z.object({ ing: z.string(), pct: z.number().min(0) })),
  pref: PrefSchema,
});
export type BreadState = z.infer<typeof BreadStateSchema>;

export const DEFAULT_PREF: Pref = { type: "none", flourPct: 30, hydration: 100, yeastPct: 0.1, yeastSeparate: false, seedG: 0, seedHydration: 100 };

export const DEFAULT_STATE: BreadState = {
  mode: "flour",
  flourGrams: 500,
  loaves: 2,
  loafWeight: 800,
  flours: [{ ing: "strong-white-flour", share: 100 }],
  water: 70,
  salt: 2,
  yeast: { ing: "instant-yeast", pct: 1 },
  extras: [],
  pref: DEFAULT_PREF,
};

export function prefFor(type: PrefType, recipeHydration: number, recipeYeastPct: number, prev: Pref): Pref {
  if (type === "none") return { ...prev, type };
  const d = PREFERMENTS[type];
  return {
    ...prev,
    type,
    flourPct: d.flourPct,
    hydration: d.hydration === "recipe" ? recipeHydration : d.hydration,
    yeastPct: d.yeastPct === "recipe" ? recipeYeastPct : (d.yeastPct ?? 0),
  };
}

export type Action =
  | { type: "mode"; mode: BreadState["mode"]; flourG?: number; totalG?: number }
  | { type: "set"; patch: Partial<Pick<BreadState, "flourGrams" | "loaves" | "loafWeight" | "water" | "salt">> }
  | { type: "yeast"; patch: Partial<BreadState["yeast"]> }
  | { type: "flour-set"; index: number; patch: Partial<BreadState["flours"][number]> }
  | { type: "flour-add"; ing: string }
  | { type: "flour-remove"; index: number }
  | { type: "extra-set"; index: number; patch: Partial<BreadState["extras"][number]> }
  | { type: "extra-add"; ing: string }
  | { type: "extra-remove"; index: number }
  | { type: "pref-type"; prefType: PrefType }
  | { type: "pref"; patch: Partial<Pref> }
  | { type: "replace"; state: BreadState };

export function reducer(s: BreadState, a: Action): BreadState {
  switch (a.type) {
    case "mode": {
      if (a.mode === s.mode) return s;
      // Carry the current batch size across so switching modes never jumps.
      if (a.mode === "target" && a.totalG && s.loaves > 0)
        return { ...s, mode: a.mode, loafWeight: Math.round(a.totalG / s.loaves) };
      if (a.mode === "flour" && a.flourG) return { ...s, mode: a.mode, flourGrams: Math.round(a.flourG) };
      return { ...s, mode: a.mode };
    }
    case "set":
      return { ...s, ...a.patch };
    case "yeast":
      return { ...s, yeast: { ...s.yeast, ...a.patch } };
    case "flour-set":
      return { ...s, flours: s.flours.map((f, i) => (i === a.index ? { ...f, ...a.patch } : f)) };
    case "flour-add":
      return { ...s, flours: [...s.flours, { ing: a.ing, share: 0 }] };
    case "flour-remove":
      return s.flours.length > 1 ? { ...s, flours: s.flours.filter((_, i) => i !== a.index) } : s;
    case "extra-set":
      return { ...s, extras: s.extras.map((e, i) => (i === a.index ? { ...e, ...a.patch } : e)) };
    case "extra-add":
      return { ...s, extras: [...s.extras, { ing: a.ing, pct: 0 }] };
    case "extra-remove":
      return { ...s, extras: s.extras.filter((_, i) => i !== a.index) };
    case "pref-type":
      return { ...s, pref: prefFor(a.prefType, s.water, s.yeast.pct, s.pref) };
    case "pref":
      return { ...s, pref: { ...s.pref, ...a.patch } };
    case "replace":
      return a.state;
  }
}

export function parseState(raw: unknown, _schema: number): BreadState | null {
  const r = BreadStateSchema.safeParse(raw);
  return r.success ? r.data : null;
}
