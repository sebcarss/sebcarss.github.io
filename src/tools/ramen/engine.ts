import { water as waterOf, type Ingredient } from "@/lib/ingredients";
import { clamp } from "@/lib/math";
import {
  ALKALI_REF, ATTRS, BROTHS, CARB_BICARB, CARB_K, CARB_NA, COLOUR_PALE, COLOUR_YELLOW, COOK_K, CUT_NUMBERS, DONENESS,
  KANSUI_FORMS, STYLES, rollerFor, styleBand, type AttrKey, type Attr, type KansuiForm, type RollerSetting, type Style,
} from "./data";
import type { RamenState } from "./state";

export type Lookup = (id: string) => Ingredient | undefined;

export interface FlourRow { ing: string; name: string; share: number; grams: number; protein: number; ash: number; missing: boolean }

export interface RamenResult {
  shareTotal: number;
  flourG: number;
  doughNeededG: number | null;
  flourRows: FlourRow[];
  blendProtein: number;
  blendAsh: number;
  totalPct: number;
  addedWaterG: number;
  kansuiWaterG: number;
  eggWaterG: number;
  totalWaterG: number;
  addedHydration: number;
  effHydration: number;
  kForm: KansuiForm;
  kansuiPct: number;
  kansuiG: number;
  kansuiSaltG: number;
  alkaliEqPct: number;
  kRatioK: number;
  egg: Ingredient | null;
  eggPct: number;
  eggG: number;
  eggFatG: number;
  eggFatPct: number;
  eggProteinPct: number;
  eggWholeEqPct: number;
  doughProtein: number;
  saltG: number;
  colourG: number;
  doughG: number;
  usableG: number;
  servings: number;
  servingG: number;
  wastePct: number;
  cut: number;
  widthMm: number;
  roller: RollerSetting;
  thicknessMm: number;
  aspect: number;
  areaMm2: number;
  shapeLabel: string;
  crimpIdx: number;
  agingHours: number;
  cook: [string, number][];
  colourRgb: number[];
  yellow: number;
  texture: { chew: number; firmness: number; smoothness: number };
  problems: string[];
  missing: string[];
}

export function whyNull(state: RamenState): string | null {
  const shareTotal = state.flours.reduce((s, f) => s + f.share, 0);
  if (!(shareTotal > 0)) return "Give at least one flour a share above 0.";
  if (state.mode === "flour" && !(state.flourGrams > 0)) return "Enter a flour weight.";
  if (state.mode === "target" && !(state.servings > 0 && state.servingG > 0)) return "Enter servings and grams per serving.";
  return null;
}

/**
 * Port of the legacy compute(): flour blend → alkali normalised to a 90:10
 * kansui powder → egg → water summed in exactly one place → geometry, boil
 * time, colour and texture. Differences from the legacy page are deliberate
 * fixes: egg is a real ingredient (its water, fat and protein all count and
 * whole-egg equivalence is by solids), kansui is ignored when the form is
 * "none", waste is clamped to the input's range.
 */
export function compute(state: RamenState, lookup: Lookup): RamenResult | null {
  const missing: string[] = [];
  const shareTotal = state.flours.reduce((s, f) => s + f.share, 0);
  if (!(shareTotal > 0)) return null;

  const kForm = state.kansui.form as KansuiForm;
  const kf = KANSUI_FORMS[kForm];
  const kansuiPct = kForm === "none" ? 0 : state.kansui.pct;
  const eggIng = state.egg.ing ? (lookup(state.egg.ing) ?? null) : null;
  if (state.egg.ing && !eggIng) missing.push(state.egg.ing);
  const eggPct = eggIng ? state.egg.pct : 0;
  const totalPct = 100 + state.water + state.salt + kansuiPct + eggPct + state.colour;

  const wastePct = clamp(state.waste, 0, 30);
  const servingG = Math.max(state.servingG, 1);

  let flourG: number;
  let doughNeededG: number | null = null;
  if (state.mode === "flour") flourG = state.flourGrams;
  else {
    doughNeededG = (state.servings * servingG) / (1 - wastePct / 100);
    flourG = doughNeededG / (totalPct / 100);
  }
  if (!(flourG > 0)) return null;

  const flourRows: FlourRow[] = state.flours.map((f) => {
    const ing = lookup(f.ing);
    if (!ing) missing.push(f.ing);
    return {
      ing: f.ing,
      name: ing?.name ?? f.ing,
      share: f.share,
      grams: (f.share / shareTotal) * flourG,
      protein: ing?.solids.protein ?? 0,
      ash: ing?.solids.ash ?? 0,
      missing: !ing,
    };
  });
  const blendProtein = flourRows.reduce((s, f) => s + f.share * f.protein, 0) / shareTotal;
  const blendAsh = flourRows.reduce((s, f) => s + f.share * f.ash, 0) / shareTotal;

  // -- Alkali. Every form is reduced to a "% of 90:10 kansui powder".
  const kSolids = kf.conc ? clamp(state.kansui.conc, 0, 100) / 100 : (kf.solids ?? 1);
  const kRatioK = kf.fixedK !== null ? kf.fixedK : clamp(state.kansui.ratio, 0, 100);
  const kansuiG = (flourG * kansuiPct) / 100;
  const kansuiSaltG = kansuiG * kSolids;
  const kansuiWaterG = kansuiG - kansuiSaltG;
  const carbPerG = kf.bicarb ? CARB_BICARB : (kRatioK / 100) * CARB_K + (1 - kRatioK / 100) * CARB_NA;
  const alkaliEqPct = kForm === "none" ? 0 : ((kansuiSaltG / flourG) * 100 * carbPerG) / ALKALI_REF;

  // -- Egg, as a real ingredient: water, fat and protein all come from the DB.
  const eggG = (flourG * eggPct) / 100;
  const eggWaterFrac = eggIng ? waterOf(eggIng) / 100 : 0;
  const eggFatFrac = eggIng ? eggIng.solids.fat / 100 : 0;
  const eggProteinFrac = eggIng ? eggIng.solids.protein / 100 : 0;
  const eggWaterG = eggG * eggWaterFrac;
  const eggFatG = eggG * eggFatFrac;
  const eggFatPct = eggPct * eggFatFrac;
  const eggProteinPct = eggPct * eggProteinFrac;
  const eggWholeEqPct = eggPct * (eggIng?.egg?.wholeEq ?? 0);
  const eggColour = eggIng?.egg?.colour ?? 0;

  // -- Water is summed in exactly one place.
  const addedWaterG = (flourG * state.water) / 100;
  const totalWaterG = addedWaterG + kansuiWaterG + eggWaterG;
  const addedHydration = state.water;
  const effHydration = (totalWaterG / flourG) * 100;

  const saltG = (flourG * state.salt) / 100;
  const colourG = (flourG * state.colour) / 100;
  const doughG = flourG + addedWaterG + kansuiG + saltG + eggG + colourG;
  const usableG = doughG * (1 - wastePct / 100);
  const servings = usableG / servingG;

  // -- Geometry.
  const cut = state.cut;
  const widthMm = 30 / cut;
  const roller = rollerFor(state.thickness);
  const thicknessMm = roller.mm;
  const aspect = widthMm / thicknessMm;
  const areaMm2 = widthMm * thicknessMm;
  const shapeLabel = aspect < 0.8 ? "tall — deeper than it is wide" : aspect < 1.25 ? "square (kaku)" : aspect < 2 ? "flat" : "wide ribbon (hira-uchi)";
  const crimpIdx = state.crimp;
  const agingHours = state.aging;

  const base = COOK_K * areaMm2 ** 0.85 * (1 + (effHydration - 35) / 100);
  const cook = DONENESS.map(([label, k]): [string, number] => [label, Math.max(base * k, 10)]);

  // -- Colour and texture, both openly heuristic. Egg yolk colours the dough
  // and its fat smooths it; its protein adds a little bite.
  const yellow = clamp(alkaliEqPct * 0.55 + (eggPct * eggColour) / 20 + state.colour * 3, 0, 1.4);
  const t = yellow / 1.4;
  const colourRgb = COLOUR_PALE.map((c, i) => Math.round(c + (COLOUR_YELLOW[i]! - c) * t));

  const texture = {
    chew: clamp(30 + (blendProtein - 10) * 9 + alkaliEqPct * 18 - (effHydration - 35) * 1.1 + (thicknessMm - 1.4) * 6 + eggProteinPct * 4, 0, 100),
    firmness: clamp(25 + (blendProtein - 10) * 8 - (effHydration - 35) * 1.8 + alkaliEqPct * 10 + eggProteinPct * 3, 0, 100),
    smoothness: clamp(40 + (effHydration - 32) * 2.2 - (blendAsh - 0.5) * 18 + Math.min(agingHours, 72) * 0.28 + eggFatPct * 4, 0, 100),
  };

  const problems: string[] = [];
  if (effHydration < 30) problems.push(`at ${effHydration.toFixed(1)}% this will not come together in a domestic mixer — expect a shaggy crumb that has to be sheeted and folded`);
  if (effHydration > 50) problems.push("very slack for ramen — it will stick in the cutter without generous uchiko");
  if (blendProtein < 9.5) problems.push("blend protein is low — the sheet will tear as it thins");
  if (blendProtein > 14.5) problems.push("blend protein is very high — sheeting will fight you, so rest it longer");
  if (alkaliEqPct > 1.8) problems.push("alkali is high enough to taste soapy");
  if (state.salt === 0) problems.push("no salt — the gluten will be slack and the noodle bland");
  if (aspect > 3) problems.push("that is a ribbon, not a ramen noodle — widen the roller gap or use a finer cut");
  if (Math.round(shareTotal) !== 100 && state.flours.length > 1) problems.push(`flour shares add up to ${shareTotal.toFixed(1)}%, not 100 — percentages are still taken against the total`);

  return {
    shareTotal, flourG, doughNeededG, flourRows, blendProtein, blendAsh, totalPct,
    addedWaterG, kansuiWaterG, eggWaterG, totalWaterG, addedHydration, effHydration,
    kForm, kansuiPct, kansuiG, kansuiSaltG, alkaliEqPct, kRatioK,
    egg: eggIng, eggPct, eggG, eggFatG, eggFatPct, eggProteinPct, eggWholeEqPct,
    doughProtein: blendProtein + eggProteinPct,
    saltG, colourG, doughG, usableG, servings, servingG, wastePct,
    cut, widthMm, roller, thicknessMm, aspect, areaMm2, shapeLabel, crimpIdx, agingHours,
    cook, colourRgb, yellow, texture, problems, missing: Array.from(new Set(missing)),
  };
}

// ---- Style matching --------------------------------------------------------

export type AttrValues = Record<AttrKey, number>;

export function attrValues(r: RamenResult): AttrValues {
  return {
    hydration: r.effHydration,
    width: r.widthMm,
    protein: r.blendProtein,
    thickness: r.thicknessMm,
    alkali: r.alkaliEqPct,
    crimp: r.crimpIdx,
    egg: r.eggWholeEqPct,
    salt: state_salt(r),
    aging: r.agingHours,
  };
}
const state_salt = (r: RamenResult) => (r.saltG / r.flourG) * 100;

/**
 * 1.0 dead centre of the band, 0.98 at its edges, then a linear decay to zero
 * across `tol`. The tiny in-band slope is only there to break ties between
 * styles whose bands overlap; a reference formula therefore scores 100 % on
 * its own style and slightly less on every neighbour.
 */
export function scoreAttr(v: number, [lo, hi]: readonly [number, number], tol: number) {
  const mid = (lo + hi) / 2;
  const half = (hi - lo) / 2 || 1;
  if (v >= lo && v <= hi) return 1 - 0.02 * (Math.abs(v - mid) / half);
  const d = v < lo ? lo - v : v - hi;
  return Math.max(0, 0.98 - d / tol);
}

export interface StyleScore { style: Style; pct: number; misses: Attr[] }

export function scoreStyle(vals: AttrValues, style: Style): StyleScore {
  let sum = 0;
  let wsum = 0;
  const misses: Attr[] = [];
  for (const a of ATTRS) {
    const band = styleBand(style, a.key);
    const s = scoreAttr(vals[a.key], band, a.tol);
    sum += s * a.w;
    wsum += a.w;
    if (!(vals[a.key] >= band[0] && vals[a.key] <= band[1])) misses.push(a);
  }
  return { style, pct: (sum / wsum) * 100, misses };
}

export const rankStyles = (vals: AttrValues, n = 5) =>
  STYLES.map((s) => scoreStyle(vals, s)).sort((a, b) => b.pct - a.pct).slice(0, n);

export function brothsSuiting(r: RamenResult) {
  return Object.values(BROTHS)
    .filter(
      (b) =>
        r.effHydration >= b.hydration[0] && r.effHydration <= b.hydration[1] &&
        r.cut >= b.cut[0] && r.cut <= b.cut[1] &&
        r.blendProtein >= b.protein[0] && r.blendProtein <= b.protein[1],
    )
    .map((b) => b.label);
}

export const stylesForCut = (cut: number) => STYLES.filter((s) => cut >= s.cut[0] && cut <= s.cut[1]).map((s) => s.label);

export const nearestStylesForCut = (cut: number) =>
  STYLES.map((s) => ({ s, d: Math.min(Math.abs(s.cut[0] - cut), Math.abs(s.cut[1] - cut)) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 2)
    .map((z) => z.s.label);

/**
 * The formula a style asks for: mid-band on everything, the nearest standard
 * cut number and roller gap. Keeps the current egg form (defaulting to whole
 * egg when the style wants egg and none is set) and back-solves the egg %
 * from whole-egg equivalence, then reduces added water by the egg's water so
 * effective hydration lands on target.
 */
export function referenceFormula(style: Style, current: RamenState, lookup: Lookup): RamenState {
  const mid = (k: keyof Style) => {
    const v = style[k] as readonly [number, number];
    return (v[0] + v[1]) / 2;
  };
  const r2 = (v: number, dp: number) => Math.round(v * 10 ** dp) / 10 ** dp;
  const wantsEgg = mid("egg") > 0;
  let eggIngId: string | null = wantsEgg ? (current.egg.ing ?? "egg-whole") : null;
  let eggIng = eggIngId ? lookup(eggIngId) : undefined;
  if (eggIngId && !eggIng) {
    eggIngId = "egg-whole";
    eggIng = lookup(eggIngId);
  }
  const wholeEq = eggIng?.egg?.wholeEq ?? 1;
  const eggPct = wantsEgg ? r2(mid("egg") / wholeEq, 1) : 0;
  const eggWater = eggIng ? (eggPct * waterOf(eggIng)) / 100 : 0;
  const alkali = mid("alkali");
  const targetCut = mid("cut");
  const cut = CUT_NUMBERS.reduce((best, c) => (Math.abs(c - targetCut) < Math.abs(best - targetCut) ? c : best));
  return {
    ...current,
    flours: [{ ing: referenceFlourFor(mid("protein"), lookup), share: 100 }],
    egg: { ing: eggIngId, pct: eggPct },
    kansui: { ...current.kansui, form: alkali > 0 ? "powder" : "none", pct: alkali > 0 ? r2(alkali, 2) : 0, ratio: 90 },
    water: r2(mid("hydration") - eggWater, 1),
    salt: r2(mid("salt"), 1),
    colour: 0,
    aging: Math.round(mid("aging")),
    servingG: style.serving,
    cut,
    thickness: rollerFor(r2(mid("thickness"), 2)).mm,
    crimp: Math.round(mid("crimp")),
    style: style.id,
  };
}

/** Pick the built-in flour whose protein is closest to the target. */
function referenceFlourFor(protein: number, lookup: Lookup) {
  const candidates = ["hakurikiko", "churikiko", "plain-flour", "t65-flour", "kyorikiko", "00-flour", "strong-white-flour", "very-strong-flour"];
  let best = "kyorikiko";
  let bestD = Infinity;
  for (const id of candidates) {
    const p = lookup(id)?.solids.protein;
    if (p == null) continue;
    const d = Math.abs(p - protein);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}
