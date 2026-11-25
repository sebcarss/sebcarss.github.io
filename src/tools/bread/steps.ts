import { allocate, fmt } from "@/lib/math";
import type { BreadResult, ExtraRow } from "./engine";
import type { BreadState } from "./state";
import { PREFERMENTS, TZ_STEP } from "./data";

export interface StepRow {
  name: string;
  grams: number;
  /** Decimals to print; 0 rows are rounded together so they add up. */
  dp: number;
  /** The value to print (rounded). */
  shown: number;
}

export interface Step {
  key: "tz" | "pref" | "final";
  title: string;
  hint: string;
  rows: StepRow[];
  total: number;
}

type Raw = [name: string, grams: number, dp?: number];

/** Largest-remainder rounding over the whole-gram rows, so they add up to the printed total. */
function finish(raw: Raw[]): StepRow[] {
  const whole = raw.filter((r) => (r[2] ?? 0) === 0).map((r) => r[1]);
  const rounded = allocate(whole, 0);
  let k = 0;
  return raw.map(([name, grams, dp = 0]) => ({ name, grams, dp, shown: dp === 0 ? rounded[k++]! : grams }));
}

export const showGrams = (r: StepRow) => `${fmt(r.shown, r.dp)} g`;

const yeastDp = (g: number) => (g < 1 ? 2 : 1);
const nonZero = (rows: { name: string; grams: number }[]) => rows.filter((r) => Math.abs(r.grams) > 0.004);

// Where an extra goes in the final dough: liquids with the water, fats and
// inclusions at the end.
// Butter is filed as dairy, but it goes in like a fat.
const kind = (e: ExtraRow) => (e.fat >= 50 ? "fat" : e.category);
const EARLY = new Set(["liquid", "dairy", "egg", "sweetener"]);
const LATE_ORDER = ["flavour", "other", "starch", "flour", "yeast", "fat", "inclusion"];
const lateRank = (e: ExtraRow) => {
  const i = LATE_ORDER.indexOf(kind(e));
  return i < 0 ? 1 : i;
};

/**
 * The recipe in the order you make it: tangzhong, preferment, then the final
 * dough with its ingredients in the order they go into the bowl.
 */
export function recipeSteps(state: BreadState, r: BreadResult): Step[] {
  const steps: Step[] = [];

  if (r.tz) {
    const raw: Raw[] = [
      ...nonZero(r.tz.flourRows).map((f): Raw => [f.name, f.grams]),
      ...r.tz.liquids.map((l): Raw => [l.name + (l.missing ? " (missing)" : ""), l.grams]),
    ];
    steps.push({ key: "tz", title: "Tangzhong", hint: TZ_STEP, rows: finish(raw), total: r.tz.totalG });
  }

  const p = r.pref;
  if (p) {
    const def = PREFERMENTS[p.type];
    const raw: Raw[] = [
      ...(p.seedG > 0 ? [[`Starter (${state.pref.seedHydration}% hydration)`, p.seedG] as Raw] : []),
      ...nonZero(p.flourRows).map((f): Raw => [f.name, p.seedG > 0 && p.flourG > 0 ? f.grams - (p.seedFlourG * f.grams) / p.flourG : f.grams]),
      ["Water", p.freshWaterG],
      ...(p.yeastG > 0 ? [[r.yeastName, p.yeastG, yeastDp(p.yeastG)] as Raw] : []),
      ...(p.saltG > 0 ? [["Salt", p.saltG, 1] as Raw] : []),
    ];
    steps.push({ key: "pref", title: p.label, hint: def.step, rows: finish(raw), total: p.totalG });
  }

  const f = r.final;
  const early = r.extras.filter((e) => EARLY.has(kind(e)));
  const late = r.extras.filter((e) => !EARLY.has(kind(e))).sort((a, b) => lateRank(a) - lateRank(b));
  const extraRow = (e: ExtraRow): Raw => [e.name + (e.missing ? " (missing)" : ""), e.grams];
  const lateBefore = late.filter((e) => lateRank(e) < LATE_ORDER.indexOf("yeast"));
  const lateAfter = late.filter((e) => lateRank(e) >= LATE_ORDER.indexOf("yeast"));
  const showYeast = f.yeastG > 0.004 || (state.pref.type !== "levain" && r.yeastG > 0);
  const raw: Raw[] = [
    ...(Math.abs(f.waterG) > 0.004 ? [["Water", f.waterG] as Raw] : []),
    ...early.map(extraRow),
    ...(p ? [[`All of the ${p.label.toLowerCase()}`, p.totalG] as Raw] : []),
    ...(r.tz ? [["All of the tangzhong", r.tz.totalG] as Raw] : []),
    ...nonZero(f.flourRows).map((x): Raw => [x.name, x.grams]),
    ...lateBefore.map(extraRow),
    ...(showYeast ? [[r.yeastName, f.yeastG, yeastDp(f.yeastG)] as Raw] : []),
    ["Salt", f.saltG, 1],
    ...lateAfter.map(extraRow),
  ];
  const finalHint = [
    p || r.tz ? `Mix in the ${[p?.label.toLowerCase(), r.tz ? "tangzhong" : ""].filter(Boolean).join(" and ")} with the liquids` : "",
    lateAfter.some((e) => kind(e) === "fat") ? "work in the fat once the dough comes together" : "",
    lateAfter.some((e) => kind(e) === "inclusion") ? "fold in the seeds or fruit last" : "",
  ]
    .filter(Boolean)
    .join("; ");
  steps.push({
    key: "final",
    title: steps.length ? "Final dough" : "Dough",
    hint: finalHint ? finalHint[0]!.toUpperCase() + finalHint.slice(1) + "." : "",
    rows: finish(raw),
    total: f.totalG,
  });
  return steps;
}
