import { getAllIngredients, makeIngredientId, type Tool } from "@/lib/ingredients";

/** Case-insensitive lookup in a legacy-name map. */
export function resolveLegacyName(map: Record<string, string>, name: string) {
  return map[name.trim().toLowerCase()];
}

/**
 * Shared helper for the per-tool migrators: maps old free-text ingredient
 * names to ids, remembering any custom ingredient created along the way so
 * two tools referencing "My flour" end up on one record.
 */
export interface LegacyResolver {
  idFor(tool: Tool, name: string): string | undefined;
  customId(name: string): string;
  exists(id: string): boolean;
  register(name: string, id: string): void;
}

export function makeResolver(extraMaps: Record<string, string>[] = []): LegacyResolver {
  const registered = new Map<string, string>();
  const created = new Set<string>();
  const norm = (s: string) => s.trim().toLowerCase();
  return {
    idFor(tool, name) {
      const n = norm(name);
      const reg = registered.get(n);
      if (reg) return reg;
      for (const m of extraMaps) if (m[n]) return m[n];
      const hit = getAllIngredients().find((i) => i.tools.includes(tool) && norm(i.name) === n);
      return hit?.id;
    },
    customId(name) {
      const id = makeIngredientId(name);
      created.add(id);
      return id;
    },
    exists(id) {
      return created.has(id) ? false : getAllIngredients().some((i) => i.id === id) || [...registered.values()].includes(id);
    },
    register(name, id) {
      registered.set(norm(name), id);
      created.add(id);
    },
  };
}
