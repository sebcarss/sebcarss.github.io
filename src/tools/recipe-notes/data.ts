import { z } from "zod";
import raw from "./notes.json";

// Recipe Notes: brief notes on dishes cooked at home (what went in, how it was
// cooked), not full recipes. One entry per dish in notes.json; add them with
// `npm run add-note`.

/** Lowercase kebab-case, e.g. "Slow Cooker" → "slow-cooker". */
export const TAG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const NoteSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(1),
  added: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tags: z.array(z.string().regex(TAG_RE)).min(1),
  about: z.string().trim().min(1).optional(),
  ingredients: z.array(z.string().trim().min(1)).min(1),
  method: z.array(z.string().trim().min(1)).min(1),
});

export type Note = z.infer<typeof NoteSchema>;

// Lenient like the cookbooks: a bad entry is skipped with a warning, and
// data.test.ts fails CI on it before deploy.
export function parseNotes(list: unknown): Note[] {
  if (!Array.isArray(list)) return [];
  return list.flatMap((item, i) => {
    const r = NoteSchema.safeParse(item);
    if (r.success) return [r.data];
    console.warn(`recipe-notes: skipping invalid entry #${i}`, r.error.issues[0]);
    return [];
  });
}

/** Every tag with how many notes use it, most used first then A–Z. */
export function allTags(notes: readonly Note[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const n of notes) for (const t of new Set(n.tags)) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export const NOTES: Note[] = parseNotes(raw);
