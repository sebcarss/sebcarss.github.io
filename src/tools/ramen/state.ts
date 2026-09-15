import { z } from "zod";
import { KANSUI_FORM_IDS, DEFAULT_ROLLER_MM, rollerFor, styleById, STYLES } from "./data";

export const SCHEMA_VERSION = 1;

export const RamenStateSchema = z.object({
  mode: z.enum(["flour", "target"]),
  matchMode: z.enum(["pick", "rank"]).default("pick"),
  style: z.string().default("tokyo"),
  flourGrams: z.number().min(0),
  servings: z.number().min(0),
  servingG: z.number().min(0),
  waste: z.number().min(0),
  flours: z.array(z.object({ ing: z.string(), share: z.number().min(0) })).min(1),
  water: z.number().min(0),
  salt: z.number().min(0),
  kansui: z.object({
    form: z.enum(KANSUI_FORM_IDS as [string, ...string[]]),
    pct: z.number().min(0),
    conc: z.number().min(0),
    ratio: z.number().min(0).max(100),
  }),
  /** Egg ingredient id, or null for none. pct is % of flour of that ingredient as bought. */
  egg: z.object({ ing: z.string().nullable(), pct: z.number().min(0) }),
  colour: z.number().min(0),
  aging: z.number().min(0),
  cut: z.number().positive(),
  /** Roller gap in mm; snapped to a ROLLER setting on read. */
  thickness: z.number().positive(),
  crimp: z.number().int().min(0).max(3),
});
export type RamenState = z.infer<typeof RamenStateSchema>;

// The defaults are a deliberately middle-of-the-road medium noodle — #22 at
// 35 %, no egg — so the page opens inside several real style bands.
export const DEFAULT_STATE: RamenState = {
  mode: "flour",
  matchMode: "pick",
  style: "tokyo",
  flourGrams: 1000,
  servings: 8,
  servingG: 120,
  waste: 6,
  flours: [{ ing: "kyorikiko", share: 100 }],
  water: 35,
  salt: 1.5,
  kansui: { form: "powder", pct: 1, conc: 30, ratio: 90 },
  egg: { ing: null, pct: 0 },
  colour: 0,
  aging: 12,
  cut: 22,
  thickness: DEFAULT_ROLLER_MM,
  crimp: 1,
};

export type Action =
  | { type: "mode"; mode: RamenState["mode"]; flourG?: number; servings?: number }
  | { type: "set"; patch: Partial<Omit<RamenState, "flours" | "kansui" | "egg">> }
  | { type: "kansui"; patch: Partial<RamenState["kansui"]> }
  | { type: "egg"; patch: Partial<RamenState["egg"]> }
  | { type: "flour-set"; index: number; patch: Partial<RamenState["flours"][number]> }
  | { type: "flour-add"; ing: string }
  | { type: "flour-remove"; index: number }
  | { type: "replace"; state: RamenState };

export function reducer(s: RamenState, a: Action): RamenState {
  switch (a.type) {
    case "mode":
      if (a.mode === s.mode) return s;
      if (a.mode === "flour" && a.flourG) return { ...s, mode: a.mode, flourGrams: Math.round(a.flourG) };
      if (a.mode === "target" && a.servings) return { ...s, mode: a.mode, servings: Math.max(1, Math.round(a.servings)) };
      return { ...s, mode: a.mode };
    case "set":
      return { ...s, ...a.patch, ...(a.patch.thickness != null ? { thickness: rollerFor(a.patch.thickness).mm } : {}) };
    case "kansui":
      return { ...s, kansui: { ...s.kansui, ...a.patch } };
    case "egg":
      return { ...s, egg: { ...s.egg, ...a.patch } };
    case "flour-set":
      return { ...s, flours: s.flours.map((f, i) => (i === a.index ? { ...f, ...a.patch } : f)) };
    case "flour-add":
      return { ...s, flours: [...s.flours, { ing: a.ing, share: 0 }] };
    case "flour-remove":
      return s.flours.length > 1 ? { ...s, flours: s.flours.filter((_, i) => i !== a.index) } : s;
    case "replace":
      return { ...a.state, thickness: rollerFor(a.state.thickness).mm };
  }
}

export function parseState(raw: unknown, _schema: number): RamenState | null {
  const r = RamenStateSchema.safeParse(raw);
  if (!r.success) return null;
  const s = r.data;
  return { ...s, style: styleById(s.style) ? s.style : STYLES[0]!.id, thickness: rollerFor(s.thickness).mm };
}
