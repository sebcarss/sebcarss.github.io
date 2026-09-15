import { useSyncExternalStore } from "react";
import { z } from "zod";
import { readJSON, writeJSON, persistStorage } from "../storage";
import { TOOLS, type Tool } from "../ingredients/schema";
import { uid } from "../math";

export const KEY = "sc:recipes:v1";

export const SavedRecipeSchema = z.object({
  id: z.string().min(1),
  tool: z.enum(TOOLS),
  name: z.string().min(1),
  notes: z.string().default(""),
  createdAt: z.string(),
  updatedAt: z.string(),
  /** Version of the tool's own `state` shape, so tools can migrate it. */
  schema: z.number().int().nonnegative(),
  state: z.unknown(),
});
export type SavedRecipe<S = unknown> = Omit<z.infer<typeof SavedRecipeSchema>, "state"> & {
  state: S;
};

// Parse leniently: keep every entry that validates, drop the rest with a
// warning rather than losing the whole list to one bad record.
const LenientList = z.array(z.unknown()).transform((items) =>
  items.flatMap((it) => {
    const r = SavedRecipeSchema.safeParse(it);
    if (r.success) return [r.data];
    console.warn("recipes: skipping invalid saved recipe", r.error.issues[0]);
    return [];
  }),
);

let recipes: SavedRecipe[] = readJSON(KEY, LenientList, []);
const listeners = new Set<() => void>();

function commit(next: SavedRecipe[]) {
  recipes = next;
  writeJSON(KEY, recipes);
  listeners.forEach((l) => l());
}

export const getRecipes = () => recipes;

export function listRecipes<S>(tool: Tool): SavedRecipe<S>[] {
  return recipes.filter((r) => r.tool === tool) as SavedRecipe<S>[];
}

export function findRecipe<S>(id: string) {
  return recipes.find((r) => r.id === id) as SavedRecipe<S> | undefined;
}

export function findRecipeByName<S>(tool: Tool, name: string) {
  const n = name.trim().toLowerCase();
  return recipes.find((r) => r.tool === tool && r.name.trim().toLowerCase() === n) as
    | SavedRecipe<S>
    | undefined;
}

interface SaveInput<S> {
  id?: string;
  tool: Tool;
  name: string;
  notes?: string;
  schema: number;
  state: S;
}

/** Insert or update (by id). Returns the stored record. */
export function saveRecipe<S>(input: SaveInput<S>): SavedRecipe<S> {
  const now = new Date().toISOString();
  const existing = input.id ? recipes.find((r) => r.id === input.id) : undefined;
  const rec: SavedRecipe<S> = {
    id: existing?.id ?? input.id ?? uid(),
    tool: input.tool,
    name: input.name.trim(),
    notes: input.notes ?? existing?.notes ?? "",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    schema: input.schema,
    state: input.state,
  };
  commit(existing ? recipes.map((r) => (r.id === rec.id ? rec : r)) : recipes.concat(rec));
  void persistStorage();
  return rec;
}

export function deleteRecipe(id: string) {
  commit(recipes.filter((r) => r.id !== id));
}

/** Bulk insert (import / migration). Existing ids are replaced. */
export function importRecipes(list: SavedRecipe[]) {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  for (const r of list) byId.set(r.id, r);
  commit([...byId.values()]);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useRecipes<S>(tool: Tool): SavedRecipe<S>[] {
  const all = useSyncExternalStore(subscribe, getRecipes, getRecipes);
  return all.filter((r) => r.tool === tool) as SavedRecipe<S>[];
}

/** JSON backup of everything, for the share sheet / import. */
export function exportAllRecipes(): string {
  return JSON.stringify({ format: "sebs-kitchen-recipes", version: 1, recipes }, null, 2);
}

export function importRecipesJSON(text: string): number {
  const parsed = z
    .object({ format: z.literal("sebs-kitchen-recipes"), recipes: LenientList })
    .safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error("Not a recipes backup file.");
  importRecipes(parsed.data.recipes);
  return parsed.data.recipes.length;
}
