import { water as waterOf, type Ingredient } from "@/lib/ingredients";
import { round } from "@/lib/math";
import { PREFERMENTS } from "./data";
import type { BreadState } from "./state";

export type Lookup = (id: string) => Ingredient | undefined;

export interface FlourRow { ing: string; name: string; share: number; grams: number; protein: number; ash: number; missing: boolean }
export interface ExtraRow { ing: string; name: string; pct: number; grams: number; waterG: number; missing: boolean }

export interface PrefResult {
  type: Exclude<BreadState["pref"]["type"], "none">;
  label: string;
  flourG: number;
  waterG: number;
  yeastG: number;
  saltG: number;
  hydration: number;
  seedG: number;
  seedFlourG: number;
  seedWaterG: number;
  freshFlourG: number;
  freshWaterG: number;
  totalG: number;
  flourRows: { name: string; grams: number }[];
  finalFlourG: number;
  finalWaterG: number;
  finalYeastG: number;
  finalSaltG: number;
  finalFlourRows: { name: string; grams: number }[];
  finalTotalG: number;
  problems: string[];
}

export interface BreadResult {
  flourG: number;
  totalPct: number;
  totalG: number;
  waterG: number;
  saltG: number;
  yeastG: number;
  yeastName: string;
  yeastInstantEq: number;
  yeastInstantEqPct: number;
  yeastInstantG: number;
  flours: FlourRow[];
  shareTotal: number;
  blendProtein: number;
  blendAsh: number;
  extras: ExtraRow[];
  addedHydration: number;
  extraWaterG: number;
  totalWaterG: number;
  effHydration: number;
  pref: PrefResult | null;
  problems: string[];
  missing: string[];
}

const splitByShares = (flours: FlourRow[], shareTotal: number, grams: number) =>
  flours.map((f) => ({ name: f.name, grams: shareTotal > 0 ? (grams * f.share) / shareTotal : grams / flours.length }));

/**
 * Baker's percentages: flour = 100 %, everything else a % of total flour.
 * Effective hydration counts the water inside every non-flour ingredient
 * (milk, egg, butter, honey, fresh yeast…) — flour moisture never counts.
 * The preferment is a pure split of the same totals, so the grand totals
 * never change unless its yeast is explicitly counted separately.
 */
export function compute(state: BreadState, lookup: Lookup): BreadResult | null {
  const missing: string[] = [];
  const isLevain = state.pref.type === "levain";
  const yeastIng = lookup(state.yeast.ing);
  const yeastInstantEq = yeastIng?.yeast?.instantEq ?? 1;
  if (!yeastIng) missing.push(state.yeast.ing);
  const yeastPct = isLevain ? 0 : state.yeast.pct;

  const extrasPct = state.extras.reduce((s, e) => s + (Number.isFinite(e.pct) ? e.pct : 0), 0);
  const prefDef = state.pref.type === "none" ? null : PREFERMENTS[state.pref.type];
  const prefYeastOnTop =
    prefDef && state.pref.yeastSeparate && prefDef.yeastPct !== null && prefDef.yeastPct !== "recipe"
      ? (state.pref.flourPct / 100) * state.pref.yeastPct
      : 0;
  const totalPct = 100 + state.water + state.salt + yeastPct + extrasPct + prefYeastOnTop;

  let flourG: number;
  if (state.mode === "flour") flourG = state.flourGrams;
  else flourG = (state.loaves * state.loafWeight) / (totalPct / 100);
  if (!(flourG > 0)) return null;
  const g = (pct: number) => (flourG * pct) / 100;

  // Flour blend.
  const shareTotal = state.flours.reduce((s, f) => s + f.share, 0);
  const flours: FlourRow[] = state.flours.map((f) => {
    const ing = lookup(f.ing);
    if (!ing) missing.push(f.ing);
    const frac = shareTotal > 0 ? f.share / shareTotal : 1 / state.flours.length;
    return {
      ing: f.ing,
      name: ing?.name ?? f.ing,
      share: f.share,
      grams: flourG * frac,
      protein: ing?.solids.protein ?? 0,
      ash: ing?.solids.ash ?? 0,
      missing: !ing,
    };
  });
  const blendProtein = flours.reduce((s, f) => s + (f.grams / flourG) * f.protein, 0);
  const blendAsh = flours.reduce((s, f) => s + (f.grams / flourG) * f.ash, 0);

  // Extras carry their own water.
  const extras: ExtraRow[] = state.extras.map((e) => {
    const ing = lookup(e.ing);
    if (!ing) missing.push(e.ing);
    const grams = g(e.pct);
    return { ing: e.ing, name: ing?.name ?? e.ing, pct: e.pct, grams, waterG: ing ? (grams * waterOf(ing)) / 100 : 0, missing: !ing };
  });

  const waterG = g(state.water);
  const saltG = g(state.salt);
  const yeastG = g(yeastPct);
  const yeastWaterG = yeastIng ? (yeastG * waterOf(yeastIng)) / 100 : 0;
  const extraWaterG = extras.reduce((s, e) => s + e.waterG, 0) + yeastWaterG;
  const totalWaterG = waterG + extraWaterG;
  const totalG = g(totalPct);

  // Preferment.
  let pref: PrefResult | null = null;
  if (prefDef && state.pref.type !== "none") {
    const p = state.pref;
    const pf = g(p.flourPct);
    const hydration = prefDef.hydration === "recipe" ? state.water : p.hydration;
    const pw = (pf * hydration) / 100;
    const py = isLevain ? 0 : prefDef.yeastPct === "recipe" ? yeastG * (p.flourPct / 100) : (pf * p.yeastPct) / 100;
    const ps = prefDef.salted ? saltG * (p.flourPct / 100) : 0;
    const seedG = isLevain ? p.seedG : 0;
    const seedFlourG = seedG / (1 + p.seedHydration / 100);
    const seedWaterG = seedG - seedFlourG;
    const finalYeastG = state.pref.yeastSeparate && prefDef.yeastPct !== "recipe" ? yeastG : yeastG - py;
    const finalFlourG = flourG - pf;
    const finalWaterG = waterG - pw;
    const finalSaltG = saltG - ps;
    const prefTotal = pf + pw + py + ps;
    const problems: string[] = [];
    if (finalFlourG < 0) problems.push("the preferment uses more than all of the flour — lower the flour prefermented %");
    if (finalWaterG < 0) problems.push("the preferment needs more water than the whole recipe has — raise overall hydration or shrink the preferment");
    if (finalYeastG < 0) problems.push("the preferment uses more yeast than the total — raise the yeast %, lower the preferment yeast, or count it separately");
    if (pf - seedFlourG < 0 || pw - seedWaterG < 0) problems.push("the starter seed is bigger than the levain it builds — use less starter or a bigger levain");
    pref = {
      type: state.pref.type,
      label: prefDef.label,
      flourG: pf,
      waterG: pw,
      yeastG: py,
      saltG: ps,
      hydration,
      seedG,
      seedFlourG,
      seedWaterG,
      freshFlourG: pf - seedFlourG,
      freshWaterG: pw - seedWaterG,
      totalG: prefTotal,
      flourRows: splitByShares(flours, shareTotal, pf),
      finalFlourG,
      finalWaterG,
      finalYeastG,
      finalSaltG,
      finalFlourRows: splitByShares(flours, shareTotal, finalFlourG),
      finalTotalG: finalFlourG + finalWaterG + finalSaltG + finalYeastG + extras.reduce((s, e) => s + e.grams, 0) + prefTotal,
      problems,
    };
  }

  const problems: string[] = [];
  if (Math.abs(round(shareTotal, 1) - 100) > 0.05 && state.flours.length > 1)
    problems.push(`flour shares add up to ${round(shareTotal, 1)}%, not 100 — grams are split in proportion anyway`);

  return {
    flourG,
    totalPct,
    totalG,
    waterG,
    saltG,
    yeastG,
    yeastName: yeastIng?.name ?? state.yeast.ing,
    yeastInstantEq,
    yeastInstantEqPct: yeastPct * yeastInstantEq,
    yeastInstantG: yeastG * yeastInstantEq,
    flours,
    shareTotal,
    blendProtein,
    blendAsh,
    extras,
    addedHydration: state.water,
    extraWaterG,
    totalWaterG,
    effHydration: (totalWaterG / flourG) * 100,
    pref,
    problems,
    missing: Array.from(new Set(missing)),
  };
}
