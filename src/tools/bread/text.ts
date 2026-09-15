import { fmt, round } from "@/lib/math";
import { joinBlocks, notesBlock, table } from "@/lib/export/text";
import type { BreadResult } from "./engine";
import type { BreadState } from "./state";
import { PREFERMENTS } from "./data";

export function toText(state: BreadState, r: BreadResult | null, name: string, notes: string): string {
  const pref = state.pref.type === "none" ? null : PREFERMENTS[state.pref.type];
  const title = `${name} — bread${pref ? ` · ${pref.label.toLowerCase()}` : ""}${r ? ` · ${fmt(r.totalG)} g dough` : ""}`;
  if (!r) return joinBlocks(title, "(no flour weight set)", notesBlock(notes));

  const batch =
    state.mode === "target"
      ? `${fmt(state.loaves)} × ${fmt(state.loafWeight)} g → ${fmt(r.flourG)} g flour`
      : `${fmt(r.flourG)} g flour`;

  const formula = table(
    [{ header: "Ingredient" }, { header: "%", dp: 1 }, { header: "g", dp: 0 }],
    [
      ...r.flours.map((f) => [f.name + (f.missing ? " (missing)" : ""), (f.grams / r.flourG) * 100, f.grams]),
      ["Water", state.water, r.waterG],
      ["Salt", state.salt, r.saltG],
      ...(r.yeastG > 0 ? [[r.yeastName, state.yeast.pct, round(r.yeastG, 1)]] : []),
      ...r.extras.map((e) => [e.name + (e.missing ? " (missing)" : ""), e.pct, e.grams]),
      ["Total", r.totalPct, r.totalG],
    ],
  );

  let prefBlock = "";
  if (r.pref) {
    const p = r.pref;
    const build = table(
      [{ header: p.label }, { header: "g", dp: 0 }],
      [
        ...(p.seedG > 0 ? [[`Starter (${state.pref.seedHydration}% hydration)`, p.seedG]] : []),
        ...p.flourRows.map((f) => [f.name, p.seedG > 0 ? f.grams - (p.seedFlourG * f.grams) / p.flourG : f.grams]),
        ["Water", p.freshWaterG],
        ...(p.yeastG > 0 ? [[r.yeastName, round(p.yeastG, 2)]] : []),
        ...(p.saltG > 0 ? [["Salt", round(p.saltG, 1)]] : []),
        ["Total", p.totalG],
      ],
    );
    const final = table(
      [{ header: "Final dough" }, { header: "g", dp: 0 }],
      [
        ...p.finalFlourRows.map((f) => [f.name, f.grams]),
        ["Water", p.finalWaterG],
        ["Salt", round(p.finalSaltG, 1)],
        ...(p.finalYeastG > 0 ? [[r.yeastName, round(p.finalYeastG, 2)]] : []),
        ...r.extras.map((e) => [e.name, e.grams]),
        [`All of the ${p.label.toLowerCase()}`, p.totalG],
        ["Total", p.finalTotalG],
      ],
    );
    prefBlock = build + "\n\n" + final;
  }

  const guide = [
    `Hydration ${round(r.addedHydration, 1)}% added` + (Math.abs(r.effHydration - r.addedHydration) > 0.05 ? ` · ${round(r.effHydration, 1)}% effective` : ""),
    `Salt ${round(state.salt, 1)}% · blend protein ${round(r.blendProtein, 1)}%`,
    r.yeastG > 0 ? `Yeast ${round(state.yeast.pct, 2)}% ${r.yeastName.toLowerCase()} (≈ ${round(r.yeastInstantEqPct, 2)}% instant)` : state.pref.type === "levain" ? "Leavened by the levain" : "No yeast",
  ].join("\n");

  return joinBlocks(title, batch, formula, prefBlock, guide, notesBlock(notes));
}

export const summary = (s: BreadState) =>
  `${s.water}% hydration` + (s.pref.type !== "none" ? ` · ${PREFERMENTS[s.pref.type].label.toLowerCase()}` : "");
