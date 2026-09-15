import { describe, expect, it } from "vitest";
import { BUILTIN_BY_ID } from "@/lib/ingredients";
import { compute } from "./engine";
import { DEFAULT_STATE, parseState, reducer, type BreadState } from "./state";
import legacy from "./fixtures/legacy.json";

const lookup = (id: string) => BUILTIN_BY_ID.get(id);
const base = (patch: Partial<BreadState>): BreadState => ({ ...DEFAULT_STATE, ...patch });

describe("bread engine — legacy parity", () => {
  it("straight dough", () => {
    const r = compute(DEFAULT_STATE, lookup)!;
    expect(r.flourG).toBe(legacy.straight.flourG);
    expect(r.totalPct).toBe(legacy.straight.totalPct);
    expect(r.waterG).toBe(legacy.straight.waterG);
    expect(r.saltG).toBe(legacy.straight.saltG);
    expect(r.yeastG).toBe(legacy.straight.yeastG);
    expect(r.totalG).toBe(legacy.straight.totalG);
    expect(r.pref).toBeNull();
    expect(r.effHydration).toBeCloseTo(70.05, 6); // + 5 % water in 5 g instant yeast
  });

  it("poolish in target mode with an extra", () => {
    const s = base({
      mode: "target",
      loaves: 2,
      loafWeight: 800,
      water: 68,
      yeast: { ing: "instant-yeast", pct: 0.8 },
      extras: [{ ing: "olive-oil", pct: 3 }],
      pref: { ...DEFAULT_STATE.pref, type: "poolish", flourPct: 30, hydration: 100, yeastPct: 0.1 },
    });
    const r = compute(s, lookup)!;
    const f = legacy.poolishTarget;
    expect(r.flourG).toBeCloseTo(f.flourG, 6);
    expect(r.totalG).toBeCloseTo(f.totalG, 6);
    expect(r.extras[0]!.grams).toBeCloseTo(f.extraG, 6);
    expect(r.pref!.flourG).toBeCloseTo(f.pref.flourG, 6);
    expect(r.pref!.waterG).toBeCloseTo(f.pref.waterG, 6);
    expect(r.pref!.yeastG).toBeCloseTo(f.pref.yeastG, 6);
    expect(r.pref!.finalFlourG).toBeCloseTo(f.pref.finalFlourG, 6);
    expect(r.pref!.finalWaterG).toBeCloseTo(f.pref.finalWaterG, 6);
    expect(r.pref!.finalYeastG).toBeCloseTo(f.pref.finalYeastG, 6);
    // Preferment + final dough reconstruct the whole batch.
    expect(r.pref!.finalTotalG).toBeCloseTo(r.totalG, 6);
    // Olive oil carries no water: effective = added.
    expect(r.effHydration).toBeCloseTo(68 + (r.yeastG * 0.05 / r.flourG) * 100, 6);
  });

  it("levain zeroes commercial yeast even if the row still holds a value", () => {
    const s = base({
      flourGrams: 1000,
      water: 75,
      yeast: { ing: "instant-yeast", pct: 1 },
      extras: [{ ing: "honey", pct: 5 }, { ing: "butter", pct: 4 }],
      pref: { ...DEFAULT_STATE.pref, type: "levain", flourPct: 20, hydration: 100, yeastPct: 0 },
    });
    const r = compute(s, lookup)!;
    const f = legacy.levain;
    expect(r.yeastG).toBe(0);
    expect(r.totalPct).toBe(f.totalPct);
    expect(r.totalG).toBe(f.totalG);
    expect(r.pref!.finalWaterG).toBe(f.pref.finalWaterG);
    // Honey (18 % water) and butter (~16.7 %) now count toward hydration.
    expect(r.effHydration).toBeGreaterThan(75);
    expect(r.effHydration).toBeCloseTo(75 + 5 * 0.18 + 4 * 0.167, 1);
  });

  it("biga", () => {
    const s = base({
      flourGrams: 600,
      water: 62,
      salt: 2.2,
      yeast: { ing: "instant-yeast", pct: 0.5 },
      pref: { ...DEFAULT_STATE.pref, type: "biga", flourPct: 40, hydration: 50, yeastPct: 0.2 },
    });
    const r = compute(s, lookup)!;
    const f = legacy.biga;
    expect(r.totalG).toBeCloseTo(f.totalG, 6);
    expect(r.pref!.totalG).toBeCloseTo(f.pref.totalG, 6);
    expect(r.pref!.finalYeastG).toBeCloseTo(f.pref.finalYeastG, 6);
    expect(r.pref!.finalTotalG).toBeCloseTo(r.totalG, 6);
  });
});

describe("bread engine — fixes and new behaviour", () => {
  it("returns null on zero flour, zero loaves or zero loaf weight", () => {
    expect(compute(base({ flourGrams: 0 }), lookup)).toBeNull();
    expect(compute(base({ mode: "target", loaves: 0 }), lookup)).toBeNull();
    expect(compute(base({ mode: "target", loafWeight: 0 }), lookup)).toBeNull();
  });

  it("a single flour with share 0 still gets all the flour", () => {
    const r = compute(base({ flours: [{ ing: "strong-white-flour", share: 0 }] }), lookup)!;
    expect(r.flours[0]!.grams).toBe(500);
  });

  it("normalises multi-flour shares and warns when they don't total 100", () => {
    const r = compute(base({ flours: [{ ing: "strong-white-flour", share: 90 }, { ing: "rye-light", share: 30 }] }), lookup)!;
    expect(r.flours[0]!.grams + r.flours[1]!.grams).toBeCloseTo(500, 9);
    expect(r.flours[0]!.grams).toBeCloseTo(375, 9);
    expect(r.problems.some((p) => p.includes("120"))).toBe(true);
    expect(r.blendProtein).toBeCloseTo(0.75 * 12.7 + 0.25 * 8.5, 6);
  });

  it("flags a preferment that uses more than all the flour", () => {
    const r = compute(base({ pref: { ...DEFAULT_STATE.pref, type: "poolish", flourPct: 150 } }), lookup)!;
    expect(r.pref!.finalFlourG).toBeLessThan(0);
    expect(r.pref!.problems.some((p) => p.includes("all of the flour"))).toBe(true);
  });

  it("can count the preferment yeast separately, raising the total", () => {
    const pref = { ...DEFAULT_STATE.pref, type: "poolish" as const, flourPct: 30, hydration: 100, yeastPct: 0.1 };
    const taken = compute(base({ pref }), lookup)!;
    const onTop = compute(base({ pref: { ...pref, yeastSeparate: true } }), lookup)!;
    expect(taken.pref!.finalYeastG).toBeCloseTo(5 - 0.15, 9);
    expect(onTop.pref!.finalYeastG).toBe(5);
    expect(onTop.totalG).toBeCloseTo(taken.totalG + 0.15, 9);
    expect(onTop.pref!.finalTotalG).toBeCloseTo(onTop.totalG, 9);
  });

  it("pâte fermentée is a piece of the dough: same hydration, salted, yeast taken from the recipe", () => {
    const r = compute(base({ pref: { ...DEFAULT_STATE.pref, type: "pate", flourPct: 30 } }), lookup)!;
    expect(r.pref!.hydration).toBe(70);
    expect(r.pref!.waterG).toBeCloseTo(150 * 0.7, 9);
    expect(r.pref!.saltG).toBeCloseTo(3, 9);
    expect(r.pref!.yeastG).toBeCloseTo(1.5, 9);
    expect(r.pref!.finalSaltG).toBeCloseTo(7, 9);
    expect(r.pref!.finalTotalG).toBeCloseTo(r.totalG, 9);
  });

  it("levain seed splits into flour and water inside the build", () => {
    const r = compute(
      base({ pref: { ...DEFAULT_STATE.pref, type: "levain", flourPct: 20, hydration: 100, yeastPct: 0, seedG: 50, seedHydration: 100 } }),
      lookup,
    )!;
    expect(r.pref!.seedFlourG).toBe(25);
    expect(r.pref!.seedWaterG).toBe(25);
    expect(r.pref!.freshFlourG).toBe(75);
    expect(r.pref!.freshWaterG).toBe(75);
    expect(r.pref!.totalG).toBe(200);
  });

  it("converts yeast types through instant-equivalent", () => {
    const fresh = compute(base({ yeast: { ing: "fresh-yeast", pct: 3 } }), lookup)!;
    expect(fresh.yeastG).toBe(15);
    expect(fresh.yeastInstantEqPct).toBeCloseTo(1, 9);
    expect(fresh.yeastInstantG).toBeCloseTo(5, 9);
  });

  it("counts water in milk and egg toward effective hydration", () => {
    const r = compute(base({ water: 50, extras: [{ ing: "whole-milk", pct: 20 }, { ing: "egg-whole", pct: 10 }] }), lookup)!;
    expect(r.addedHydration).toBe(50);
    // milk 87.5 % water, egg 75.5 %, instant yeast 5 %
    expect(r.effHydration).toBeCloseTo(50 + 20 * 0.875 + 10 * 0.755 + 1 * 0.05, 6);
  });

  it("reports missing ingredients rather than crashing", () => {
    const r = compute(base({ extras: [{ ing: "nope", pct: 5 }] }), lookup)!;
    expect(r.missing).toEqual(["nope"]);
    expect(r.extras[0]!.missing).toBe(true);
    expect(r.extras[0]!.waterG).toBe(0);
  });

  it("reducer carries batch size across a mode switch", () => {
    const s1 = reducer(DEFAULT_STATE, { type: "mode", mode: "target", totalG: 865 });
    expect(s1.loafWeight).toBe(433);
    const s2 = reducer(s1, { type: "mode", mode: "flour", flourG: 500.4 });
    expect(s2.flourGrams).toBe(500);
    expect(reducer(DEFAULT_STATE, { type: "flour-remove", index: 0 }).flours).toHaveLength(1);
  });

  it("parseState rejects an old-shape recipe", () => {
    expect(parseState({ name: "x", flours: [{ name: "White", share: 100 }] }, 1)).toBeNull();
    expect(parseState(DEFAULT_STATE, 1)).toEqual(DEFAULT_STATE);
  });
});
