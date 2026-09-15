export type Range = readonly [number, number];

export const HYDRATION_BANDS = [
  { from: 55, to: 60, label: "Bagels & pretzels" },
  { from: 60, to: 65, label: "Sandwich loaves & rolls" },
  { from: 65, to: 72, label: "Baguettes & country loaves" },
  { from: 72, to: 80, label: "Rustic loaves & focaccia" },
  { from: 80, to: 90, label: "Ciabatta & very open crumb" },
] as const;
export const HYDRATION_SCALE: Range = [50, 90];
export const HYDRATION_TICKS = [50, ...HYDRATION_BANDS.map((b) => b.to)];
export const SALT_TARGET: Range = [1.8, 2.2];
export const SALT_SCALE: Range = [0, 4];
export const PROTEIN_SCALE: Range = [7, 16];

export const PREF_TYPES = ["none", "poolish", "biga", "levain", "pate", "sponge"] as const;
export type PrefType = (typeof PREF_TYPES)[number];

export interface PrefDef {
  label: string;
  desc: string;
  flourPct: number;
  /** Default hydration; "recipe" means it is always the dough's own hydration. */
  hydration: number | "recipe";
  /** Yeast % of preferment flour; null = no commercial yeast; "recipe" = a piece of the dough. */
  yeastPct: number | null | "recipe";
  salted: boolean;
}

export const PREFERMENTS: Record<Exclude<PrefType, "none">, PrefDef> = {
  poolish: {
    label: "Poolish",
    desc: "Liquid preferment, equal flour and water, with a pinch of yeast. Ferment 8–16 h at room temperature. Classic for baguettes.",
    flourPct: 30,
    hydration: 100,
    yeastPct: 0.1,
    salted: false,
  },
  biga: {
    label: "Biga",
    desc: "Stiff Italian preferment, typically 45–60% hydration. Ferment 12–16 h somewhere cool. Classic for ciabatta.",
    flourPct: 30,
    hydration: 50,
    yeastPct: 0.1,
    salted: false,
  },
  levain: {
    label: "Levain",
    desc: "Sourdough preferment built from your starter. It replaces commercial yeast entirely; add the starter you seed it with to see the build.",
    flourPct: 20,
    hydration: 100,
    yeastPct: null,
    salted: false,
  },
  pate: {
    label: "Pâte fermentée",
    desc: "A piece of yesterday's dough — same hydration, salt and yeast as the recipe — held back and mixed into today's. Ferment 12–24 h in the fridge.",
    flourPct: 30,
    hydration: "recipe",
    yeastPct: "recipe",
    salted: true,
  },
  sponge: {
    label: "Sponge",
    desc: "Sponge-and-dough: a loose, yeasted sponge fermented 1–4 h before the rest of the flour, salt and any enrichment go in. Classic for enriched and sandwich breads.",
    flourPct: 40,
    hydration: 65,
    yeastPct: 1,
    salted: false,
  },
};

export const YEAST_GUIDE = [
  ["0.2–0.5%", "long / overnight ferments"],
  ["1–1.5%", "same-day bakes"],
] as const;

export function yeastVerdict(instantEqPct: number) {
  if (instantEqPct === 0) return "No yeast — is that intentional?";
  if (instantEqPct <= 0.5) return "Long-ferment territory: expect an overnight rise.";
  if (instantEqPct <= 1.0) return "Between the two — a slow same-day or a warm overnight rise.";
  if (instantEqPct <= 1.5) return "Same-day territory.";
  return "That's a lot of yeast — fine for enriched quick doughs.";
}

export function hydrationVerdict(h: number) {
  const match = HYDRATION_BANDS.find((b) => h >= b.from && h < b.to);
  if (match) return `→ ${match.label.toLowerCase()} territory.`;
  return h < HYDRATION_BANDS[0].from ? "→ stiffer than typical bread doughs." : "→ wetter than most doughs — batter territory.";
}
