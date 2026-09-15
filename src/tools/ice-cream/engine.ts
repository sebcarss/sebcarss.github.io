import { msnf, otherSolids, type Ingredient } from "@/lib/ingredients";
import { LACTOSE_PAC, LACTOSE_POD, SERVING_TEMP_C, TARGETS, type MetricKey } from "./targets";
import type { IceCreamState } from "./state";

export interface RowResult {
  ing: string;
  name: string;
  grams: number;
  solidsG: number;
  missing: boolean;
}

export interface IceCreamResult {
  grams: number;
  solidGrams: number;
  waterGrams: number;
  metrics: Record<MetricKey, number>;
  /** Lactose as % of the mix and of the water phase. */
  lactosePct: number;
  lactoseOfWater: number;
  /** Initial freezing point (°C) and water frozen at the serving temperature. */
  freezingPointC: number;
  frozenAtServing: number;
  rows: RowResult[];
  missing: string[];
}

export type Lookup = (id: string) => Ingredient | undefined;

/**
 * Sum every ingredient's composition, add lactose's POD/PAC exactly once
 * (from `solids.lactose`), and express everything as % of the mix.
 * `sugar` is non-lactose sugars only; `msnf` is dairy protein+lactose+ash;
 * `other` is everything else that isn't water.
 */
export function compute(state: IceCreamState, lookup: Lookup): IceCreamResult | null {
  const t = { grams: 0, fat: 0, sugar: 0, msnf: 0, other: 0, lactose: 0, pod: 0, pac: 0 };
  const rows: RowResult[] = [];
  const missing: string[] = [];

  for (const row of state.rows) {
    const ing = lookup(row.ing);
    const g = Number.isFinite(row.grams) ? row.grams : 0;
    if (!ing) {
      rows.push({ ing: row.ing, name: row.ing, grams: g, solidsG: 0, missing: true });
      if (g > 0) missing.push(row.ing);
      continue;
    }
    const s = ing.solids;
    const solidsPer100 = s.fat + s.sugars + s.lactose + s.protein + s.ash + s.other;
    rows.push({ ing: ing.id, name: ing.name, grams: g, solidsG: (g * solidsPer100) / 100, missing: false });
    if (g <= 0) continue;
    t.grams += g;
    t.fat += (g * s.fat) / 100;
    t.sugar += (g * s.sugars) / 100;
    t.msnf += (g * msnf(ing)) / 100;
    t.other += (g * otherSolids(ing)) / 100;
    t.lactose += (g * s.lactose) / 100;
    // Non-dairy lactose (e.g. milk chocolate) is a solid too.
    if (ing.category !== "dairy") t.other += (g * s.lactose) / 100;
    t.pod += (g * (ing.sweet?.pod ?? 0)) / 100;
    t.pac += (g * (ing.sweet?.pac ?? 0)) / 100;
  }
  t.pod += t.lactose * LACTOSE_POD;
  t.pac += t.lactose * LACTOSE_PAC;

  if (t.grams <= 0) return null;
  const pct = (x: number) => (x / t.grams) * 100;
  const solidGrams = t.fat + t.sugar + t.msnf + t.other;
  const waterGrams = Math.max(0, t.grams - solidGrams);

  // Freezing-point depression: PAC is grams of sucrose-equivalent per 100 g
  // of mix; convert to molality of the water phase and apply Kf = 1.86.
  const pacG = t.pac; // sucrose-equivalent grams in the whole batch
  const molality = waterGrams > 0 ? pacG / 342.3 / (waterGrams / 1000) : 0;
  const freezingPointC = -1.86 * molality;
  // Ideal-solution estimate of the ice fraction at the serving temperature.
  const frozenAtServing =
    freezingPointC < 0 ? Math.max(0, Math.min(1, 1 - freezingPointC / SERVING_TEMP_C)) : 0;

  return {
    grams: t.grams,
    solidGrams,
    waterGrams,
    metrics: {
      fat: pct(t.fat),
      sugar: pct(t.sugar),
      msnf: pct(t.msnf),
      other: pct(t.other),
      solids: pct(solidGrams),
      pod: pct(t.pod),
      pac: pct(t.pac),
    },
    lactosePct: pct(t.lactose),
    lactoseOfWater: waterGrams > 0 ? (t.lactose / waterGrams) * 100 : 0,
    freezingPointC,
    frozenAtServing,
    rows,
    missing,
  };
}

export type Status = "" | "low" | "ok" | "high";

export function statusOf(style: IceCreamState["style"], key: MetricKey, value: number | null | undefined): Status {
  if (value == null || key === "other") return "";
  const [lo, hi] = TARGETS[style][key];
  return value < lo ? "low" : value > hi ? "high" : "ok";
}

export function hardnessLabel(frozen: number) {
  if (frozen >= 0.85) return "hard — will need tempering before scooping";
  if (frozen >= 0.78) return "firm scoop";
  if (frozen >= 0.7) return "soft, easy scoop";
  return "very soft — may not hold a scoop";
}
