export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const round = (v: number, dp = 0) => {
  const f = 10 ** dp;
  return Math.round((v + Number.EPSILON) * f) / f;
};

/** Number → string with fixed decimals and en-GB grouping ("1,234.5"). */
export const fmt = (v: number, dp = 0) =>
  Number.isFinite(v)
    ? v.toLocaleString("en-GB", { minimumFractionDigits: dp, maximumFractionDigits: dp })
    : "–";

/** Coerce anything from an input or old JSON to a finite number, else 0. */
export const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export const inRange = (v: number, [lo, hi]: readonly [number, number]) => v >= lo && v <= hi;

/**
 * Round a list of values so the rounded parts add up to the rounded total
 * (largest-remainder method). Keeps printed ingredient rows summing to the
 * printed total instead of drifting by a gram.
 */
export function allocate(values: number[], dp = 0): number[] {
  const f = 10 ** dp;
  const total = Math.round(sum(values) * f);
  const floors = values.map((v) => Math.floor(v * f));
  let remainder = total - sum(floors);
  const order = values
    .map((v, i) => ({ i, frac: v * f - Math.floor(v * f) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floors[i] = (floors[i] ?? 0) + 1;
    remainder--;
  }
  return floors.map((x) => x / f);
}

/** Seconds → "45 s" or "3:30". */
export const mmss = (s: number) =>
  s < 60
    ? Math.round(s) + " s"
    : Math.floor(s / 60) + ":" + String(Math.round(s % 60)).padStart(2, "0");

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
