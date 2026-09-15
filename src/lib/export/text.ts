import { fmt } from "../math";

/**
 * Plain-text formatting helpers for the "share to Notes" export. Everything
 * is monospace-friendly: fixed-width columns, no markdown syntax that Notes
 * would show literally.
 */

export type Cell = string | number | null | undefined;
export interface Column {
  header: string;
  align?: "left" | "right";
  dp?: number;
  width?: number;
}

const cellText = (c: Cell, col: Column) =>
  c == null ? "" : typeof c === "number" ? fmt(c, col.dp ?? 0) : String(c);

export function table(cols: Column[], rows: Cell[][], indent = ""): string {
  const texts = rows.map((r) => r.map((c, i) => cellText(c, cols[i]!)));
  const widths = cols.map((col, i) =>
    Math.max(col.width ?? 0, col.header.length, ...texts.map((r) => (r[i] ?? "").length)),
  );
  const line = (cells: string[]) =>
    indent +
    cells
      .map((t, i) => {
        const w = widths[i]!;
        return (cols[i]!.align ?? (i === 0 ? "left" : "right")) === "right"
          ? t.padStart(w)
          : t.padEnd(w);
      })
      .join("  ")
      .replace(/\s+$/, "");
  return [line(cols.map((c) => c.header)), ...texts.map(line)].join("\n");
}

export const heading = (s: string) => s.toUpperCase();

export const kv = (pairs: [string, string][]) => pairs.map(([k, v]) => `${k}: ${v}`).join(" · ");

export function section(title: string, body: string) {
  return `${title}\n${body}`;
}

export function notesBlock(notes: string) {
  const t = notes.trim();
  if (!t) return "";
  return "\nNotes\n" + t.split("\n").map((l) => "  " + l).join("\n");
}

export function joinBlocks(...blocks: (string | false | null | undefined)[]) {
  return blocks.filter((b): b is string => !!b && b.trim().length > 0).join("\n\n") + "\n";
}
