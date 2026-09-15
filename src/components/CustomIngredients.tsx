import { useState, type FormEvent } from "react";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  deleteCustomIngredient,
  makeIngredientId,
  totalSolids,
  upsertCustomIngredient,
  useCustomIngredients,
  type Category,
  type Ingredient,
  type Tool,
} from "@/lib/ingredients";
import { NumberInput } from "./NumberInput";
import { Details } from "./Panel";
import { round } from "@/lib/math";

const EMPTY = (tool: Tool, category: Category): Ingredient => ({
  id: "",
  name: "",
  category,
  tools: [tool],
  solids: { fat: 0, protein: 0, sugars: 0, lactose: 0, ash: 0, other: 0 },
  custom: true,
});

interface Props {
  tool: Tool;
  /** Which categories make sense to create from this tool. */
  categories: Category[];
  defaultCategory: Category;
  /** Extra hint under the form. */
  hint?: string;
}

/** Add / edit / delete custom ingredients. Shown only for the current tool. */
export function CustomIngredients({ tool, categories, defaultCategory, hint }: Props) {
  const customs = useCustomIngredients().filter((i) => i.tools.includes(tool));
  const [draft, setDraft] = useState<Ingredient>(() => EMPTY(tool, defaultCategory));
  const [podText, setPodText] = useState("");
  const [pacText, setPacText] = useState("");
  const editing = draft.id !== "";
  const s = draft.solids;
  const solids = totalSolids(s);
  const water = round(100 - solids, 1);
  const set = (patch: Partial<Ingredient>) => setDraft((d) => ({ ...d, ...patch }));
  const setS = (k: keyof Ingredient["solids"], v: number) => setDraft((d) => ({ ...d, solids: { ...d.solids, [k]: v } }));

  const reset = () => {
    setDraft(EMPTY(tool, defaultCategory));
    setPodText("");
    setPacText("");
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name || solids > 100) return;
    const sugars = s.sugars;
    const ing: Ingredient = {
      ...draft,
      name,
      id: editing ? draft.id : makeIngredientId(name),
      tools: Array.from(new Set([...draft.tools, tool])),
      sweet:
        tool === "ice-cream" || podText || pacText
          ? { pod: podText === "" ? sugars : Number(podText) || 0, pac: pacText === "" ? sugars : Number(pacText) || 0 }
          : draft.sweet,
      egg: draft.category === "egg" ? (draft.egg ?? { wholeEq: 1, colour: 0.35 }) : undefined,
      yeast: draft.category === "yeast" ? (draft.yeast ?? { instantEq: 1 }) : undefined,
    };
    upsertCustomIngredient(ing);
    reset();
  };

  const edit = (i: Ingredient) => {
    setDraft({ ...i, solids: { ...i.solids } });
    setPodText(i.sweet ? String(i.sweet.pod) : "");
    setPacText(i.sweet ? String(i.sweet.pac) : "");
  };

  return (
    <Details title={"Your ingredients" + (customs.length ? ` (${customs.length})` : "")}>
      <form className="ing-form" onSubmit={submit}>
        <label className="span2">
          Name
          <input type="text" value={draft.name} onChange={(e) => set({ name: e.target.value })} required />
        </label>
        <label>
          Category
          <select value={draft.category} onChange={(e) => set({ category: e.target.value as Category })}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fat %
          <NumberInput value={s.fat} onChange={(v) => setS("fat", v)} min={0} max={100} step={0.1} aria-label="Fat percent" />
        </label>
        <label>
          Protein %
          <NumberInput value={s.protein} onChange={(v) => setS("protein", v)} min={0} max={100} step={0.1} aria-label="Protein percent" />
        </label>
        <label>
          Sugars %
          <NumberInput value={s.sugars} onChange={(v) => setS("sugars", v)} min={0} max={100} step={0.1} aria-label="Sugars percent" />
        </label>
        <label>
          Lactose %
          <NumberInput value={s.lactose} onChange={(v) => setS("lactose", v)} min={0} max={100} step={0.1} aria-label="Lactose percent" />
        </label>
        <label>
          Ash / minerals %
          <NumberInput value={s.ash} onChange={(v) => setS("ash", v)} min={0} max={100} step={0.05} aria-label="Ash percent" />
        </label>
        <label>
          Other solids %
          <NumberInput value={s.other} onChange={(v) => setS("other", v)} min={0} max={100} step={0.1} aria-label="Other solids percent" />
        </label>
        {tool === "ice-cream" && (
          <>
            <label>
              POD
              <input type="number" inputMode="decimal" value={podText} onChange={(e) => setPodText(e.target.value)} placeholder="= sugars" aria-label="POD" />
            </label>
            <label>
              PAC
              <input type="number" inputMode="decimal" value={pacText} onChange={(e) => setPacText(e.target.value)} placeholder="= sugars" aria-label="PAC" />
            </label>
          </>
        )}
        {draft.category === "egg" && (
          <>
            <label>
              Whole-egg eq
              <NumberInput value={draft.egg?.wholeEq ?? 1} onChange={(v) => set({ egg: { wholeEq: v, colour: draft.egg?.colour ?? 0.35 } })} min={0} step={0.1} aria-label="Whole egg equivalent" />
            </label>
            <label>
              Colour
              <NumberInput value={draft.egg?.colour ?? 0.35} onChange={(v) => set({ egg: { wholeEq: draft.egg?.wholeEq ?? 1, colour: v } })} min={0} step={0.05} aria-label="Colour strength" />
            </label>
          </>
        )}
        {draft.category === "yeast" && (
          <label>
            Instant-yeast eq
            <NumberInput value={draft.yeast?.instantEq ?? 1} onChange={(v) => set({ yeast: { instantEq: v || 1 } })} min={0.01} step={0.05} aria-label="Instant yeast equivalent" />
          </label>
        )}
        <div className="span2" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button type="submit" className="btn btn-primary" disabled={solids > 100}>
            {editing ? "Save changes" : "Add"}
          </button>
          {editing && (
            <button type="button" className="btn" onClick={reset}>
              Cancel
            </button>
          )}
          <span className={"note" + (solids > 100 ? " off" : "")} style={{ margin: 0 }}>
            {solids > 100 ? `Solids add up to ${round(solids, 1)}% — over 100.` : `Water ${water}%`}
          </span>
        </div>
      </form>
      <p className="note">
        {hint ?? "Percentages are per 100 g of the ingredient as bought; water is whatever is left."}
      </p>
      {customs.length > 0 && (
        <ul className="list">
          {customs.map((i) => (
            <li key={i.id}>
              <span>
                {i.name}{" "}
                <span className="meta">
                  {CATEGORY_LABELS[i.category].toLowerCase()} · fat {i.solids.fat}% · protein {i.solids.protein}% · sugars {i.solids.sugars}% · water {round(100 - totalSolids(i.solids), 1)}%
                </span>
              </span>
              <span className="btns">
                <button type="button" className="btn" onClick={() => edit(i)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    if (confirm(`Delete "${i.name}"? Recipes that use it will show it as missing.`)) deleteCustomIngredient(i.id);
                  }}
                >
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Details>
  );
}
