import { describe, expect, it } from "vitest";
import { BUILTIN_BY_ID } from "@/lib/ingredients";
import { attrValues, compute, rankStyles, referenceFormula, scoreStyle, whyNull } from "./engine";
import { DEFAULT_STATE, parseState, reducer, type RamenState } from "./state";
import { STYLES, rollerFor, styleById } from "./data";
import legacy from "./fixtures/legacy.json";

const lookup = (id: string) => BUILTIN_BY_ID.get(id);
const base = (patch: Partial<RamenState>): RamenState => ({ ...DEFAULT_STATE, ...patch });

describe("ramen engine — legacy parity", () => {
  it("default noodle with 10 % whole egg", () => {
    const r = compute(base({ egg: { ing: "egg-whole", pct: 10 } }), lookup)!;
    const f = legacy.defaultWhole;
    expect(r.flourG).toBe(f.flourG);
    expect(r.blendProtein).toBe(f.blendProtein);
    expect(r.totalPct).toBe(f.totalPct);
    expect(r.addedWaterG).toBe(f.addedWaterG);
    expect(Math.abs(r.eggWaterG - f.eggWaterG)).toBeLessThan(1); // 75.5 % water vs the old flat 75 %
    expect(Math.abs(r.effHydration - f.effHydration)).toBeLessThan(0.2);
    expect(r.alkaliEqPct).toBeCloseTo(f.alkaliEqPct, 9);
    expect(r.eggG).toBe(f.eggG);
    expect(r.eggFatG).toBeCloseTo(f.eggFatG, 9);
    expect(r.eggWholeEqPct).toBe(f.eggWholeEqPct);
    expect(r.doughG).toBe(f.doughG);
    expect(r.servings).toBeCloseTo(f.servings, 9);
    expect(r.widthMm).toBeCloseTo(f.widthMm, 9);
    expect(r.thicknessMm).toBe(f.thicknessMm);
    expect(r.areaMm2).toBeCloseTo(f.areaMm2, 9);
    expect(r.cook[1]![1]).toBeCloseTo(f.cookNormal, 0);
    expect(r.colourRgb).toEqual(f.colourRgb);
    expect(rankStyles(attrValues(r))[0]!.style.id).toBe(f.top);
  });

  it("bicarbonate, no egg, target-free", () => {
    const r = compute(
      base({ flours: [{ ing: "plain-flour", share: 100 }], water: 42, salt: 1.2, kansui: { form: "bicarb", pct: 1.8, conc: 30, ratio: 90 }, waste: 10, servingG: 150, flourGrams: 500, aging: 48, cut: 12, thickness: 1.5, crimp: 3 }),
      lookup,
    )!;
    const f = legacy.bicarbNoEgg;
    expect(r.flourG).toBe(f.flourG);
    expect(r.totalPct).toBe(f.totalPct);
    expect(r.alkaliEqPct).toBeCloseTo(f.alkaliEqPct, 12);
    expect(r.effHydration).toBe(f.effHydration);
    expect(r.doughG).toBe(f.doughG);
    expect(r.usableG).toBe(f.usableG);
    expect(r.servings).toBeCloseTo(f.servings, 9);
    expect(r.cook[1]![1]).toBeCloseTo(f.cookNormal, 9);
    expect(r.texture.chew).toBeCloseTo(f.texture.chew, 9);
    expect(r.texture.firmness).toBeCloseTo(f.texture.firmness, 9);
    expect(r.texture.smoothness).toBeCloseTo(f.texture.smoothness, 9);
    expect(rankStyles(attrValues(r)).slice(0, 3).map((s) => s.style.id)).toEqual(f.top);
  });

  it("yolk with liquid kansui in target mode — same dough, saner egg equivalence", () => {
    const r = compute(
      base({
        mode: "target",
        servings: 6,
        servingG: 130,
        flours: [{ ing: "strong-white-flour", share: 80 }, { ing: "churikiko", share: 20 }],
        water: 30,
        salt: 1,
        kansui: { form: "liquid", pct: 3, conc: 30, ratio: 80 },
        egg: { ing: "egg-yolk", pct: 5 },
        colour: 0.05,
        aging: 24,
        cut: 15,
        thickness: 0.9,
        crimp: 0,
      }),
      lookup,
    )!;
    const f = legacy.yolkLiquid;
    expect(r.flourG).toBeCloseTo(f.flourG, 6);
    expect(r.blendProtein).toBeCloseTo(f.blendProtein, 9);
    expect(r.kansuiG).toBeCloseTo(f.kansuiG, 6);
    expect(r.kansuiSaltG).toBeCloseTo(f.kansuiSaltG, 6);
    expect(r.kansuiWaterG).toBeCloseTo(f.kansuiWaterG, 6);
    expect(r.alkaliEqPct).toBeCloseTo(f.alkaliEqPct, 9);
    expect(r.doughG).toBeCloseTo(f.doughG, 6);
    expect(r.servings).toBeCloseTo(f.servings, 6);
    expect(r.aspect).toBeCloseTo(f.aspect, 9);
    // Yolk is 51.7 % water in the DB vs the old flat 50 %.
    expect(Math.abs(r.eggWaterG - f.eggWaterG)).toBeLessThan(1);
    expect(Math.abs(r.effHydration - f.effHydration)).toBeLessThan(0.2);
    // The fix: 5 % yolk ≈ 10 % whole egg, not 15 %.
    expect(f.eggWholeEqPct_legacy).toBe(15);
    expect(r.eggWholeEqPct).toBe(10);
  });
});

describe("ramen engine — the yolk bug and other fixes", () => {
  it("choosing yolk changes hydration, fat, colour, texture and scoring", () => {
    const none = compute(DEFAULT_STATE, lookup)!;
    const yolk = compute(base({ egg: { ing: "egg-yolk", pct: 5 } }), lookup)!;
    expect(yolk.effHydration).toBeGreaterThan(none.effHydration);
    expect(yolk.eggFatG).toBeGreaterThan(0);
    expect(yolk.eggFatPct).toBeCloseTo(1.4, 9);
    expect(yolk.yellow).toBeGreaterThan(none.yellow);
    expect(yolk.texture.smoothness).toBeGreaterThan(none.texture.smoothness);
    expect(yolk.doughProtein).toBeGreaterThan(none.doughProtein);
    const scoreNone = scoreStyle(attrValues(none), styleById("tokyo")!).pct;
    const scoreYolk = scoreStyle(attrValues(yolk), styleById("tokyo")!).pct;
    expect(scoreYolk).not.toBe(scoreNone);
    // 5 % yolk ≈ 10 % whole egg: inside Tokyo's 2–10 band, not a zero.
    expect(scoreStyle(attrValues(yolk), styleById("tokyo")!).misses.map((a) => a.key)).not.toContain("egg");
  });

  it("an egg form with 0 % contributes nothing, and a missing egg ingredient is reported", () => {
    const r = compute(base({ egg: { ing: "egg-yolk", pct: 0 } }), lookup)!;
    expect(r.eggG).toBe(0);
    const m = compute(base({ egg: { ing: "custom-gone", pct: 5 } }), lookup)!;
    expect(m.missing).toEqual(["custom-gone"]);
    expect(m.eggPct).toBe(0);
  });

  it("kansui form 'none' drops kansui from the total % and the dough", () => {
    const r = compute(base({ kansui: { form: "none", pct: 1, conc: 30, ratio: 90 } }), lookup)!;
    expect(r.totalPct).toBe(100 + 35 + 1.5);
    expect(r.kansuiG).toBe(0);
    expect(r.alkaliEqPct).toBe(0);
    expect(r.doughG).toBe(1000 + 350 + 15);
  });

  it("target mode back-solves flour from servings including kansui only when present", () => {
    const withK = compute(base({ mode: "target", servings: 8, servingG: 120 }), lookup)!;
    const noK = compute(base({ mode: "target", servings: 8, servingG: 120, kansui: { form: "none", pct: 1, conc: 30, ratio: 90 } }), lookup)!;
    expect(withK.usableG).toBeCloseTo(960, 9);
    expect(noK.usableG).toBeCloseTo(960, 9);
    expect(noK.flourG).toBeGreaterThan(withK.flourG);
  });

  it("waste is clamped to the input range and NaN thickness snaps to the default roller", () => {
    const r = compute(base({ waste: 90 }), lookup)!;
    expect(r.wastePct).toBe(30);
    expect(rollerFor(NaN).setting).toBe(5);
    expect(rollerFor(1.25).setting).toBe(5);
    expect(rollerFor(2.0).setting).toBe(3);
  });

  it("explains why there is no result", () => {
    expect(whyNull(base({ flours: [{ ing: "kyorikiko", share: 0 }] }))).toMatch(/share/);
    expect(whyNull(base({ flourGrams: 0 }))).toMatch(/flour weight/);
    expect(whyNull(base({ mode: "target", servings: 0 }))).toMatch(/servings/);
    expect(compute(base({ flourGrams: 0 }), lookup)).toBeNull();
  });

  it("scores width in millimetres so a cut-number miss is judged by size", () => {
    // #22 vs a style wanting #24–28: 1.36 mm vs 1.07–1.25 mm → off by 0.11 mm, near miss.
    const r = compute(DEFAULT_STATE, lookup)!;
    const s = scoreStyle(attrValues(r), styleById("hakata")!);
    const width = s.misses.find((a) => a.key === "width");
    expect(width).toBeDefined();
    expect(s.pct).toBeGreaterThan(50);
  });

  it("'load reference formula' ranks its own style first for all 22 styles", () => {
    for (const style of STYLES) {
      const s = referenceFormula(style, DEFAULT_STATE, lookup);
      const r = compute(s, lookup)!;
      const ranked = rankStyles(attrValues(r), 1);
      expect(ranked[0]!.style.id, style.id).toBe(style.id);
      expect(ranked[0]!.pct, style.id).toBeGreaterThan(95);
    }
  });

  it("reference formula keeps a yolk egg form and back-solves its percentage", () => {
    const tokyo = styleById("tokyo")!;
    const s = referenceFormula(tokyo, base({ egg: { ing: "egg-yolk", pct: 3 } }), lookup);
    expect(s.egg.ing).toBe("egg-yolk");
    expect(s.egg.pct).toBe(3); // mid 6 % whole-egg eq ÷ 2.0
    const r = compute(s, lookup)!;
    expect(r.effHydration).toBeCloseTo(35.5, 0);
    expect(rankStyles(attrValues(r), 1)[0]!.style.id).toBe("tokyo");
  });

  it("reducer snaps thickness to the roller and keeps at least one flour", () => {
    expect(reducer(DEFAULT_STATE, { type: "set", patch: { thickness: 1.3 } }).thickness).toBe(1.2);
    expect(reducer(DEFAULT_STATE, { type: "flour-remove", index: 0 }).flours).toHaveLength(1);
    expect(parseState({ ...DEFAULT_STATE, style: "nope", thickness: 0.72 }, 1)).toMatchObject({ style: "hakata", thickness: 0.7 });
    expect(parseState({ mode: "flour" }, 1)).toBeNull();
  });
});
