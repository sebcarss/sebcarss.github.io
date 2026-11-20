import { normalize, singular, wordMatch } from "@/tools/cookbooks/engine";
import type { Note } from "./data";

const words = (s: string) => normalize(s).split(" ").filter(Boolean).map(singular);

// A word in the title counts most; then tags, ingredients, the summary and
// the method.
const WEIGHTS = { title: 5, tags: 3, ingredients: 2, about: 1, method: 1 } as const;

export interface NoteHit {
  note: Note;
  score: number;
}

/**
 * Notes that carry every selected tag (AND) and match every word typed.
 * Each word scores its best field; no words lists everything, newest first.
 */
export function searchNotes({ text, tags }: { text: string; tags: readonly string[] }, notes: readonly Note[]): NoteHit[] {
  const terms = words(text);
  const hits: NoteHit[] = [];
  for (const note of notes) {
    if (!tags.every((t) => note.tags.includes(t))) continue;
    let score = 0;
    if (terms.length) {
      const fields = {
        title: words(note.title),
        tags: note.tags.flatMap((t) => words(t)),
        ingredients: note.ingredients.flatMap(words),
        about: words(note.about ?? ""),
        method: note.method.flatMap(words),
      };
      let all = true;
      for (const term of terms) {
        let best = 0;
        for (const key of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]) {
          best = Math.max(best, WEIGHTS[key] * wordMatch(term, fields[key]));
        }
        if (!best) {
          all = false;
          break;
        }
        score += best;
      }
      if (!all) continue;
    }
    hits.push({ note, score });
  }
  // Best match first; ties (and the no-text case) newest first, then A–Z.
  return hits.sort((a, b) => b.score - a.score || b.note.added.localeCompare(a.note.added) || a.note.title.localeCompare(b.note.title));
}
