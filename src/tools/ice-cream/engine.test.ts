import { describe, expect, it } from "vitest";
import { BUILTIN_BY_ID, type Ingredient } from "@/lib/ingredients";
import { compute, statusOf } from "./engine";
import { DEFAULT_STATE, parseState, reducer } from "./state";
import legacy from "./fixtures/legacy.json";

const lookup = (id: string) => BUILTIN_BY_ID.get(id);

describe("ice cream engine", () => {
  it("matches the legacy compute() on three captured recipes", () => {
    const fx = legacy as unknown as Record<string, { rows: [string, number][]; expect: Record<string, number> }>;
    for (const key of ["default", "gelato", "choc"]) {
      const f = fx[key]!;
      const r = compute({ style: "icecream", rows: f.rows.map(([ing, grams]) => ({ ing, grams })) }, lookup)!;
      expect(r.grams, key).toBe(f.expect.grams);
      // Corrected compositions (yolk fat 28 vs 27, honey/cocoa detail) move
      // figures by a few tenths at most; anything larger is a regression.
      for (const k of ["fat", "sugar", "msnf", "other", "solids", "pod", "pac"] as const) {
        expect(Math.abs(r.metrics[k] - f.expect[k]!), `${key}.${k}: ${r.metrics[k]} vs ${f.expect[k]}`).toBeLessThan(0.6);
      }
    }
  });

  it("adds lactose POD/PAC exactly once, from the lactose figure", () => {
    const r = compute({ style: "icecream", rows: [{ ing: "skimmed-milk-powder", grams: 100 }] }, lookup)!;
    // 52 g lactose → POD 8.32, PAC 52; no other sugars.
    expect(r.metrics.pod).toBeCloseTo(8.32, 2);
    expect(r.metrics.pac).toBeCloseTo(52, 2);
    expect(r.metrics.sugar).toBe(0);
    expect(r.metrics.msnf).toBeCloseTo(96, 5);
  });

  it("returns null for an empty recipe and never NaN", () => {
    expect(compute({ style: "gelato", rows: [] }, lookup)).toBeNull();
    expect(compute({ style: "gelato", rows: [{ ing: "sugar", grams: 0 }] }, lookup)).toBeNull();
    const r = compute({ style: "icecream", rows: [{ ing: "water", grams: 100 }] }, lookup)!;
    for (const v of Object.values(r.metrics)) expect(Number.isFinite(v)).toBe(true);
    expect(r.metrics.solids).toBe(0);
  });

  it("treats a custom ingredient with no sweet facet as POD/PAC 0, not NaN", () => {
    const custom: Ingredient = {
      id: "x",
      name: "X",
      category: "other",
      tools: ["ice-cream"],
      solids: { fat: 10, protein: 0, sugars: 0, lactose: 0, ash: 0, other: 0 },
    };
    const r = compute({ style: "icecream", rows: [{ ing: "x", grams: 100 }] }, (id) => (id === "x" ? custom : undefined))!;
    expect(r.metrics.pod).toBe(0);
    expect(r.metrics.pac).toBe(0);
    expect(r.metrics.fat).toBe(10);
  });

  it("reports missing ingredients instead of dropping them silently", () => {
    const r = compute({ style: "icecream", rows: [{ ing: "gone", grams: 50 }, { ing: "sugar", grams: 50 }] }, lookup)!;
    expect(r.missing).toEqual(["gone"]);
    expect(r.rows[0]!.missing).toBe(true);
    expect(r.grams).toBe(50);
  });

  it("estimates a sensible freezing point for a standard mix", () => {
    const r = compute(DEFAULT_STATE, lookup)!;
    expect(r.freezingPointC).toBeLessThan(-1);
    expect(r.freezingPointC).toBeGreaterThan(-4);
    expect(r.frozenAtServing).toBeGreaterThan(0.6);
    expect(r.frozenAtServing).toBeLessThan(0.95);
  });

  it("flags lactose against the water phase", () => {
    const r = compute({ style: "icecream", rows: [{ ing: "skimmed-milk-powder", grams: 30 }, { ing: "water", grams: 70 }] }, lookup)!;
    // 15.6 g lactose in 70 + 1.2 g water → ~22 % of water phase
    expect(r.lactoseOfWater).toBeGreaterThan(20);
  });

  it("classifies metrics against the chosen style", () => {
    expect(statusOf("icecream", "fat", 5)).toBe("low");
    expect(statusOf("gelato", "fat", 5)).toBe("ok");
    expect(statusOf("sorbet", "fat", 5)).toBe("high");
    expect(statusOf("icecream", "other", 99)).toBe("");
  });

  it("reducer never allows negative grams and parseState rejects garbage", () => {
    const s = reducer(DEFAULT_STATE, { type: "set-grams", index: 0, grams: -5 });
    expect(s.rows[0]!.grams).toBe(0);
    expect(parseState({ style: "nope", rows: [] }, 1)).toBeNull();
    expect(parseState(DEFAULT_STATE, 1)).toEqual(DEFAULT_STATE);
  });
});
