import { z } from "zod";

export const STYLES = ["icecream", "gelato", "sorbet"] as const;
export type Style = (typeof STYLES)[number];

export const RowSchema = z.object({ ing: z.string(), grams: z.number().min(0) });
export type Row = z.infer<typeof RowSchema>;

export const IceCreamStateSchema = z.object({
  style: z.enum(STYLES),
  rows: z.array(RowSchema),
});
export type IceCreamState = z.infer<typeof IceCreamStateSchema>;

export const SCHEMA_VERSION = 1;

export const DEFAULT_STATE: IceCreamState = {
  style: "icecream",
  rows: [
    { ing: "whole-milk", grams: 500 },
    { ing: "double-cream", grams: 250 },
    { ing: "sugar", grams: 130 },
    { ing: "skimmed-milk-powder", grams: 40 },
    { ing: "egg-yolk", grams: 80 },
  ],
};

export type Action =
  | { type: "style"; style: Style }
  | { type: "set-ing"; index: number; ing: string }
  | { type: "set-grams"; index: number; grams: number }
  | { type: "add"; ing: string }
  | { type: "remove"; index: number }
  | { type: "clear" }
  | { type: "replace"; state: IceCreamState };

export function reducer(s: IceCreamState, a: Action): IceCreamState {
  switch (a.type) {
    case "style":
      return { ...s, style: a.style };
    case "set-ing":
      return { ...s, rows: s.rows.map((r, i) => (i === a.index ? { ...r, ing: a.ing } : r)) };
    case "set-grams":
      return { ...s, rows: s.rows.map((r, i) => (i === a.index ? { ...r, grams: Math.max(0, a.grams) } : r)) };
    case "add":
      return { ...s, rows: [...s.rows, { ing: a.ing, grams: 0 }] };
    case "remove":
      return { ...s, rows: s.rows.filter((_, i) => i !== a.index) };
    case "clear":
      return { ...s, rows: [{ ing: "whole-milk", grams: 0 }] };
    case "replace":
      return a.state;
  }
}

/** Parse any stored state. Only v1 exists so far. */
export function parseState(raw: unknown, _schema: number) {
  const r = IceCreamStateSchema.safeParse(raw);
  return r.success ? r.data : null;
}
