import { useSyncExternalStore } from "react";
import { readJSON, writeJSON } from "../storage";
import { CustomIngredientListSchema, type Ingredient } from "./schema";
import { BUILTIN_INGREDIENTS } from "./builtins";

const KEY = "sc:ingredients:v1";

let customs: Ingredient[] = readJSON(KEY, CustomIngredientListSchema, []).map((i) => ({
  ...i,
  custom: true,
}));
let all: Ingredient[] = BUILTIN_INGREDIENTS.concat(customs);
const listeners = new Set<() => void>();

function commit(next: Ingredient[]) {
  customs = next;
  all = BUILTIN_INGREDIENTS.concat(customs);
  writeJSON(KEY, customs);
  listeners.forEach((l) => l());
}

export const getCustomIngredients = () => customs;
export const getAllIngredients = () => all;
export const findIngredient = (id: string) => all.find((i) => i.id === id);

/** Slug from a name, unique across builtins + customs. */
export function makeIngredientId(name: string) {
  const base =
    "custom-" +
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  let id = base;
  let n = 2;
  while (all.some((i) => i.id === id)) id = `${base}-${n++}`;
  return id;
}

export function upsertCustomIngredient(ing: Ingredient) {
  const next = customs.some((c) => c.id === ing.id)
    ? customs.map((c) => (c.id === ing.id ? { ...ing, custom: true } : c))
    : customs.concat({ ...ing, custom: true });
  commit(next);
}

export function deleteCustomIngredient(id: string) {
  commit(customs.filter((c) => c.id !== id));
}

/** Used by migration: silently replace the whole custom list. */
export function replaceCustomIngredients(list: Ingredient[]) {
  commit(list.map((i) => ({ ...i, custom: true })));
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useIngredients(): Ingredient[] {
  return useSyncExternalStore(subscribe, getAllIngredients, getAllIngredients);
}

export function useCustomIngredients(): Ingredient[] {
  return useSyncExternalStore(subscribe, getCustomIngredients, getCustomIngredients);
}
