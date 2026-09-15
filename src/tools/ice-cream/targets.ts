import type { Style } from "./state";

export type Range = readonly [number, number];

export interface Targets {
  label: string;
  fat: Range;
  sugar: Range;
  msnf: Range;
  solids: Range;
  pod: Range;
  pac: Range;
}

/** Typical published ranges. Approximate and safe to tune. */
export const TARGETS: Record<Style, Targets> = {
  icecream: { label: "Ice cream", fat: [10, 20], sugar: [14, 18], msnf: [7, 12], solids: [36, 42], pod: [12, 18], pac: [24, 28] },
  gelato: { label: "Gelato", fat: [4, 9], sugar: [16, 22], msnf: [8, 12], solids: [32, 40], pod: [16, 22], pac: [27, 31] },
  sorbet: { label: "Sorbet", fat: [0, 3], sugar: [24, 32], msnf: [0, 2], solids: [28, 36], pod: [22, 32], pac: [28, 35] },
};

export type MetricKey = "fat" | "sugar" | "msnf" | "other" | "solids" | "pod" | "pac";

export interface MetricDef {
  key: MetricKey;
  label: string;
  unit: string;
  scaleMax: number | null;
  dp: number;
}

export const METRICS: MetricDef[] = [
  { key: "fat", label: "Fat", unit: "%", scaleMax: 30, dp: 1 },
  { key: "sugar", label: "Sugar", unit: "%", scaleMax: 35, dp: 1 },
  { key: "msnf", label: "MSNF", unit: "%", scaleMax: 18, dp: 1 },
  { key: "other", label: "Other solids", unit: "%", scaleMax: null, dp: 1 },
  { key: "solids", label: "Total solids", unit: "%", scaleMax: 55, dp: 1 },
  { key: "pod", label: "POD", unit: "", scaleMax: 40, dp: 0 },
  { key: "pac", label: "PAC", unit: "", scaleMax: 45, dp: 0 },
];

/** Lactose as a share of the water phase above which it crystallises ("sandy"). */
export const LACTOSE_WARN = 8;
export const LACTOSE_RISK = 10;

/** Lactose sweetens a little and depresses the freezing point like any sugar. */
export const LACTOSE_POD = 0.16;
export const LACTOSE_PAC = 1.0;

/** Temperature the tub is served at, for the hardness estimate. */
export const SERVING_TEMP_C = -12;
