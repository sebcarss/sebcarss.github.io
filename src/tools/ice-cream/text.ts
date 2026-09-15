import { fmt, round } from "@/lib/math";
import { joinBlocks, notesBlock, table } from "@/lib/export/text";
import type { IceCreamResult } from "./engine";
import { TARGETS, METRICS } from "./targets";
import type { IceCreamState } from "./state";

export function toText(state: IceCreamState, r: IceCreamResult | null, name: string, notes: string): string {
  const t = TARGETS[state.style];
  const title = `${name} — ${t.label}${r ? ` · ${fmt(r.grams)} g` : ""}`;
  if (!r) return joinBlocks(title, "(empty recipe)", notesBlock(notes));

  const rows = table(
    [{ header: "Ingredient" }, { header: "g", dp: 0 }, { header: "%", dp: 1 }],
    [
      ...r.rows.filter((x) => x.grams > 0).map((x) => [x.name + (x.missing ? " (missing)" : ""), x.grams, (x.grams / r.grams) * 100]),
      ["Total", r.grams, 100],
    ],
  );

  const m = r.metrics;
  const tgt = (k: keyof typeof t) => {
    const v = t[k];
    return Array.isArray(v) ? ` (${v[0]}–${v[1]})` : "";
  };
  const comp = [
    `Fat ${round(m.fat, 1)}%${tgt("fat")} · Sugar ${round(m.sugar, 1)}%${tgt("sugar")} · MSNF ${round(m.msnf, 1)}%${tgt("msnf")}`,
    `Other solids ${round(m.other, 1)}% · Total solids ${round(m.solids, 1)}%${tgt("solids")}`,
    `POD ${round(m.pod)}${tgt("pod")} · PAC ${round(m.pac)}${tgt("pac")}`,
    `Water ${round(100 - m.solids, 1)}% · freezing point ≈ ${round(r.freezingPointC, 1)} °C · lactose ${round(r.lactoseOfWater, 1)}% of water`,
  ].join("\n");

  return joinBlocks(title, rows, comp, notesBlock(notes));
}

export const summary = (s: IceCreamState) =>
  `${TARGETS[s.style].label} · ${s.rows.filter((r) => r.grams > 0).length} ingredients`;

export { METRICS };
