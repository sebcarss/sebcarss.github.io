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
import { clamp, fmt, mmss, round } from "@/lib/math";
import { attrValues, brothsSuiting, compute, nearestStylesForCut, rankStyles, referenceFormula, scoreStyle, stylesForCut, whyNull, type RamenResult } from "./engine";
import { DEFAULT_STATE, RamenStateSchema, SCHEMA_VERSION, parseState, reducer, type RamenState } from "./state";
import {
  ALKALI_SCALE, ALKALI_TARGET, ATTRS, BROTHS, CRIMPS, CUT_NUMBERS, HYDRATION_BANDS, HYDRATION_SCALE, HYDRATION_TICKS, KANSUI_FORMS, KANSUI_FORM_IDS,
  OWNED_CUTTERS, PROTEIN_SCALE, PROTEIN_TARGET, ROLLER, SALT_SCALE, SALT_TARGET, STYLES, cutFor, ownedCutter, styleBand, styleById, type Attr, type KansuiForm,
} from "./data";
import { fmtCut, summary, toText } from "./text";

const TOOL = "ramen" as const;
const NICE_MM = [0.25, 0.5, 1, 2, 5, 10];

const fmtTarget = (a: Attr, range: readonly [number, number]) => {
  if (a.key === "crimp") return range[0] === range[1] ? CRIMPS[range[0]]! : `${CRIMPS[range[0]]}–${CRIMPS[range[1]]!.toLowerCase()}`;
  return `${round(range[0], a.dp)}–${round(range[1], a.dp)}${a.unit}`;
};
const fmtValue = (a: Attr, v: number) => (a.key === "crimp" ? CRIMPS[v]! : round(v, a.dp) + a.unit);

function CrossSection({ r }: { r: RamenResult }) {
  const W = 300, H = 110, count = 5;
  let scale = 250 / (count * r.widthMm + (count - 1) * r.widthMm * 0.6);
  scale = Math.min(scale, 56 / r.thicknessMm, 160);
  const w = r.widthMm * scale, h = r.thicknessMm * scale, gap = w * 0.6;
  const totalW = count * w + (count - 1) * gap, x0 = (W - totalW) / 2, yMid = 48;
  const fill = `rgb(${r.colourRgb.join(",")})`;
  const barMm = NICE_MM.find((m) => m * scale >= 40) ?? NICE_MM[NICE_MM.length - 1]!;
  const barW = barMm * scale, barX = (W - barW) / 2;
  return (
    <>
      <div className="preview">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Noodle cross-section, to scale">
          {Array.from({ length: count }, (_, i) => (
            <rect key={i} x={x0 + i * (w + gap)} y={yMid - h / 2} width={w} height={h} rx={Math.min(w, h) * 0.12} fill={fill} stroke="#9ca3af" strokeWidth={0.8} />
          ))}
          <line x1={barX} y1={88} x2={barX + barW} y2={88} stroke="#6b7280" strokeWidth={1} />
          <line x1={barX} y1={84} x2={barX} y2={92} stroke="#6b7280" strokeWidth={1} />
          <line x1={barX + barW} y1={84} x2={barX + barW} y2={92} stroke="#6b7280" strokeWidth={1} />
          <text x={W / 2} y={104} textAnchor="middle" fill="#6b7280" fontSize={10}>
            {barMm} mm
          </text>
        </svg>
      </div>
      <p className="note">Cross-section at {Math.round(scale)}× — {r.shapeLabel}.</p>
    </>
  );
}

function CrimpProfile({ r }: { r: RamenResult }) {
  const stroke = clamp(r.thicknessMm * 5, 2, 14);
  const amp = Math.min([0, 0.6, 1.3, 2.1][r.crimpIdx]! * stroke, [0, 8, 13, 18][r.crimpIdx]!);
  const period = [1, 90, 55, 38][r.crimpIdx]!;
  let d = "M 20 32";
  for (let x = 20; x <= 280; x += 2) d += ` L ${x} ${(32 + (amp ? Math.sin(((x - 20) / period) * Math.PI * 2) * amp : 0)).toFixed(2)}`;
  return (
    <div className="preview">
      <svg viewBox="0 0 300 72" role="img" aria-label="Noodle crimp profile">
        <path d={d} fill="none" stroke={`rgb(${r.colourRgb.join(",")})`} strokeWidth={stroke} strokeLinecap="round" />
        <path d={d} fill="none" stroke="#9ca3af" strokeWidth={0.6} />
        <text x={150} y={66} textAnchor="middle" fill="#6b7280" fontSize={10}>
          {CRIMPS[r.crimpIdx]} — profile along the strand
        </text>
      </svg>
    </div>
  );
}

export function Ramen() {
  const [state, dispatch] = useDraft(TOOL, reducer, DEFAULT_STATE, RamenStateSchema);
  const ingredients = useIngredients();
  const byId = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);
  const lookup = (id: string) => byId.get(id);
  const r = useMemo(() => compute(state, lookup), [state, byId]); // eslint-disable-line react-hooks/exhaustive-deps
  const vals = useMemo(() => (r ? attrValues(r) : null), [r]);
  const ranked = useMemo(() => (vals && state.matchMode === "rank" ? rankStyles(vals) : []), [vals, state.matchMode]);
  const picked = styleById(state.style) ?? STYLES[0]!;
  const pickedScore = vals ? scoreStyle(vals, picked) : null;
  const target = state.mode === "target";
  const kf = KANSUI_FORMS[state.kansui.form as KansuiForm];
  const eggTypes = ingredients.filter((i) => i.category === "egg" && i.tools.includes("ramen"));
  const eggOff = !state.egg.ing;

  // Gram → % write-back. In target mode flour depends on the total %, so solve
  // pct from the dough the servings need rather than the stale flour weight.
  const pctFromG = (g: number, currentPct: number, dp: number) => {
    if (!r) return currentPct;
    if (!target || r.doughNeededG == null) return round((g / r.flourG) * 100, dp);
    const basePct = r.totalPct - currentPct;
    const denom = r.doughNeededG - g;
    return denom > 0 ? round((basePct * g) / denom, dp) : currentPct;
  };

  const setEggForm = (ing: string | null) => {
    if (!ing) return dispatch({ type: "egg", patch: { ing: null } });
    const wholeEq = lookup(ing)?.egg?.wholeEq ?? 1;
    // Seed a sensible amount when the row is empty so picking a form is never a no-op.
    const pct = state.egg.pct > 0 ? state.egg.pct : round(Math.min(10, 10 / wholeEq), 1);
    dispatch({ type: "egg", patch: { ing, pct } });
  };

  const nullReason = r ? null : whyNull(state);

  return (
    <ToolPage
      emoji="🍜"
      title="Ramen Noodle Calculator"
      blurb={
        <>
          A ramen noodle is its dough <em>and</em> its cut. Build a flour blend, set hydration, kansui and egg, pick a cut number and crimp — then see which of twenty-two regional styles you've actually made.
        </>
      }
    >
      <div className="tool-grid">
        <div>
          <Panel title="Batch">
            <Toggle
              label="Scaling mode"
              value={state.mode}
              onChange={(mode) => dispatch({ type: "mode", mode, flourG: r?.flourG, servings: r?.servings })}
              options={[
                { value: "flour", label: "Flour weight" },
                { value: "target", label: "Target yield" },
              ]}
            />
            <div className="params">
              {!target ? (
                <label>
                  Flour g
                  <NumberInput value={state.flourGrams} onChange={(v) => dispatch({ type: "set", patch: { flourGrams: v } })} min={0} step={50} dp={0} aria-label="Flour grams" />
                </label>
              ) : (
                <label>
                  Servings
                  <NumberInput value={state.servings} onChange={(v) => dispatch({ type: "set", patch: { servings: v } })} min={1} step={1} dp={0} aria-label="Servings" />
                </label>
              )}
              <label>
                g per serving
                <NumberInput value={state.servingG} onChange={(v) => dispatch({ type: "set", patch: { servingG: v } })} min={1} step={10} dp={0} aria-label="Grams per serving" />
              </label>
              <label>
                Waste %
                <NumberInput value={state.waste} onChange={(v) => dispatch({ type: "set", patch: { waste: clamp(v, 0, 30) } })} min={0} max={30} step={1} dp={0} aria-label="Waste percent" />
              </label>
              {target && r && <span className="note" style={{ margin: 0 }}>→ {fmt(r.flourG)} g flour</span>}
            </div>
            <p className="note">Waste covers the trim and the shaggy ends lost to sheeting. Dusting starch (<em>uchiko</em>) sits outside the formula — it never counts toward the percentages.</p>

            <h3>
              Flour blend <span className="note" style={{ fontWeight: 400 }}>(shares of the 100%)</span>
            </h3>
            <table className="rows tight">
              <thead>
                <tr>
                  <th>Flour</th>
                  <th>Share %</th>
                  <th>Protein</th>
                  <th>Ash</th>
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
                      <NumberInput value={f.share} onChange={(v) => dispatch({ type: "flour-set", index: i, patch: { share: v } })} min={0} step={5} dp={1} aria-label={`Share percent ${i + 1}`} />
                    </td>
                    <td className="grams">{r ? round(r.flourRows[i]!.protein, 1) + "%" : "–"}</td>
                    <td className="grams">{r ? round(r.flourRows[i]!.ash, 2) + "%" : "–"}</td>
                    <td className="grams">{r ? fmt(r.flourRows[i]!.grams) + " g" : "–"}</td>
                    <td>
                      {state.flours.length > 1 && (
                        <button type="button" className="remove" aria-label={`Remove flour ${i + 1}`} onClick={() => dispatch({ type: "flour-remove", index: i })}>
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td>Blend</td>
                  <td className="grams">{r ? round(r.shareTotal, 1) + "%" : ""}</td>
                  <td className="grams">{r ? round(r.blendProtein, 1) + "%" : ""}</td>
                  <td className="grams">{r ? round(r.blendAsh, 2) + "%" : ""}</td>
                  <td>{r ? fmt(r.flourG) + " g" : ""}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            <div className="actions">
              <button type="button" className="btn" onClick={() => dispatch({ type: "flour-add", ing: "plain-flour" })}>
                + Add flour
              </button>
            </div>
            <p className="note">Vital wheat gluten and starches belong in this table — they shift the blend's protein up or down, which is what the styles are scored against. Add your own flours under Your ingredients.</p>
          </Panel>

          <Panel title="Dough">
            <div className="params">
              <label>
                Kansui form
                <select value={state.kansui.form} onChange={(e) => dispatch({ type: "kansui", patch: { form: e.target.value } })}>
                  {KANSUI_FORM_IDS.map((id) => (
                    <option key={id} value={id}>
                      {id === "none" ? "None" : KANSUI_FORMS[id].label[0]!.toUpperCase() + KANSUI_FORMS[id].label.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              {kf.conc && (
                <label>
                  Solution strength %
                  <NumberInput value={state.kansui.conc} onChange={(v) => dispatch({ type: "kansui", patch: { conc: clamp(v, 1, 100) } })} min={1} max={100} step={1} dp={0} aria-label="Kansui solution strength" />
                </label>
              )}
              {kf.ratio && (
                <label>
                  K₂CO₃ share % <span>{state.kansui.ratio} : {100 - state.kansui.ratio}</span>
                  <input type="range" min={0} max={100} step={5} value={state.kansui.ratio} onChange={(e) => dispatch({ type: "kansui", patch: { ratio: Number(e.target.value) } })} aria-label="Potassium carbonate share" />
                </label>
              )}
              <label>
                Egg form
                <select value={state.egg.ing ?? ""} onChange={(e) => setEggForm(e.target.value || null)} aria-label="Egg form">
                  <option value="">None</option>
                  {eggTypes.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                  {state.egg.ing && !byId.has(state.egg.ing) && <option value={state.egg.ing}>{state.egg.ing} (missing)</option>}
                </select>
              </label>
              <label>
                Aging h
                <NumberInput value={state.aging} onChange={(v) => dispatch({ type: "set", patch: { aging: v } })} min={0} max={168} step={1} dp={0} aria-label="Aging hours" />
              </label>
            </div>

            <table className="rows hint">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>% of flour</th>
                  <th>Grams</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Water</td>
                  <td>
                    <NumberInput value={state.water} onChange={(v) => dispatch({ type: "set", patch: { water: v } })} min={0} step={0.5} dp={1} aria-label="Water percent" />
                  </td>
                  <td>
                    <NumberInput value={r?.addedWaterG ?? 0} mode="commit" onChange={(g) => dispatch({ type: "set", patch: { water: pctFromG(g, state.water, 1) } })} min={0} step={5} dp={0} aria-label="Water grams" />
                  </td>
                  <td className="grams">added only</td>
                </tr>
                <tr>
                  <td>Salt</td>
                  <td>
                    <NumberInput value={state.salt} onChange={(v) => dispatch({ type: "set", patch: { salt: v } })} min={0} step={0.1} dp={2} aria-label="Salt percent" />
                  </td>
                  <td>
                    <NumberInput value={r?.saltG ?? 0} mode="commit" onChange={(g) => dispatch({ type: "set", patch: { salt: pctFromG(g, state.salt, 2) } })} min={0} step={0.5} dp={1} aria-label="Salt grams" />
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td>Kansui — {kf.label}</td>
                  <td>
                    <NumberInput value={state.kansui.pct} onChange={(v) => dispatch({ type: "kansui", patch: { pct: v } })} min={0} step={0.05} dp={2} disabled={state.kansui.form === "none"} aria-label="Kansui percent" />
                  </td>
                  <td>
                    <NumberInput value={r?.kansuiG ?? 0} mode="commit" onChange={(g) => dispatch({ type: "kansui", patch: { pct: pctFromG(g, state.kansui.pct, 2) } })} min={0} step={0.5} dp={1} disabled={state.kansui.form === "none"} aria-label="Kansui grams" />
                  </td>
                  <td className="grams">{r && r.kForm !== "none" ? round(r.alkaliEqPct, 2) + "% kansui-eq" : ""}</td>
                </tr>
                <tr>
                  <td>Egg — {r?.egg ? r.egg.name.toLowerCase() : "none"}</td>
                  <td>
                    <NumberInput value={state.egg.pct} onChange={(v) => dispatch({ type: "egg", patch: { pct: v } })} min={0} step={0.5} dp={1} disabled={eggOff} aria-label="Egg percent" />
                  </td>
                  <td>
                    <NumberInput value={r?.eggG ?? 0} mode="commit" onChange={(g) => dispatch({ type: "egg", patch: { pct: pctFromG(g, state.egg.pct, 1) } })} min={0} step={1} dp={1} disabled={eggOff} aria-label="Egg grams" />
                  </td>
                  <td className="grams">{r && r.eggPct > 0 ? `${round(r.eggWholeEqPct, 1)}% whole-egg eq · fat ${round(r.eggFatPct, 1)}%` : ""}</td>
                </tr>
                <tr>
                  <td>Colourant</td>
                  <td>
                    <NumberInput value={state.colour} onChange={(v) => dispatch({ type: "set", patch: { colour: v } })} min={0} step={0.01} dp={3} aria-label="Colourant percent" />
                  </td>
                  <td>
                    <NumberInput value={r?.colourG ?? 0} mode="commit" onChange={(g) => dispatch({ type: "set", patch: { colour: pctFromG(g, state.colour, 3) } })} min={0} step={0.1} dp={2} aria-label="Colourant grams" />
                  </td>
                  <td className="grams">turmeric / gardenia</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td>Total dough</td>
                  <td className="grams">{r ? round(r.totalPct, 1) + "%" : ""}</td>
                  <td>{r ? fmt(r.doughG) + " g" : ""}</td>
                  <td className="grams">{r ? `${fmt(r.servings, 1)} × ${fmt(r.servingG)} g after ${fmt(r.wastePct)}% waste` : ""}</td>
                </tr>
              </tfoot>
            </table>
            {r && (
              <p className="note">
                {r.kForm === "none"
                  ? "No alkali. Kansui is what makes a wheat noodle a ramen noodle — it yellows the flour's flavones, tightens the gluten and gives that springy bite."
                  : r.kForm === "liquid"
                    ? `Liquid kansui is a solution: only ${fmt(r.kansuiSaltG, 1)} g of the ${fmt(r.kansuiG, 1)} g is salt. The rest is water, and it is counted in the hydration.`
                    : r.kForm === "baked"
                      ? "Baked baking soda is pure Na₂CO₃ — about 0.79% matches 1% of a 90:10 kansui powder. Sodium-forward alkali gives more snap and less spring."
                      : r.kForm === "bicarb"
                        ? "Raw bicarbonate is a much weaker base — you need roughly 1.8× as much as kansui powder, and it brings a soda tang with it."
                        : "Potassium-forward blends (90:10) give more spring; sodium-forward ones give a firmer, snappier bite."}
              </p>
            )}
            {r && r.egg && r.eggPct > 0 && (
              <p className="note">
                {r.egg.name} adds {fmt(r.eggWaterG)} g water, {round(r.eggFatPct, 1)}% fat and {round(r.eggProteinPct, 1)}% protein to the dough ({round(r.doughProtein, 1)}% with the flour).
              </p>
            )}
            {nullReason && <p className="warn">⚠ {nullReason}</p>}
            {r && r.problems.length > 0 && <p className="warn">⚠ {r.problems.join("; ")}.</p>}
            {r && r.missing.length > 0 && <p className="warn">⚠ Unknown ingredient{r.missing.length > 1 ? "s" : ""}: {r.missing.join(", ")}.</p>}
          </Panel>

          <Panel title="Cut">
            <div className="params">
              <label className="wide">
                Cutter (番手)
                <select value={String(state.cut)} onChange={(e) => dispatch({ type: "set", patch: { cut: Number(e.target.value) } })} aria-label="Cutter">
                  <optgroup label="On your KitchenAid (5KSMPSA)">
                    {OWNED_CUTTERS.map((c) => (
                      <option key={c.label} value={String(cutFor(c.widthMm))}>
                        {c.label} — {c.widthMm.toFixed(2)} mm (#{fmtCut(cutFor(c.widthMm))})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Japanese cutters — hand-cut or buy">
                    {CUT_NUMBERS.map((n) => (
                      <option key={n} value={String(n)}>
                        #{n} — {(30 / n).toFixed(2)} mm wide
                      </option>
                    ))}
                  </optgroup>
                  {!CUT_NUMBERS.includes(state.cut) && !ownedCutter(state.cut) && <option value={String(state.cut)}>#{fmtCut(state.cut)}</option>}
                </select>
              </label>
              <label>
                Roller setting
                <select value={String(state.thickness)} onChange={(e) => dispatch({ type: "set", patch: { thickness: Number(e.target.value) } })} aria-label="Roller setting">
                  {ROLLER.map((s) => (
                    <option key={s.setting} value={String(s.mm)}>
                      {s.setting} — ≈{s.mm.toFixed(2)} mm · {s.use}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Crimp
                <select value={String(state.crimp)} onChange={(e) => dispatch({ type: "set", patch: { crimp: Number(e.target.value) } })} aria-label="Crimp">
                  {CRIMPS.map((c, i) => (
                    <option key={c} value={String(i)}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {r && (
              <div className="kit note">
                <div className="have">
                  Roller {r.roller.setting} ≈ {r.roller.mm.toFixed(2)} mm — {r.roller.use.toLowerCase()}.
                </div>
                {(() => {
                  const owned = ownedCutter(r.cut);
                  if (owned) return <div className="have">✓ {owned.label} — you have this blade.</div>;
                  const nearest = OWNED_CUTTERS.reduce((best, c) => (Math.abs(c.widthMm - r.widthMm) < Math.abs(best.widthMm - r.widthMm) ? c : best));
                  return (
                    <div className="lack">
                      ⚠ No blade this size on the 5KSMPSA — cut by hand, or buy a #{fmtCut(r.cut)}. Closest you own is the {nearest.label.toLowerCase()} at {nearest.widthMm.toFixed(2)} mm.
                    </div>
                  );
                })()}
                <div>
                  {(() => {
                    const reach = stylesForCut(r.cut);
                    return reach.length
                      ? `At this width: ${reach.slice(0, 5).join(", ")}${reach.length > 5 ? ` and ${reach.length - 5} more.` : "."}`
                      : `No style in the list is cut this wide — the nearest are ${nearestStylesForCut(r.cut).join(" and ")}.`;
                  })()}
                </div>
              </div>
            )}
            <p className="note">Cut number is how many blades divide 30 mm, so a higher number is a <em>thinner</em> noodle: width = 30 ÷ n. Thickness comes from the roller gap instead — the ratio of the two is what makes a noodle square, flat or wide.</p>
            {r && (
              <>
                <table className="guide-table">
                  <tbody>
                    <tr><td>Width</td><td>{r.widthMm.toFixed(2)} mm (30 ÷ {fmtCut(r.cut)})</td></tr>
                    <tr><td>Thickness</td><td>{r.thicknessMm.toFixed(2)} mm (roller {r.roller.setting})</td></tr>
                    <tr><td>Aspect (w : t)</td><td>{r.aspect.toFixed(2)} : 1 — {r.shapeLabel}</td></tr>
                    <tr><td>Cross-section</td><td>{r.areaMm2.toFixed(2)} mm²</td></tr>
                  </tbody>
                </table>
                <CrossSection r={r} />
                <CrimpProfile r={r} />
              </>
            )}
          </Panel>

          <RecipeBar<RamenState>
            tool={TOOL}
            title="Ramen noodles"
            schema={SCHEMA_VERSION}
            state={state}
            parse={parseState}
            onLoad={(s) => dispatch({ type: "replace", state: s })}
            onNew={() => dispatch({ type: "replace", state: DEFAULT_STATE })}
            toText={(s, name, notes) => {
              const rr = compute(s, lookup);
              const top = rr ? rankStyles(attrValues(rr), 1)[0] ?? null : null;
              return toText(s, rr, top, name, notes);
            }}
            summary={summary}
          />

          <CustomIngredients tool={TOOL} categories={["flour", "starch", "egg", "fat", "other"]} defaultCategory="flour" hint="For a flour, protein and ash are the bag figures; the styles are scored against the blend's weighted protein." />
        </div>

        <div>
          <Panel title="Analysis">
            <Metric label="Effective hydration" value={r ? round(r.effHydration, 1) + "%" : "–"}>
              <Meter scale={HYDRATION_SCALE} bands={HYDRATION_BANDS.map((b, i) => ({ from: b.from, to: b.to, cls: i % 2 ? "alt" : "" }))} value={r?.effHydration} />
              <Scale scale={HYDRATION_SCALE} ticks={HYDRATION_TICKS} />
              {r && (
                <p className="verdict">
                  {(() => {
                    const h = r.effHydration;
                    const m = HYDRATION_BANDS.find((b, i) => h >= b.from && (h < b.to || (i === HYDRATION_BANDS.length - 1 && h <= b.to)));
                    return m ? `→ ${m.label.toLowerCase()}.` : h < HYDRATION_BANDS[0].from ? "→ drier than any noodle anyone sells." : "→ wetter than ramen dough goes — this is closer to udon.";
                  })()}
                </p>
              )}
              {r && (
                <p className="note">
                  Added water {round(r.addedHydration, 1)}% · kansui {fmt(r.kansuiWaterG)} g · egg {fmt(r.eggWaterG)} g → {fmt(r.totalWaterG)} g total water.
                </p>
              )}
              <table className="guide-table left">
                <tbody>
                  {HYDRATION_BANDS.map((b) => (
                    <tr key={b.from}>
                      <td>{b.from}–{b.to}%</td>
                      <td>{b.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Metric>

            <Metric label="Blend protein" hint="11–13%" value={r ? round(r.blendProtein, 1) + "%" : "–"} status={r ? (statusFor(r.blendProtein, PROTEIN_TARGET) === "ok" ? "ok" : "off") : ""}>
              <Meter scale={PROTEIN_SCALE} bands={[{ from: PROTEIN_TARGET[0], to: PROTEIN_TARGET[1], cls: "target" }]} value={r?.blendProtein} />
              {r && (
                <p className="verdict">
                  {r.blendProtein < 9.5
                    ? "→ too weak to sheet thin without tearing."
                    : r.blendProtein < 11
                      ? "→ soft — tender, less snap. Fine for a delicate shio."
                      : r.blendProtein > 14.5
                        ? "→ very strong — hard work to sheet, and it will want a long rest."
                        : r.blendProtein > 13
                          ? "→ strong — chewy, good for thick or tsukemen noodles."
                          : "→ the standard ramen window."}
                </p>
              )}
            </Metric>

            <Metric label="Alkali" hint="kansui-eq, 0.8–1.3%" value={r ? round(r.alkaliEqPct, 2) + "%" : "–"} status={r ? (statusFor(r.alkaliEqPct, ALKALI_TARGET) === "ok" ? "ok" : "off") : ""}>
              <Meter scale={ALKALI_SCALE} bands={[{ from: ALKALI_TARGET[0], to: ALKALI_TARGET[1], cls: "target" }]} value={r?.alkaliEqPct} />
              {r && (
                <p className="verdict">
                  {r.alkaliEqPct === 0
                    ? "→ no alkali at all. That's a Chinese-style wheat noodle, not a ramen noodle."
                    : r.alkaliEqPct < 0.5
                      ? "→ barely alkaline — pale and soft, Kagoshima territory."
                      : r.alkaliEqPct > 1.8
                        ? "→ very high — expect a soapy, bitter edge and a slippery surface."
                        : r.alkaliEqPct > 1.3
                          ? "→ high — deep yellow and very springy, Sapporo territory."
                          : "→ the usual working range."}
                </p>
              )}
            </Metric>

            <Metric label="Salt" hint="1–2%" value={r ? round(state.salt, 1) + "%" : "–"} status={r ? (statusFor(state.salt, SALT_TARGET) === "ok" ? "ok" : "off") : ""}>
              <Meter scale={SALT_SCALE} bands={[{ from: SALT_TARGET[0], to: SALT_TARGET[1], cls: "target" }]} value={state.salt} />
            </Metric>

            <Metric label="Predicted colour" value={<span className="swatch" style={{ background: r ? `rgb(${r.colourRgb.join(",")})` : "transparent" }} />}>
              {r && <p className="verdict">{r.yellow < 0.15 ? "Near-white — no alkali or egg to yellow it." : r.yellow < 0.45 ? "Pale straw." : r.yellow < 0.8 ? "The familiar ramen yellow." : "Deep yellow — heavy kansui, egg, or both."}</p>}
            </Metric>

            <Metric label="Texture" hint="heuristic">
              <div className="tex">
                {([["Chew (koshi)", r?.texture.chew], ["Firmness", r?.texture.firmness], ["Smoothness", r?.texture.smoothness]] as [string, number | undefined][]).map(([label, v]) => (
                  <span key={label} style={{ display: "contents" }}>
                    <span className="label">{label}</span>
                    <div className="track">
                      <div className="fill" style={{ width: (v ?? 0) + "%" }} />
                    </div>
                    <span className="num">{v == null ? "–" : Math.round(v)}</span>
                  </span>
                ))}
              </div>
            </Metric>

            <Metric label="Boil time" hint="estimate">
              {r && (
                <table className="guide-table">
                  <tbody>
                    {r.cook.map(([label, secs]) => (
                      <tr key={label}>
                        <td>{label}</td>
                        <td>{mmss(secs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Metric>
          </Panel>

          <Panel title="Style">
            <Toggle
              label="Style matching mode"
              value={state.matchMode}
              onChange={(matchMode) => dispatch({ type: "set", patch: { matchMode } })}
              options={[
                { value: "pick", label: "Match a style" },
                { value: "rank", label: "What did I make?" },
              ]}
            />
            {state.matchMode === "pick" ? (
              <div>
                <div className="params">
                  <label className="wide">
                    Style
                    <select value={picked.id} onChange={(e) => dispatch({ type: "set", patch: { style: e.target.value } })} aria-label="Style">
                      {(Object.keys(BROTHS) as (keyof typeof BROTHS)[]).map((b) => (
                        <optgroup key={b} label={BROTHS[b].label}>
                          {STYLES.filter((s) => s.broth === b).map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label} ({s.region})
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="note">
                  {picked.region} · {picked.note}
                </p>
                <div className="actions" style={{ alignItems: "center" }}>
                  <button type="button" className="btn" onClick={() => dispatch({ type: "replace", state: referenceFormula(picked, state, lookup) })}>
                    Load reference formula
                  </button>
                  {pickedScore && <span className="value">{Math.round(pickedScore.pct)}% match</span>}
                </div>
                {vals && (
                  <table className="delta">
                    <thead>
                      <tr>
                        <th></th>
                        <th>Yours</th>
                        <th>Target</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ATTRS.map((a) => {
                        const band = styleBand(picked, a.key);
                        const v = vals[a.key];
                        const inBand = v >= band[0] && v <= band[1];
                        return (
                          <tr key={a.key}>
                            <td>{a.label}</td>
                            <td className={inBand ? "ok" : "off"}>{(inBand ? "✓ " : "⚠ ") + fmtValue(a, v)}</td>
                            <td>{fmtTarget(a, band)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                <p className="note">Loading a reference replaces the whole formula, cut and crimp, keeping your egg form.</p>
              </div>
            ) : (
              <div>
                {r && (
                  <p className="note">
                    {(() => {
                      const suits = brothsSuiting(r);
                      return suits.length ? `On the broad broth-type bands this suits: ${suits.join(", ")}.` : "This falls outside all four broad broth-type bands — a speciality noodle.";
                    })()}
                  </p>
                )}
                <ul className="rank">
                  {ranked.map((row) => (
                    <li key={row.style.id}>
                      <div className="head">
                        <span>{row.style.label}</span>
                        <span className="pct">{Math.round(row.pct)}%</span>
                      </div>
                      <div className="track">
                        <div className="fill" style={{ width: clamp(row.pct, 0, 100) + "%" }} />
                      </div>
                      <p className="why">{row.misses.length ? `Off on ${row.misses.map((a) => a.label.toLowerCase()).join(", ")}.` : "Everything inside the band."}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="note">Ranges are approximate published and community figures — a decent map, not gospel. Shops vary, and most guard their exact spec.</p>
          </Panel>
        </div>
      </div>
    </ToolPage>
  );
}
