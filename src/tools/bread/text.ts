import { fmt, round } from "@/lib/math";
import { joinBlocks, notesBlock, table } from "@/lib/export/text";
import type { BreadResult } from "./engine";
import type { BreadState } from "./state";
import { PREFERMENTS } from "./data";
import { recipeSteps, showGrams } from "./steps";

export function toText(state: BreadState, r: BreadResult | null, name: string, notes: string): string {
  const pref = state.pref.type === "none" ? null : PREFERMENTS[state.pref.type];
  const parts = [pref?.label.toLowerCase(), state.tz.on ? "tangzhong" : ""].filter(Boolean).join(" + ");
  const title = `${name} — bread${parts ? ` · ${parts}` : ""}${r ? ` · ${fmt(r.totalG)} g dough` : ""}`;
  if (!r) return joinBlocks(title, "(no flour weight set)", notesBlock(notes));

  const batch =
    state.mode === "target"
      ? `${fmt(state.loaves)} × ${fmt(state.loafWeight)} g → ${fmt(r.flourG)} g flour`
      : `${fmt(r.flourG)} g flour`;

  const total = r.hydrationMode === "total";
  const formula = table(
    [{ header: "Ingredient" }, { header: "%", dp: 1 }, { header: "g", dp: 0 }],
    [
      ...r.flours.map((f) => [f.name + (f.missing ? " (missing)" : ""), (f.grams / r.flourG) * 100, f.grams]),
      [total ? "Water (added)" : "Water", r.addedHydration, r.waterG],
      ["Salt", state.salt, r.saltG],
      ...(r.yeastG > 0 ? [[r.yeastName, state.yeast.pct, round(r.yeastG, 1)]] : []),
      ...r.extras.map((e) => [e.name + (e.missing ? " (missing)" : ""), e.pct, e.grams]),
      ...(r.tz ? r.tz.liquids.map((l) => [`${l.name} (tangzhong)`, l.pct, l.grams]) : []),
      ["Total", r.totalPct, r.totalG],
    ],
  );

  const method = recipeSteps(state, r).map((step, i) =>
    [
      `${i + 1}. ${step.title.toUpperCase()}`,
      table(
        [{ header: "" }, { header: "" }],
        [...step.rows.map((row) => [row.name, showGrams(row)]), ["Total", `${fmt(step.total)} g`]],
        "   ",
      )
        .split("\n")
        .slice(1)
        .join("\n"),
      ...(step.hint ? ["   " + step.hint] : []),
    ].join("\n"),
  );

  const guide = [
    total
      ? `Hydration ${round(r.effHydration, 1)}% total · ${round(r.addedHydration, 1)}% added water`
      : `Hydration ${round(r.addedHydration, 1)}% added` + (Math.abs(r.effHydration - r.addedHydration) > 0.05 ? ` · ${round(r.effHydration, 1)}% effective` : ""),
    `Salt ${round(state.salt, 1)}% · blend protein ${round(r.blendProtein, 1)}%`,
    r.yeastG > 0 ? `Yeast ${round(state.yeast.pct, 2)}% ${r.yeastName.toLowerCase()} (≈ ${round(r.yeastInstantEqPct, 2)}% instant)` : state.pref.type === "levain" ? "Leavened by the levain" : "No yeast",
  ].join("\n");

  return joinBlocks(title, batch, formula, method.join("\n\n"), guide, notesBlock(notes));
}

export const summary = (s: BreadState) =>
  `${s.water}% hydration` +
  (s.pref.type !== "none" ? ` · ${PREFERMENTS[s.pref.type].label.toLowerCase()}` : "") +
  (s.tz?.on ? " · tangzhong" : "");
