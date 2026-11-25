import { water as waterOf, type Ingredient } from "@/lib/ingredients";
import { round } from "@/lib/math";
import { PREFERMENTS } from "./data";
import type { BreadState } from "./state";

export type Lookup = (id: string) => Ingredient | undefined;

export interface FlourRow { ing: string; name: string; share: number; grams: number; protein: number; ash: number; missing: boolean }
export interface ExtraRow { ing: string; name: string; pct: number; grams: number; waterG: number; missing: boolean; category: string; fat: number }
export interface GramRow { name: string; grams: number }

export interface TzResult {
  flourG: number;
  flourRows: GramRow[];
  liquids: ExtraRow[];
  liquidG: number;
  /** Water inside the liquids (all of it for water, ~87.5 % for whole milk). */
  waterG: number;
  totalG: number;
}

/** What goes into the bowl at the end, besides any preferment or tangzhong. */
export interface FinalDough {
  flourG: number;
  flourRows: GramRow[];
  waterG: number;
  saltG: number;
  yeastG: number;
  totalG: number;
}

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
  flourRows: GramRow[];
  problems: string[];
}

export interface BreadResult {
  flourG: number;
  totalPct: number;
  totalG: number;
  /** Water you pour in (all of it, across preferment and final dough). */
  waterG: number;
  /** water % × flour: in total mode the hydration target in grams, else = waterG. */
  targetWaterG: number;
  hydrationMode: BreadState["hydrationMode"];
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
  /** Added water as a % of flour. */
  addedHydration: number;
  /** Water inside every other ingredient: extras, yeast and tangzhong liquids. */
  liquidWaterG: number;
  totalWaterG: number;
  effHydration: number;
  tz: TzResult | null;
  pref: PrefResult | null;
  final: FinalDough;
  problems: string[];
  missing: string[];
}

const splitByShares = (flours: FlourRow[], shareTotal: number, grams: number): GramRow[] =>
  flours.map((f) => ({ name: f.name, grams: shareTotal > 0 ? (grams * f.share) / shareTotal : grams / flours.length }));

const finite = (v: number) => (Number.isFinite(v) ? v : 0);

/**
 * Baker's percentages: flour = 100 %, everything else a % of total flour.
 *
 * Hydration counts the water inside every non-flour ingredient (milk, egg,
 * butter, honey, fresh yeast, tangzhong liquids); flour moisture never
 * counts. In "total" mode the water % is that target, and the water you
 * actually add is whatever's left after the other ingredients' water. In
 * "added" mode (recipes saved before total mode) it's the water poured in.
 *
 * The preferment and the tangzhong are splits of the same totals: their
 * flour comes out of the 100 % and the preferment's water out of the added
 * water. The tangzhong's liquids are ingredients in their own right whose
 * water counts toward hydration.
 */
export function compute(state: BreadState, lookup: Lookup): BreadResult | null {
  const missing: string[] = [];
  const problems: string[] = [];
  const isLevain = state.pref.type === "levain";
  const total = state.hydrationMode === "total";
  const yeastIng = lookup(state.yeast.ing);
  const yeastInstantEq = yeastIng?.yeast?.instantEq ?? 1;
  if (!yeastIng) missing.push(state.yeast.ing);
  const yeastPct = isLevain ? 0 : state.yeast.pct;

  // Ingredients that carry water, as % of flour (so target mode can solve for flour).
  const withWater = (rows: { ing: string; pct: number }[]) =>
    rows.map((e) => {
      const ing = lookup(e.ing);
      if (!ing) missing.push(e.ing);
      const pct = finite(e.pct);
      return { e, ing, pct, waterPct: ing ? (pct * waterOf(ing)) / 100 : 0 };
    });
  const extrasIn = withWater(state.extras);
  const tzOn = state.tz.on;
  const tzIn = tzOn ? withWater(state.tz.liquids) : [];
  const sumPct = (xs: { pct: number }[]) => xs.reduce((s, x) => s + x.pct, 0);
  const sumWater = (xs: { waterPct: number }[]) => xs.reduce((s, x) => s + x.waterPct, 0);
  const yeastWaterPct = yeastIng ? (yeastPct * waterOf(yeastIng)) / 100 : 0;
  const liquidWaterPct = sumWater(extrasIn) + sumWater(tzIn) + yeastWaterPct;

  const addedPct = total ? Math.max(0, state.water - liquidWaterPct) : state.water;
  if (total && state.water < liquidWaterPct - 1e-9)
    problems.push(
      `the other ingredients already carry ${round(liquidWaterPct, 1)}% water — more than your ${round(state.water, 1)}% hydration, so no water is added`,
    );

  const prefDef = state.pref.type === "none" ? null : PREFERMENTS[state.pref.type];
  const prefYeastOnTop =
    prefDef && state.pref.yeastSeparate && prefDef.yeastPct !== null && prefDef.yeastPct !== "recipe"
      ? (state.pref.flourPct / 100) * state.pref.yeastPct
      : 0;
  const tzFlourPct = tzOn ? finite(state.tz.flourPct) : 0;
  const totalPct = 100 + addedPct + state.salt + yeastPct + sumPct(extrasIn) + sumPct(tzIn) + prefYeastOnTop;

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

  const toRow = ({ e, ing, pct, waterPct }: (typeof extrasIn)[number]): ExtraRow => ({
    ing: e.ing,
    name: ing?.name ?? e.ing,
    pct,
    grams: g(pct),
    waterG: g(waterPct),
    missing: !ing,
    category: ing?.category ?? "other",
    fat: ing?.solids.fat ?? 0,
  });
  const extras = extrasIn.map(toRow);
  const extrasG = extras.reduce((s, e) => s + e.grams, 0);

  const waterG = g(addedPct);
  const saltG = g(state.salt);
  const yeastG = g(yeastPct);
  const liquidWaterG = g(liquidWaterPct);
  const totalWaterG = waterG + liquidWaterG;
  const totalG = g(totalPct);

  // Tangzhong.
  let tz: TzResult | null = null;
  if (tzOn) {
    const liquids = tzIn.map(toRow);
    const tf = g(tzFlourPct);
    const liquidG = liquids.reduce((s, l) => s + l.grams, 0);
    tz = {
      flourG: tf,
      flourRows: splitByShares(flours, shareTotal, tf),
      liquids,
      liquidG,
      waterG: liquids.reduce((s, l) => s + l.waterG, 0),
      totalG: tf + liquidG,
    };
  }

  // Preferment.
  let pref: PrefResult | null = null;
  let finalYeastG = yeastG;
  let finalSaltG = saltG;
  let finalWaterG = waterG;
  let prefFlourG = 0;
  if (prefDef && state.pref.type !== "none") {
    const p = state.pref;
    const pf = g(p.flourPct);
    // Pâte fermentée is a piece of the dough: the water it holds is the water you add.
    const hydration = prefDef.hydration === "recipe" ? addedPct : p.hydration;
    const pw = (pf * hydration) / 100;
    const py = isLevain ? 0 : prefDef.yeastPct === "recipe" ? yeastG * (p.flourPct / 100) : (pf * p.yeastPct) / 100;
    const ps = prefDef.salted ? saltG * (p.flourPct / 100) : 0;
    const seedG = isLevain ? p.seedG : 0;
    const seedFlourG = seedG / (1 + p.seedHydration / 100);
    const seedWaterG = seedG - seedFlourG;
    finalYeastG = state.pref.yeastSeparate && prefDef.yeastPct !== "recipe" ? yeastG : yeastG - py;
    finalWaterG = waterG - pw;
    finalSaltG = saltG - ps;
    prefFlourG = pf;
    const pp: string[] = [];
    if (flourG - pf < 0) pp.push("the preferment uses more than all of the flour — lower the flour prefermented %");
    if (finalWaterG < 0)
      pp.push(
        total
          ? "the preferment needs more water than is left to add once the other ingredients' water is counted — raise the hydration or shrink the preferment"
          : "the preferment needs more water than the whole recipe has — raise overall hydration or shrink the preferment",
      );
    if (finalYeastG < 0) pp.push("the preferment uses more yeast than the total — raise the yeast %, lower the preferment yeast, or count it separately");
    if (pf - seedFlourG < 0 || pw - seedWaterG < 0) pp.push("the starter seed is bigger than the levain it builds — use less starter or a bigger levain");
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
      totalG: pf + pw + py + ps,
      flourRows: splitByShares(flours, shareTotal, pf),
      problems: pp,
    };
  }

  const finalFlourG = flourG - prefFlourG - (tz?.flourG ?? 0);
  if (tz && finalFlourG < 0 && flourG - prefFlourG >= 0)
    problems.push(`the tangzhong${pref ? " and preferment together use" : " uses"} more than all of the flour — use less flour in the tangzhong`);
  const final: FinalDough = {
    flourG: finalFlourG,
    flourRows: splitByShares(flours, shareTotal, finalFlourG),
    waterG: finalWaterG,
    saltG: finalSaltG,
    yeastG: finalYeastG,
    totalG: finalFlourG + finalWaterG + finalSaltG + finalYeastG + extrasG + (pref?.totalG ?? 0) + (tz?.totalG ?? 0),
  };

  if (Math.abs(round(shareTotal, 1) - 100) > 0.05 && state.flours.length > 1)
    problems.push(`flour shares add up to ${round(shareTotal, 1)}%, not 100 — grams are split in proportion anyway`);

  return {
    flourG,
    totalPct,
    totalG,
    waterG,
    targetWaterG: g(state.water),
    hydrationMode: state.hydrationMode,
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
    addedHydration: addedPct,
    liquidWaterG,
    totalWaterG,
    effHydration: (totalWaterG / flourG) * 100,
    tz,
    pref,
    final,
    problems,
    missing: Array.from(new Set(missing)),
  };
}
