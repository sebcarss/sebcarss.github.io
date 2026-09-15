import type { ZodType } from "zod";

/**
 * localStorage wrapper that never throws (private mode, quota, blocked
 * storage) and validates everything it reads with a zod schema, so a corrupt
 * or old-format entry can never crash the app.
 */
const mem = new Map<string, string>();

function ls(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export function readRaw(key: string): string | null {
  try {
    return ls()?.getItem(key) ?? mem.get(key) ?? null;
  } catch {
    return mem.get(key) ?? null;
  }
}

export function writeRaw(key: string, value: string): boolean {
  mem.set(key, value);
  try {
    ls()?.setItem(key, value);
    return true;
  } catch (e) {
    console.warn("storage: write failed for", key, e);
    return false;
  }
}

export function removeRaw(key: string) {
  mem.delete(key);
  try {
    ls()?.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function readJSON<T>(key: string, schema: ZodType<T>, fallback: T): T {
  const raw = readRaw(key);
  if (raw == null) return fallback;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
    console.warn("storage: invalid data under", key, parsed.error.issues.slice(0, 3));
    return fallback;
  } catch (e) {
    console.warn("storage: unreadable JSON under", key, e);
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown) {
  return writeRaw(key, JSON.stringify(value));
}

/** Ask the browser not to evict our data when it's short on space. */
export async function persistStorage() {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch {
    /* ignore */
  }
}
