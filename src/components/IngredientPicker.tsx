import { useMemo } from "react";
import { CATEGORIES, CATEGORY_LABELS, useIngredients, type Category, type Ingredient, type Tool } from "@/lib/ingredients";

interface Props {
  value: string;
  onChange: (id: string, ing: Ingredient | undefined) => void;
  tool: Tool;
  categories?: Category[];
  "aria-label": string;
  /** Show a "(missing)" option so a recipe with a deleted ingredient still renders. */
  missingLabel?: string;
}

export function IngredientPicker({ value, onChange, tool, categories, missingLabel, ...rest }: Props) {
  const all = useIngredients();
  const groups = useMemo(() => {
    const list = all.filter(
      (i) => i.tools.includes(tool) && (!categories || categories.includes(i.category)),
    );
    const builtin = list.filter((i) => !i.custom);
    const custom = list.filter((i) => i.custom);
    const byCat = CATEGORIES.map((c) => ({ label: CATEGORY_LABELS[c], items: builtin.filter((i) => i.category === c) })).filter(
      (g) => g.items.length,
    );
    if (custom.length) byCat.push({ label: "Your ingredients", items: custom });
    return byCat;
  }, [all, tool, categories]);

  const known = all.some((i) => i.id === value);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value, all.find((i) => i.id === e.target.value))} {...rest}>
      {!known && <option value={value}>{missingLabel ?? "(missing ingredient)"}</option>}
      {groups.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
