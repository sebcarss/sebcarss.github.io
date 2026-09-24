import type { Entry } from "./data";

export type MatchKind = "exact" | "strong" | "partial";
export interface Match extends Entry {
  score: number;
  kind: MatchKind;
}

// Words that say nothing about the dish; ignored when matching words, so
// "chicken with rice" doesn't hit every "… with …" recipe.
const STOPWORDS = new Set(["a", "an", "and", "the", "of", "with", "in", "on", "for", "style", "my", "to"]);

/** Lowercase, strip accents, `&` → and, punctuation → spaces. */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Light English singular: bakes → bake, dishes → dish, tomatoes → tomato. */
export function singular(w: string): string {
  if (w.length <= 3) return w;
  if (/(ss|us|is)$/.test(w)) return w; // bass, hummus, couscous
  if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
  if (/(ch|sh|x|z|o)es$/.test(w)) return w.slice(0, -2);
  if (w.endsWith("s")) return w.slice(0, -1);
  return w;
}

const words = (s: string) => normalize(s).split(" ").filter(Boolean).map(singular);

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length]!;
}

/** How well one query word matches the best word in a title: 1, 0.9 (prefix), 0.8 (typo) or 0. */
export function wordMatch(q: string, titleWords: string[]): number {
  let best = 0;
  for (const t of titleWords) {
    if (t === q) return 1;
    if (q.length >= 3 && t.startsWith(q)) best = Math.max(best, 0.9);
    else if (q.length >= 5) {
      const allowed = q.length >= 8 ? 2 : 1;
      if (Math.abs(t.length - q.length) <= allowed && levenshtein(q, t) <= allowed) best = Math.max(best, 0.8);
    }
  }
  return best;
}

interface Query {
  phrase: string;
  terms: string[];
}

function prepare(query: string): Query | null {
  const all = words(query);
  if (!all.length) return null;
  const terms = all.filter((w) => !STOPWORDS.has(w));
  return { phrase: all.join(" "), terms: terms.length ? terms : all };
}

/** Score a recipe title or book name against a prepared query; null means no match. */
function scoreText(q: Query, title: string): { score: number; kind: MatchKind } | null {
  const tw = words(title);
  const phrase = tw.join(" ");
  const extra = Math.max(0, tw.length - q.phrase.split(" ").length);
  if (phrase === q.phrase) return { score: 1000, kind: "exact" };
  if (` ${phrase} `.includes(` ${q.phrase} `)) return { score: Math.max(700, 800 - 10 * extra), kind: "strong" };
  const hits = q.terms.map((w) => wordMatch(w, tw));
  const matched = hits.filter((h) => h > 0).length;
  if (!matched) return null;
  const avg = hits.reduce((a, b) => a + b, 0) / q.terms.length;
  if (matched === q.terms.length) return { score: 550 + 100 * avg - Math.min(50, 5 * extra), kind: "strong" };
  return { score: 400 * avg, kind: "partial" };
}

/**
 * Every recipe whose title matches the query, best first: exact titles,
 * then titles containing the phrase or every word, then titles sharing some
 * words ("Chicken Pasta" for "pasta bake").
 */
export function search(query: string, entries: readonly Entry[], opts: { book?: string } = {}): Match[] {
  const q = prepare(query);
  if (!q) return [];
  const out: Match[] = [];
  for (const e of entries) {
    if (opts.book && e.book !== opts.book) continue;
    const s = scoreText(q, e.title);
    if (s) out.push({ ...e, ...s });
  }
  return out.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title) || a.book.localeCompare(b.book) || a.page - b.page);
}

export interface BookSummary {
  book: string;
  recipes: number;
}
export type BookMatch = BookSummary & { score: number; kind: MatchKind };

/** Every book with its recipe count, A–Z. */
export function bookSummaries(entries: readonly Entry[]): BookSummary[] {
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.book, (counts.get(e.book) ?? 0) + 1);
  return [...counts].map(([book, recipes]) => ({ book, recipes })).sort((a, b) => a.book.localeCompare(b.book));
}

/** Books whose name matches the query, best first; same rules as recipe titles. */
export function searchBooks(query: string, books: readonly BookSummary[]): BookMatch[] {
  const q = prepare(query);
  if (!q) return [];
  return books
    .flatMap((b) => {
      const s = scoreText(q, b.book);
      return s ? [{ ...b, ...s }] : [];
    })
    .sort((a, b) => b.score - a.score || a.book.localeCompare(b.book));
}

/** One book's recipes in page order, like its index. */
export const bookRecipes = (entries: readonly Entry[], book: string): Entry[] =>
  entries.filter((e) => e.book === book).sort((a, b) => a.page - b.page || a.title.localeCompare(b.title));

export function stats(entries: readonly Entry[]) {
  return { books: bookSummaries(entries).length, recipes: entries.length };
}
