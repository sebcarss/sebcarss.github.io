import { useMemo } from "react";
import { ToolPage } from "@/components/ToolPage";
import { Panel } from "@/components/Panel";
import { Toggle } from "@/components/Toggle";
import { NumberInput } from "@/components/NumberInput";
import { Meter, Metric } from "@/components/Meter";
import { IngredientPicker } from "@/components/IngredientPicker";
import { CustomIngredients } from "@/components/CustomIngredients";
import { RecipeBar } from "@/components/RecipeBar";
import { useDraft } from "@/lib/recipes/draft";
import { useIngredients } from "@/lib/ingredients";
import { fmt, round } from "@/lib/math";
import { compute, hardnessLabel, statusOf } from "./engine";
import { DEFAULT_STATE, IceCreamStateSchema, SCHEMA_VERSION, parseState, reducer, type IceCreamState } from "./state";
import { LACTOSE_RISK, LACTOSE_WARN, METRICS, SERVING_TEMP_C, TARGETS } from "./targets";
import { summary, toText } from "./text";

const TOOL = "ice-cream" as const;

export function IceCream() {
  const [state, dispatch] = useDraft(TOOL, reducer, DEFAULT_STATE, IceCreamStateSchema);
  const ingredients = useIngredients();
  const byId = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);
  const r = useMemo(() => compute(state, (id) => byId.get(id)), [state, byId]);
  const t = TARGETS[state.style];

  return (
    <ToolPage
      emoji="🍦"
      title="Ice Cream Calculator"
      blurb="Build a recipe in grams and balance its fat, sugar and MSNF against ice cream, gelato or sorbet targets — including POD (sweetness) and PAC (anti-freezing power)."
    >
      <Toggle
        label="Recipe style"
        value={state.style}
        onChange={(style) => dispatch({ type: "style", style })}
        options={[
          { value: "icecream", label: "Ice cream" },
          { value: "gelato", label: "Gelato" },
          { value: "sorbet", label: "Sorbet" },
        ]}
      />

      <div className="tool-grid">
        <div>
          <Panel title="Ingredients">
            <table className="rows">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Grams</th>
                  <th>Solids</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {state.rows.map((row, i) => {
                  const rr = r?.rows[i];
                  return (
                    <tr key={i}>
                      <td>
                        <IngredientPicker
                          tool={TOOL}
                          value={row.ing}
                          onChange={(id) => dispatch({ type: "set-ing", index: i, ing: id })}
                          aria-label={`Ingredient ${i + 1}`}
                          missingLabel={`${row.ing} (missing)`}
                        />
                      </td>
                      <td>
                        <NumberInput value={row.grams} onChange={(g) => dispatch({ type: "set-grams", index: i, grams: g })} min={0} step={1} dp={1} aria-label="Grams" />
                      </td>
                      <td className={"grams" + (rr?.missing ? " missing" : "")}>
                        {rr?.missing ? "unknown" : rr && row.grams > 0 ? fmt(rr.solidsG) + " g" : "–"}
                      </td>
                      <td>
                        <button type="button" className="remove" aria-label="Remove row" onClick={() => dispatch({ type: "remove", index: i })}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td>Total</td>
                  <td style={{ textAlign: "right" }}>{r ? fmt(r.grams) + " g" : "–"}</td>
                  <td className="grams">{r ? fmt(r.solidGrams) + " g" : "–"}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            <div className="actions">
              <button type="button" className="btn" onClick={() => dispatch({ type: "add", ing: "whole-milk" })}>
                + Add ingredient
              </button>
              <button type="button" className="btn" onClick={() => dispatch({ type: "clear" })}>
                Clear
              </button>
            </div>
            {r && r.missing.length > 0 && (
              <p className="warn">⚠ Unknown ingredient{r.missing.length > 1 ? "s" : ""}: {r.missing.join(", ")} — not counted. Pick a replacement or re-create it under Your ingredients.</p>
            )}
          </Panel>

          <RecipeBar<IceCreamState>
            tool={TOOL}
            title="Ice cream"
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
            categories={["dairy", "liquid", "sweetener", "egg", "fat", "flavour", "inclusion", "stabiliser", "other"]}
            defaultCategory="other"
            hint="Percentages are per 100 g of the ingredient. Lactose goes in its own box (its POD/PAC are added automatically); POD/PAC cover the other sugars and default to the sugars figure, i.e. sucrose."
          />
        </div>

        <Panel title="Composition">
          {METRICS.map((m) => {
            const value = r ? r.metrics[m.key] : null;
            const range = m.key === "other" ? null : t[m.key];
            const status = statusOf(state.style, m.key, value);
            return (
              <Metric
                key={m.key}
                label={m.label}
                hint={range ? `target ${range[0]}–${range[1]}${m.unit}` : undefined}
                value={value == null ? "–" : round(value, m.dp) + m.unit}
                status={status}
              >
                {range && m.scaleMax && (
                  <Meter scale={[0, m.scaleMax]} bands={[{ from: range[0], to: range[1], cls: "target" }]} value={value} status={status} />
                )}
              </Metric>
            );
          })}
          {r && (
            <>
              <p className="note">Water: {round(100 - r.metrics.solids, 1)}% of the mix.</p>
              <p className="note">
                Initial freezing point ≈ {round(r.freezingPointC, 1)} °C · about {Math.round(r.frozenAtServing * 100)}% of the water is ice at {SERVING_TEMP_C} °C → {hardnessLabel(r.frozenAtServing)}.
              </p>
              <p className={"note" + (r.lactoseOfWater > LACTOSE_RISK ? " off" : "")}>
                Lactose {round(r.lactosePct, 1)}% of mix · {round(r.lactoseOfWater, 1)}% of the water phase
                {r.lactoseOfWater > LACTOSE_RISK
                  ? " — high enough to crystallise and taste sandy; cut the milk powder."
                  : r.lactoseOfWater > LACTOSE_WARN
                    ? " — near the limit for sandiness."
                    : "."}
              </p>
            </>
          )}
          <p className="note">
            Targets are typical published ranges — a guide, not a rulebook. PAC includes the lactose in MSNF; higher PAC means a softer scoop at a given temperature. The freezing-point and hardness figures are an ideal-solution estimate.
          </p>
        </Panel>
      </div>
    </ToolPage>
  );
}
