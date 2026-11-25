import { describe, expect, it } from "vitest";
import { BUILTIN_BY_ID } from "@/lib/ingredients";
import { compute } from "./engine";
import { DEFAULT_STATE, type BreadState } from "./state";
import { recipeSteps } from "./steps";

const lookup = (id: string) => BUILTIN_BY_ID.get(id);
const steps = (patch: Partial<BreadState>) => {
  const s = { ...DEFAULT_STATE, ...patch };
  return recipeSteps(s, compute(s, lookup)!);
};
const sumWhole = (rows: { dp: number; shown: number }[]) => rows.filter((r) => r.dp === 0).reduce((a, r) => a + r.shown, 0);

describe("recipe steps", () => {
  it("a straight dough is one step", () => {
    const st = steps({});
    expect(st.map((s) => s.title)).toEqual(["Dough"]);
    expect(st[0]!.rows.map((r) => r.name)).toEqual(["Water", "Strong white bread flour", "Instant yeast", "Salt"]);
  });

  it("tangzhong, then preferment, then final dough in mixing order", () => {
    const st = steps({
      tz: { on: true, flourPct: 4, liquids: [{ ing: "water", pct: 10 }, { ing: "whole-milk", pct: 10 }] },
      pref: { ...DEFAULT_STATE.pref, type: "poolish", flourPct: 30, hydration: 100, yeastPct: 0.1 },
      extras: [{ ing: "mixed-seeds", pct: 5 }, { ing: "butter", pct: 5 }, { ing: "whole-milk", pct: 10 }],
    });
    expect(st.map((s) => s.key)).toEqual(["tz", "pref", "final"]);
    expect(st[0]!.rows.map((r) => [r.name, r.shown])).toEqual([
      ["Strong white bread flour", 20],
      ["Water", 50],
      ["Whole milk", 50],
    ]);
    expect(st[1]!.title).toBe("Poolish");
    const names = st[2]!.rows.map((r) => r.name);
    expect(names.slice(0, 5)).toEqual(["Water", "Whole milk", "All of the poolish", "All of the tangzhong", "Strong white bread flour"]);
    expect(names.indexOf("Salt")).toBeLessThan(names.indexOf("Butter (unsalted)"));
    expect(names[names.length - 1]).toBe(st[2]!.rows.find((r) => r.name.toLowerCase().includes("seed"))!.name);
  });

  it("whole-gram rows add up to the rounded step total less the decimal rows", () => {
    const st = steps({
      mode: "target",
      loafWeight: 737,
      flours: [{ ing: "strong-white-flour", share: 70 }, { ing: "wholemeal-flour", share: 30 }],
      pref: { ...DEFAULT_STATE.pref, type: "biga", flourPct: 33, hydration: 55, yeastPct: 0.2 },
    });
    for (const s of st) {
      const whole = s.rows.filter((r) => r.dp === 0).reduce((a, r) => a + r.grams, 0);
      expect(sumWhole(s.rows)).toBe(Math.round(whole));
    }
  });
});
