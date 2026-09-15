import { fmt, mmss, round } from "@/lib/math";
import { joinBlocks, notesBlock, table } from "@/lib/export/text";
import type { RamenResult, StyleScore } from "./engine";
import type { RamenState } from "./state";
import { CRIMPS, KANSUI_FORMS, styleById, type KansuiForm } from "./data";

const fmtCut = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function toText(state: RamenState, r: RamenResult | null, top: StyleScore | null, name: string, notes: string): string {
  const title = `${name} — ramen noodles` + (r ? ` · ${fmt(r.servings, 1)} servings × ${fmt(r.servingG)} g` : "");
  if (!r) return joinBlocks(title, "(no flour weight set)", notesBlock(notes));

  const kf = KANSUI_FORMS[r.kForm as KansuiForm];
  const kansuiLabel =
    r.kForm === "none"
      ? null
      : `Kansui (${kf.label}${kf.ratio ? ` ${r.kRatioK}:${100 - r.kRatioK}` : ""}${kf.conc ? `, ${state.kansui.conc}% solution` : ""})`;

  const blend = table(
    [{ header: `Flour blend (${fmt(r.flourG)} g)` }, { header: "%", dp: 0 }, { header: "g", dp: 0 }],
    r.flourRows.map((f) => [f.name + (f.missing ? " (missing)" : ""), (f.share / r.shareTotal) * 100, f.grams]),
  );
  const dough = table(
    [{ header: "Dough" }, { header: "%", dp: 1 }, { header: "g", dp: 0 }],
    [
      ["Water", state.water, r.addedWaterG],
      ["Salt", state.salt, round(r.saltG, 1)],
      ...(kansuiLabel ? [[kansuiLabel, state.kansui.pct, round(r.kansuiG, 1)]] : []),
      ...(r.egg && r.eggPct > 0 ? [[r.egg.name, r.eggPct, round(r.eggG, 1)]] : []),
      ...(state.colour > 0 ? [["Colourant", state.colour, round(r.colourG, 2)]] : []),
      ["Total dough", r.totalPct, r.doughG],
    ],
  );

  const analysis = [
    `Effective hydration ${round(r.effHydration, 1)}% (${round(r.addedHydration, 1)}% added) · Protein ${round(r.blendProtein, 1)}% · Alkali ${round(r.alkaliEqPct, 2)}% kansui-eq`,
    `Cut #${fmtCut(r.cut)} → ${round(r.widthMm, 2)} mm · Roller ${r.roller.setting} (${round(r.thicknessMm, 2)} mm) · ${CRIMPS[r.crimpIdx]} · Age ${r.agingHours} h`,
    `Boil: ${r.cook.map(([l, s]) => `${l.split(" ")[0]} ${mmss(s)}`).join(" · ")}`,
    `Waste ${round(r.wastePct)}% → ${fmt(r.usableG)} g usable`,
  ].join("\n");

  const picked = styleById(state.style);
  const styleLine = top ? `Best match: ${top.style.label} ${Math.round(top.pct)}%` + (picked && picked.id !== top.style.id ? ` (designing for ${picked.label})` : "") : "";

  return joinBlocks(title, blend, dough, analysis, styleLine, notesBlock(notes));
}

export const summary = (s: RamenState) => `#${fmtCut(s.cut)} · ${s.water}% water` + (s.egg.ing && s.egg.pct > 0 ? ` · ${s.egg.pct}% egg` : "");
export { fmtCut };
