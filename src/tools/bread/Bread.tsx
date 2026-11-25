import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ToolPage } from "@/components/ToolPage";
import { Panel } from "@/components/Panel";
import { Toggle } from "@/components/Toggle";
import { NumberInput } from "@/components/NumberInput";
import { Meter, Metric, Scale, statusFor } from "@/components/Meter";
import { IngredientPicker } from "@/components/IngredientPicker";
import { CustomIngredients } from "@/components/CustomIngredients";
import { RecipeBar } from "@/components/RecipeBar";
import { useDraft } from "@/lib/recipes/draft";
import { useIngredients } from "@/lib/ingredients";
import { fmt, round } from "@/lib/math";
import { readRaw, writeRaw } from "@/lib/storage";
import { compute, type BreadResult } from "./engine";
import { BreadStateSchema, DEFAULT_STATE, SCHEMA_VERSION, parseState, reducer, type BreadState } from "./state";
import { HYDRATION_BANDS, HYDRATION_SCALE, HYDRATION_TICKS, PREFERMENTS, PREF_TYPES, PROTEIN_SCALE, PROTEIN_TARGET, SALT_SCALE, SALT_TARGET, YEAST_GUIDE, hydrationVerdict, yeastVerdict, type PrefType } from "./data";
import { QuickPills, type PillKey } from "./QuickPills";
import { RecipeView } from "./RecipeView";
import { summary, toText } from "./text";

const TOOL = "bread" as const;

const GUIDE_KEY = "sc:bread:guidance-open";
const TZ_LIQUIDS = ["liquid", "dairy", "egg"] as const;

export function Bread() {
  const [state, dispatch] = useDraft(TOOL, reducer, DEFAULT_STATE, BreadStateSchema);
  const ingredients = useIngredients();
  const byId = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);
  const r: BreadResult | null = useMemo(() => compute(state, (id) => byId.get(id)), [state, byId]);
  const target = state.mode === "target";
  const prefDef = state.pref.type === "none" ? null : PREFERMENTS[state.pref.type];
  const isLevain = state.pref.type === "levain";
  const yeastTypes = ingredients.filter((i) => i.category === "yeast" && i.tools.includes("bread"));

  // Gram fields write back to the % (flour-weight mode only).
  const gToPct = (g: number) => (r ? (g / r.flourG) * 100 : 0);
  const pctFromG = (g: number, dp: number) => round(gToPct(g), dp);

  const saltStatus = statusFor(round(state.salt, 1), SALT_TARGET);
  const totalMode = state.hydrationMode === "total";

  // Edit | Recipe lives in the URL so Back returns to editing.
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "recipe" ? "recipe" : "edit";
  const setView = (v: "edit" | "recipe") => {
    const next = new URLSearchParams(params);
    if (v === "recipe") next.set("view", "recipe");
    else next.delete("view");
    setParams(next);
    try {
      window.scrollTo({ top: 0 });
    } catch {
      /* jsdom */
    }
  };

  // Guidance is folded away unless you open it; a pill opens it at its section.
  const [guideOpen, setGuideOpen] = useState(() => readRaw(GUIDE_KEY) === "1");
  const [focus, setFocus] = useState<PillKey | null>(null);
  useEffect(() => {
    writeRaw(GUIDE_KEY, guideOpen ? "1" : "0");
  }, [guideOpen]);
  useEffect(() => {
    if (!focus || view !== "edit") return;
    document.getElementById(`guide-${focus}`)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    setFocus(null);
  }, [focus, view, guideOpen]);
  const pick = (k: PillKey) => {
    if (view !== "edit") setView("edit");
    setGuideOpen(true);
    setFocus(k);
  };

  return (
    <ToolPage
      emoji="🥖"
      title="Baker's Percentage Calculator"
      blurb="Flour is 100% — everything else is a percentage of it. Tweak hydration, salt and yeast, scale to your loaves, add a tangzhong, split the dough into a poolish, biga, levain, pâte fermentée or sponge, then switch to Recipe to follow it."
    >
      <div className="view-bar no-print">
        <Toggle
          label="View"
          value={view}
          onChange={setView}
          options={[
            { value: "edit", label: "Edit" },
            { value: "recipe", label: "Recipe" },
          ]}
        />
      </div>
      <QuickPills state={state} r={r} onPick={pick} />
      {view === "recipe" ? (
        <RecipeView state={state} r={r} />
      ) : (
      <div className="tool-grid">
        <div>
          <Panel title="Recipe">
            <Toggle
              label="Scaling mode"
              value={state.mode}
              onChange={(mode) => dispatch({ type: "mode", mode, flourG: r?.flourG, totalG: r?.totalG })}
              options={[
                { value: "flour", label: "Flour weight" },
                { value: "target", label: "Target dough" },
              ]}
            />
            <div className="params">
              {!target ? (
                <label>
                  Flour g
                  <NumberInput value={state.flourGrams} onChange={(v) => dispatch({ type: "set", patch: { flourGrams: v } })} min={0} step={10} dp={0} aria-label="Flour grams" />
                </label>
              ) : (
                <>
                  <label>
                    Loaves
                    <NumberInput value={state.loaves} onChange={(v) => dispatch({ type: "set", patch: { loaves: v } })} min={1} step={1} dp={0} aria-label="Loaves" />
                  </label>
                  <label>
                    Dough g per loaf
                    <NumberInput value={state.loafWeight} onChange={(v) => dispatch({ type: "set", patch: { loafWeight: v } })} min={0} step={10} dp={0} aria-label="Dough grams per loaf" />
                  </label>
                  <span className="note" style={{ margin: 0 }}>{r ? `→ needs ${fmt(r.flourG)} g flour` : ""}</span>
                </>
              )}
            </div>

            <h3>
              Flour blend <span className="note" style={{ fontWeight: 400 }}>(shares of the 100%)</span>
            </h3>
            <table className="rows tight">
              <thead>
                <tr>
                  <th>Flour</th>
                  <th>Share %</th>
                  <th className="protein-col">Protein</th>
                  <th>Grams</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {state.flours.map((f, i) => (
                  <tr key={i}>
                    <td>
                      <IngredientPicker tool={TOOL} categories={["flour", "starch"]} value={f.ing} onChange={(id) => dispatch({ type: "flour-set", index: i, patch: { ing: id } })} aria-label={`Flour ${i + 1}`} />
                    </td>
                    <td>
                      <NumberInput value={f.share} onChange={(v) => dispatch({ type: "flour-set", index: i, patch: { share: v } })} min={0} step={5} dp={1} aria-label="Flour share percent" />
                    </td>
                    <td className="grams protein-col">{r ? round(r.flours[i]!.protein, 1) + "%" : "–"}</td>
                    <td className="grams">{r ? fmt(r.flours[i]!.grams) + " g" : "–"}</td>
                    <td>
                      {state.flours.length > 1 && (
                        <button type="button" className="remove" aria-label="Remove flour" onClick={() => dispatch({ type: "flour-remove", index: i })}>
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {r && (
                <tfoot>
                  <tr className="total-row">
                    <td>Blend</td>
                    <td className="grams">{round(r.shareTotal, 1)}%</td>
                    <td className="grams protein-col">{round(r.blendProtein, 1)}%</td>
                    <td className="grams">{fmt(r.flourG)} g</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
            <div className="actions">
              <button type="button" className="btn" onClick={() => dispatch({ type: "flour-add", ing: "wholemeal-flour" })}>
                + Add flour
              </button>
            </div>
            {r?.problems.map((p) => (
              <p key={p} className="warn">⚠ {p}.</p>
            ))}

            <h3>Ingredients</h3>
            <Toggle
              label="Water % counts"
              value={state.hydrationMode}
              onChange={(mode) => dispatch({ type: "hydration-mode", mode, addedPct: r?.addedHydration, effPct: r?.effHydration })}
              options={[
                { value: "total", label: "All liquids" },
                { value: "added", label: "Added water only" },
              ]}
            />
            <table className="rows">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Baker's %</th>
                  <th>Grams</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    {totalMode ? "Hydration" : "Water"}
                    {totalMode && r && <span className="sub">add {fmt(r.waterG)} g water</span>}
                  </td>
                  <td>
                    <NumberInput value={state.water} onChange={(v) => dispatch({ type: "set", patch: { water: v } })} min={0} step={1} dp={1} aria-label="Water percent" />
                  </td>
                  <td>
                    <NumberInput value={r?.targetWaterG ?? 0} mode="commit" onChange={(g) => dispatch({ type: "set", patch: { water: pctFromG(g, 1) } })} readOnly={target} min={0} step={5} dp={0} aria-label="Water grams" />
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td>Salt</td>
                  <td>
                    <NumberInput value={state.salt} onChange={(v) => dispatch({ type: "set", patch: { salt: v } })} min={0} step={0.1} dp={2} aria-label="Salt percent" />
                  </td>
                  <td>
                    <NumberInput value={r?.saltG ?? 0} mode="commit" onChange={(g) => dispatch({ type: "set", patch: { salt: pctFromG(g, 2) } })} readOnly={target} min={0} step={0.5} dp={1} aria-label="Salt grams" />
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td>
                    <select value={state.yeast.ing} onChange={(e) => dispatch({ type: "yeast", patch: { ing: e.target.value } })} aria-label="Yeast type" disabled={isLevain}>
                      {yeastTypes.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <NumberInput value={isLevain ? 0 : state.yeast.pct} onChange={(v) => dispatch({ type: "yeast", patch: { pct: v } })} min={0} step={0.1} dp={2} disabled={isLevain} aria-label="Yeast percent" />
                  </td>
                  <td>
                    <NumberInput value={r?.yeastG ?? 0} mode="commit" onChange={(g) => dispatch({ type: "yeast", patch: { pct: pctFromG(g, 2) } })} readOnly={target} disabled={isLevain} min={0} step={0.1} dp={1} aria-label="Yeast grams" />
                  </td>
                  <td className="grams">{isLevain ? "levain" : r && r.yeastInstantEq !== 1 ? `≈ ${round(r.yeastInstantEqPct, 2)}% instant` : ""}</td>
                </tr>
                {state.extras.map((e, i) => (
                  <tr key={i}>
                    <td>
                      <IngredientPicker
                        tool={TOOL}
                        categories={["liquid", "dairy", "sweetener", "egg", "fat", "inclusion", "flavour", "other"]}
                        value={e.ing}
                        onChange={(id) => dispatch({ type: "extra-set", index: i, patch: { ing: id } })}
                        aria-label={`Extra ingredient ${i + 1}`}
                        missingLabel={`${e.ing} (missing)`}
                      />
                    </td>
                    <td>
                      <NumberInput value={e.pct} onChange={(v) => dispatch({ type: "extra-set", index: i, patch: { pct: v } })} min={0} step={0.5} dp={2} aria-label="Extra ingredient percent" />
                    </td>
                    <td>
                      <NumberInput value={r?.extras[i]?.grams ?? 0} mode="commit" onChange={(g) => dispatch({ type: "extra-set", index: i, patch: { pct: pctFromG(g, 2) } })} readOnly={target} min={0} step={1} dp={0} aria-label="Extra ingredient grams" />
                    </td>
                    <td>
                      <button type="button" className="remove" aria-label="Remove extra ingredient" onClick={() => dispatch({ type: "extra-remove", index: i })}>
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td>Total dough</td>
                  <td className="grams">{r ? round(r.totalPct, 1) + "%" : "–"}</td>
                  <td>{r ? fmt(r.totalG) + " g" : "–"}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            <div className="actions">
              <button type="button" className="btn" onClick={() => dispatch({ type: "extra-add", ing: "olive-oil" })}>
                + Add extra (oil, milk, egg, seeds…)
              </button>
            </div>
            {r && totalMode && r.liquidWaterG >= 0.5 && (
              <p className="note">
                {round(state.water, 1)}% hydration = {fmt(r.targetWaterG)} g water in total: {fmt(r.liquidWaterG)} g is already inside the other ingredients{r.tz ? " (tangzhong included)" : ""}, so you add {fmt(r.waterG)} g.
              </p>
            )}
            {isLevain && <p className="note">Leavening comes from the levain — the commercial yeast row is off.</p>}
            {r && target && (
              <p className="note">
                {fmt(state.loaves)} loaves × {fmt(state.loafWeight)} g = {fmt(r.totalG)} g dough in total.
              </p>
            )}
            {r && r.missing.length > 0 && <p className="warn">⚠ Unknown ingredient{r.missing.length > 1 ? "s" : ""}: {r.missing.join(", ")} — not counted.</p>}
          </Panel>

          <Panel title="Tangzhong">
            <label className="check">
              <input type="checkbox" checked={state.tz.on} onChange={(e) => dispatch({ type: "tz", patch: { on: e.target.checked } })} />
              Add a tangzhong
            </label>
            <p className="note">
              A little of the flour cooked with liquid into a paste. It holds extra water for a soft, moist crumb that stays fresh longer. Its flour comes out of the recipe&apos;s flour
              {totalMode ? " and its liquids count toward the hydration, so the water you add goes down." : "."}
            </p>
            {state.tz.on && (
              <>
                <table className="rows">
                  <thead>
                    <tr>
                      <th>Ingredient</th>
                      <th>Baker&apos;s %</th>
                      <th>Grams</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Flour <span className="sub">from the blend</span></td>
                      <td>
                        <NumberInput value={state.tz.flourPct} onChange={(v) => dispatch({ type: "tz", patch: { flourPct: v } })} min={0} max={100} step={0.5} dp={2} aria-label="Tangzhong flour percent" />
                      </td>
                      <td>
                        <NumberInput value={r?.tz?.flourG ?? 0} mode="commit" onChange={(g) => dispatch({ type: "tz", patch: { flourPct: pctFromG(g, 2) } })} readOnly={target} min={0} step={5} dp={0} aria-label="Tangzhong flour grams" />
                      </td>
                      <td></td>
                    </tr>
                    {state.tz.liquids.map((l, i) => (
                      <tr key={i}>
                        <td>
                          <IngredientPicker
                            tool={TOOL}
                            categories={[...TZ_LIQUIDS]}
                            value={l.ing}
                            onChange={(id) => dispatch({ type: "tz-liquid-set", index: i, patch: { ing: id } })}
                            aria-label={`Tangzhong liquid ${i + 1}`}
                            missingLabel={`${l.ing} (missing)`}
                          />
                        </td>
                        <td>
                          <NumberInput value={l.pct} onChange={(v) => dispatch({ type: "tz-liquid-set", index: i, patch: { pct: v } })} min={0} step={0.5} dp={2} aria-label="Tangzhong liquid percent" />
                        </td>
                        <td>
                          <NumberInput value={r?.tz?.liquids[i]?.grams ?? 0} mode="commit" onChange={(g) => dispatch({ type: "tz-liquid-set", index: i, patch: { pct: pctFromG(g, 2) } })} readOnly={target} min={0} step={5} dp={0} aria-label="Tangzhong liquid grams" />
                        </td>
                        <td>
                          <button type="button" className="remove" aria-label="Remove tangzhong liquid" onClick={() => dispatch({ type: "tz-liquid-remove", index: i })}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {r?.tz && (
                    <tfoot>
                      <tr className="total-row">
                        <td>Tangzhong</td>
                        <td className="grams">{round(state.tz.flourPct + state.tz.liquids.reduce((a, l) => a + l.pct, 0), 1)}%</td>
                        <td>{fmt(r.tz.totalG)} g</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
                <div className="actions">
                  <button type="button" className="btn" onClick={() => dispatch({ type: "tz-liquid-add", ing: "whole-milk" })}>
                    + Add liquid
                  </button>
                </div>
                {r?.tz && (
                  <p className="note">
                    {r.tz.liquidG > 0 && r.tz.flourG > 0 ? `Liquid to flour ${round(r.tz.liquidG / r.tz.flourG, 1)} : 1 (5 : 1 is classic). ` : ""}
                    {totalMode
                      ? `Its ${fmt(r.tz.waterG)} g of water is part of your ${round(state.water, 1)}% hydration, so the final dough gets ${fmt(r.final.waterG)} g water.`
                      : `Its ${fmt(r.tz.waterG)} g of water is on top of the added water (${round(r.effHydration, 1)}% in all). Set Water % counts to All liquids to take it off automatically.`}
                  </p>
                )}
              </>
            )}
          </Panel>

          <Panel title="Preferment">
            <div className="params">
              <label>
                Type
                <select value={state.pref.type} onChange={(e) => dispatch({ type: "pref-type", prefType: e.target.value as PrefType })}>
                  {PREF_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t === "none" ? "None (straight dough)" : PREFERMENTS[t].label}
                    </option>
                  ))}
                </select>
              </label>
              {prefDef && (
                <>
                  <label>
                    Flour prefermented %
                    <NumberInput value={state.pref.flourPct} onChange={(v) => dispatch({ type: "pref", patch: { flourPct: v } })} min={0} max={100} step={5} dp={1} aria-label="Flour prefermented percent" />
                  </label>
                  <label>
                    Hydration %
                    <NumberInput
                      value={prefDef.hydration === "recipe" ? state.water : state.pref.hydration}
                      onChange={(v) => dispatch({ type: "pref", patch: { hydration: v } })}
                      min={0}
                      step={5}
                      dp={1}
                      disabled={prefDef.hydration === "recipe" || state.pref.type === "poolish"}
                      aria-label="Preferment hydration percent"
                    />
                  </label>
                  {prefDef.yeastPct !== null && prefDef.yeastPct !== "recipe" && (
                    <label>
                      Yeast % of pref. flour
                      <NumberInput value={state.pref.yeastPct} onChange={(v) => dispatch({ type: "pref", patch: { yeastPct: v } })} min={0} step={0.05} dp={2} aria-label="Preferment yeast percent" />
                    </label>
                  )}
                  {isLevain && (
                    <>
                      <label>
                        Starter seed g
                        <NumberInput value={state.pref.seedG} onChange={(v) => dispatch({ type: "pref", patch: { seedG: v } })} min={0} step={5} dp={0} aria-label="Starter grams" />
                      </label>
                      <label>
                        Starter hydration %
                        <NumberInput value={state.pref.seedHydration} onChange={(v) => dispatch({ type: "pref", patch: { seedHydration: v } })} min={0} step={5} dp={0} aria-label="Starter hydration" />
                      </label>
                    </>
                  )}
                </>
              )}
            </div>
            {prefDef && prefDef.yeastPct !== null && prefDef.yeastPct !== "recipe" && (
              <label className="note" style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginTop: 0 }}>
                <input type="checkbox" checked={state.pref.yeastSeparate} onChange={(e) => dispatch({ type: "pref", patch: { yeastSeparate: e.target.checked } })} />
                Count the preferment's yeast on top of the recipe yeast (instead of taking it from it)
              </label>
            )}
            <p className="note">{prefDef ? prefDef.desc : "A straight dough — all ingredients mixed in one go. Pick a preferment to split the recipe."}</p>
            {r?.pref && (
              <p className="note">
                {r.pref.label}: {fmt(r.pref.totalG)} g, then the final dough.{" "}
                <button type="button" className="link" onClick={() => setView("recipe")}>
                  See the recipe →
                </button>
              </p>
            )}
            {r?.pref?.problems.length ? <p className="warn">⚠ {r.pref.problems.join("; ")}.</p> : null}
          </Panel>

          <RecipeBar<BreadState>
            tool={TOOL}
            title="Bread"
            schema={SCHEMA_VERSION}
            state={state}
            parse={parseState}
            onLoad={(s) => dispatch({ type: "replace", state: s })}
            onNew={() => dispatch({ type: "replace", state: DEFAULT_STATE })}
            toText={(s, name, notes) => toText(s, compute(s, (id) => byId.get(id)), name, notes)}
            summary={summary}
          />

          <CustomIngredients
            tool={TOOL}
            categories={["flour", "starch", "liquid", "dairy", "sweetener", "egg", "fat", "inclusion", "flavour", "yeast", "other"]}
            defaultCategory="flour"
            hint="For a flour, protein and ash are the bag figures. For anything else, the water left over after the solids is what counts toward effective hydration."
          />
        </div>

        <details className="panel guidance" open={guideOpen} onToggle={(e) => setGuideOpen((e.currentTarget as HTMLDetailsElement).open)}>
          <summary>Guidance</summary>
          <div id="guide-hydration" className="anchor" />
          <Metric label="Hydration" value={r ? round(r.effHydration, 1) + "%" : "–"}>
            <Meter scale={HYDRATION_SCALE} bands={HYDRATION_BANDS.map((b, i) => ({ from: b.from, to: b.to, cls: i % 2 ? "alt" : "" }))} value={r?.effHydration} />
            <Scale scale={HYDRATION_SCALE} ticks={HYDRATION_TICKS} />
            {r && <p className="verdict">{hydrationVerdict(r.effHydration)}</p>}
            {r && Math.abs(r.effHydration - r.addedHydration) > 0.05 && (
              <p className="note">
                {fmt(r.waterG)} g added water ({round(r.addedHydration, 1)}%) + {fmt(r.liquidWaterG)} g water inside the other ingredients → {round(r.effHydration, 1)}% {totalMode ? "in total" : "effective"}.
              </p>
            )}
            <table className="guide-table left">
              <tbody>
                {HYDRATION_BANDS.map((b) => (
                  <tr key={b.from}>
                    <td>
                      {b.from}–{b.to}%
                    </td>
                    <td>{b.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Metric>

          <div id="guide-protein" className="anchor" />
          <Metric label="Blend protein" value={r ? round(r.blendProtein, 1) + "%" : "–"}>
            <Meter scale={PROTEIN_SCALE} bands={[{ from: PROTEIN_TARGET[0], to: PROTEIN_TARGET[1], cls: "target" }]} value={r?.blendProtein} />
            <p className="note">Lean bread wants 11.5–13.5%. Wholemeal and rye absorb more water — push hydration up a few points when they're in the blend.</p>
          </Metric>

          <div id="guide-salt" className="anchor" />
          <Metric label="Salt" hint={`target ${SALT_TARGET[0]}–${SALT_TARGET[1]}%`} value={r ? round(state.salt, 1) + "%" : "–"} status={r ? saltStatus : ""}>
            <Meter scale={SALT_SCALE} bands={[{ from: SALT_TARGET[0], to: SALT_TARGET[1], cls: "target" }]} value={state.salt} status={saltStatus} />
          </Metric>

          <div id="guide-yeast" className="anchor" />
          <Metric label="Yeast" hint="instant-equivalent" value={r ? (isLevain ? "levain" : round(r.yeastInstantEqPct, 2) + "%") : "–"}>
            {r && <p className="verdict">{isLevain ? "Leavened by the sourdough levain." : yeastVerdict(r.yeastInstantEqPct)}</p>}
            <table className="guide-table left">
              <tbody>
                {YEAST_GUIDE.map(([a, b]) => (
                  <tr key={a}>
                    <td>{a}</td>
                    <td>{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {r && !isLevain && r.yeastG > 0 && (
              <p className="note">
                {fmt(r.yeastG, 1)} g {r.yeastName.toLowerCase()} ≈{" "}
                {yeastTypes
                  .filter((y) => y.id !== state.yeast.ing)
                  .map((y) => `${fmt(r.yeastInstantG / (y.yeast?.instantEq ?? 1), 1)} g ${y.name.toLowerCase()}`)
                  .join(" or ")}
                .
              </p>
            )}
          </Metric>
        </details>
      </div>
      )}
    </ToolPage>
  );
}
