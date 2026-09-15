import { useMemo } from "react";
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
import { allocate, fmt, round } from "@/lib/math";
import { compute, type BreadResult } from "./engine";
import { BreadStateSchema, DEFAULT_STATE, SCHEMA_VERSION, parseState, reducer, type BreadState } from "./state";
import { HYDRATION_BANDS, HYDRATION_SCALE, HYDRATION_TICKS, PREFERMENTS, PREF_TYPES, PROTEIN_SCALE, SALT_SCALE, SALT_TARGET, YEAST_GUIDE, hydrationVerdict, yeastVerdict, type PrefType } from "./data";
import { summary, toText } from "./text";

const TOOL = "bread" as const;

function SplitTable({ caption, rows }: { caption: string; rows: [string, number, number?][] }) {
  // Round with the largest-remainder method so the printed rows add up to
  // the printed total.
  const body = rows.slice(0, -1);
  const total = rows[rows.length - 1]!;
  const dp0 = body.filter((r) => (r[2] ?? 0) === 0).map((r) => r[1]);
  const rounded = allocate(dp0, 0);
  let k = 0;
  return (
    <table>
      <caption>{caption}</caption>
      <tbody>
        {body.map((r, i) => {
          const dp = r[2] ?? 0;
          const v = dp === 0 ? rounded[k++]! : r[1];
          return (
            <tr key={i}>
              <td>{r[0]}</td>
              <td>{fmt(v, dp)} g</td>
            </tr>
          );
        })}
        <tr className="total">
          <td>{total[0]}</td>
          <td>{fmt(total[1])} g</td>
        </tr>
      </tbody>
    </table>
  );
}

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

  return (
    <ToolPage
      emoji="🥖"
      title="Baker's Percentage Calculator"
      blurb="Flour is 100% — everything else is a percentage of it. Tweak hydration, salt and yeast, scale to your loaves, and split the dough into a poolish, biga, levain, pâte fermentée or sponge."
    >
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
                  <th>Protein</th>
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
                    <td className="grams">{r ? round(r.flours[i]!.protein, 1) + "%" : "–"}</td>
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
                    <td className="grams">{round(r.blendProtein, 1)}%</td>
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
                  <td>Water</td>
                  <td>
                    <NumberInput value={state.water} onChange={(v) => dispatch({ type: "set", patch: { water: v } })} min={0} step={1} dp={1} aria-label="Water percent" />
                  </td>
                  <td>
                    <NumberInput value={r?.waterG ?? 0} mode="commit" onChange={(g) => dispatch({ type: "set", patch: { water: pctFromG(g, 1) } })} readOnly={target} min={0} step={5} dp={0} aria-label="Water grams" />
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
            {isLevain && <p className="note">Leavening comes from the levain — the commercial yeast row is off.</p>}
            {r && target && (
              <p className="note">
                {fmt(state.loaves)} loaves × {fmt(state.loafWeight)} g = {fmt(r.totalG)} g dough in total.
              </p>
            )}
            {r && r.missing.length > 0 && <p className="warn">⚠ Unknown ingredient{r.missing.length > 1 ? "s" : ""}: {r.missing.join(", ")} — not counted.</p>}
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
              <div className="split">
                <SplitTable
                  caption={r.pref.label}
                  rows={[
                    ...(r.pref.seedG > 0 ? ([[`Starter (${state.pref.seedHydration}%)`, r.pref.seedG]] as [string, number][]) : []),
                    ...r.pref.flourRows.map((f): [string, number] => [f.name, r.pref!.seedG > 0 ? f.grams - (r.pref!.seedFlourG * f.grams) / r.pref!.flourG : f.grams]),
                    ["Water", r.pref.freshWaterG],
                    ...(r.pref.yeastG > 0 ? ([[r.yeastName, r.pref.yeastG, 2]] as [string, number, number][]) : []),
                    ...(r.pref.saltG > 0 ? ([["Salt", r.pref.saltG, 1]] as [string, number, number][]) : []),
                    ["Total", r.pref.totalG],
                  ]}
                />
                <SplitTable
                  caption="Final dough"
                  rows={[
                    ...r.pref.finalFlourRows.map((f): [string, number] => [f.name, f.grams]),
                    ["Water", r.pref.finalWaterG],
                    ["Salt", r.pref.finalSaltG, 1],
                    ...(r.pref.finalYeastG > 0 || (!isLevain && r.yeastG > 0) ? ([[r.yeastName, r.pref.finalYeastG, 2]] as [string, number, number][]) : []),
                    ...r.extras.map((e): [string, number] => [e.name, e.grams]),
                    [`All of the ${r.pref.label.toLowerCase()}`, r.pref.totalG],
                    ["Total", r.pref.finalTotalG],
                  ]}
                />
              </div>
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

        <Panel title="Guidance">
          <Metric label="Hydration" value={r ? round(r.effHydration, 1) + "%" : "–"}>
            <Meter scale={HYDRATION_SCALE} bands={HYDRATION_BANDS.map((b, i) => ({ from: b.from, to: b.to, cls: i % 2 ? "alt" : "" }))} value={r?.effHydration} />
            <Scale scale={HYDRATION_SCALE} ticks={HYDRATION_TICKS} />
            {r && <p className="verdict">{hydrationVerdict(r.effHydration)}</p>}
            {r && Math.abs(r.effHydration - r.addedHydration) > 0.05 && (
              <p className="note">
                {round(r.addedHydration, 1)}% added water + {fmt(r.extraWaterG)} g water inside the other ingredients → {round(r.effHydration, 1)}% effective.
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

          <Metric label="Blend protein" value={r ? round(r.blendProtein, 1) + "%" : "–"}>
            <Meter scale={PROTEIN_SCALE} bands={[{ from: 11.5, to: 13.5, cls: "target" }]} value={r?.blendProtein} />
            <p className="note">Lean bread wants 11.5–13.5%. Wholemeal and rye absorb more water — push hydration up a few points when they're in the blend.</p>
          </Metric>

          <Metric label="Salt" hint={`target ${SALT_TARGET[0]}–${SALT_TARGET[1]}%`} value={r ? round(state.salt, 1) + "%" : "–"} status={r ? saltStatus : ""}>
            <Meter scale={SALT_SCALE} bands={[{ from: SALT_TARGET[0], to: SALT_TARGET[1], cls: "target" }]} value={state.salt} status={saltStatus} />
          </Metric>

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
        </Panel>
      </div>
    </ToolPage>
  );
}
