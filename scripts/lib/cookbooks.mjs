// Pure helpers for scripts/add-recipes.mjs, kept separate so they can be
// tested (cookbooks.test.ts). The file format matches BookSchema in
// src/tools/cookbooks/data.ts.

/** @typedef {{ title: string, page: number }} Recipe */
/** @typedef {{ term: string, sub?: string, pages?: number[], see?: string }} IndexEntry */
/** @typedef {{ book: string, recipes: Recipe[], index?: IndexEntry[] }} Book */
/**
 * @typedef {{ kind: "command", command: "undo" | "list" | "quit" | "help" }
 *   | { kind: "recipe", title: string, page?: number }
 *   | { kind: "error", message: string }} ParsedLine
 */

const COMMANDS = ["undo", "list", "quit", "help"];

const tidy = (/** @type {string} */ s) => s.replace(/\s+/g, " ").replace(/[\s,;:–—-]+$/, "").trim();

/** Comparison key: case, accents and punctuation ignored. */
export const titleKey = (/** @type {string} */ s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** File name for a book: "Ottolenghi Simple" → "ottolenghi-simple". */
export const slugify = (/** @type {string} */ name) => titleKey(name).replace(/ /g, "-");

/**
 * A page typed on its own: "123", "p123" or "p. 123".
 * @param {string} s
 * @returns {number | null}
 */
export function parsePage(s) {
  const m = s.trim().match(/^(?:p\.?\s*)?(\d+)$/i);
  const n = m ? Number(m[1]) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * One line of input: a command, "Title, 123" / "Title 123" / "Title p. 123",
 * or just a title (the script then asks for the page). The page is always the
 * last number on the line, so "5-Minute Noodles, 42" works.
 * @param {string} line
 * @returns {ParsedLine | null} null for a blank line
 */
export function parseEntryLine(line) {
  const s = line.trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (COMMANDS.includes(lower)) return { kind: "command", command: /** @type {any} */ (lower) };
  const m = s.match(/^(.*?)[\s,;:–—-]+(?:p\.?\s*)?(\d+)$/i);
  if (m && tidy(m[1] ?? "")) {
    const page = Number(m[2]);
    if (page < 1) return { kind: "error", message: "Page numbers start at 1." };
    return { kind: "recipe", title: tidy(m[1] ?? ""), page };
  }
  if (/^(?:p\.?\s*)?\d+$/i.test(s)) return { kind: "error", message: "Type the recipe title before the page number." };
  return { kind: "recipe", title: tidy(s) };
}

/** @param {Recipe[]} recipes */
export const sortRecipes = (recipes) => [...recipes].sort((a, b) => a.page - b.page || a.title.localeCompare(b.title));

/**
 * @param {Book} book
 * @param {Recipe} recipe
 */
export const isDuplicate = (book, recipe) => book.recipes.some((r) => r.page === recipe.page && titleKey(r.title) === titleKey(recipe.title));

/**
 * @param {Book} book
 * @param {Recipe} recipe
 * @returns {Book}
 */
export const addRecipe = (book, recipe) => ({ ...book, recipes: sortRecipes([...book.recipes, { title: recipe.title, page: recipe.page }]) });

/**
 * Remove one recipe (the first exact title + page match), for "undo".
 * @param {Book} book
 * @param {Recipe} recipe
 * @returns {Book}
 */
export function removeRecipe(book, recipe) {
  const i = book.recipes.findIndex((r) => r.title === recipe.title && r.page === recipe.page);
  return i < 0 ? book : { ...book, recipes: book.recipes.filter((_, j) => j !== i) };
}

const indexKey = (/** @type {IndexEntry} */ e) => `${titleKey(e.term)}|${titleKey(e.sub ?? "")}`;
const uniquePages = (/** @type {number[]} */ pages) => [...new Set(pages)].sort((a, b) => a - b);

/** @param {IndexEntry[]} index */
export const sortIndex = (index) =>
  [...index].sort(
    (a, b) => titleKey(a.term).localeCompare(titleKey(b.term)) || titleKey(a.sub ?? "").localeCompare(titleKey(b.sub ?? "")) || a.term.localeCompare(b.term),
  );

/**
 * One index entry as a single line of JSON, keys in a fixed order.
 * @param {IndexEntry} e
 */
function indexLine(e) {
  const parts = [`"term": ${JSON.stringify(e.term)}`];
  if (e.sub) parts.push(`"sub": ${JSON.stringify(e.sub)}`);
  if (e.pages?.length) parts.push(`"pages": [${uniquePages(e.pages).join(", ")}]`);
  if (e.see) parts.push(`"see": ${JSON.stringify(e.see)}`);
  return `    { ${parts.join(", ")} }`;
}

/**
 * Pretty JSON with one recipe (and one index line) per line, so diffs read
 * as one line per entry. "index" is only written when the book has one.
 * @param {Book} book
 */
export function serializeBook(book) {
  const list = (/** @type {string[]} */ rows) => (rows.length ? `[\n${rows.join(",\n")}\n  ]` : "[]");
  const recipes = list(sortRecipes(book.recipes).map((r) => `    { "title": ${JSON.stringify(r.title)}, "page": ${r.page} }`));
  const index = book.index?.length ? `,\n  "index": ${list(sortIndex(book.index).map(indexLine))}` : "";
  return `{\n  "book": ${JSON.stringify(book.book)},\n  "recipes": ${recipes}${index}\n}\n`;
}

const isText = (/** @type {unknown} */ v) => typeof v === "string" && v.trim() !== "";

/**
 * Problems with a parsed book file; empty when it's valid.
 * @param {unknown} obj
 * @returns {string[]}
 */
export function validateBook(obj) {
  const o = /** @type {any} */ (obj);
  if (!o || typeof o !== "object") return ["not a JSON object"];
  const errors = [];
  if (!isText(o.book)) errors.push('"book" must be a non-empty string');
  if (!Array.isArray(o.recipes)) return [...errors, '"recipes" must be an array'];
  o.recipes.forEach((/** @type {any} */ r, /** @type {number} */ i) => {
    if (!r || !isText(r.title)) errors.push(`recipe ${i + 1}: missing title`);
    if (!r || !Number.isInteger(r.page) || r.page < 1) errors.push(`recipe ${i + 1}: page must be a whole number ≥ 1`);
  });
  if (o.index === undefined) return errors;
  if (!Array.isArray(o.index)) return [...errors, '"index" must be an array'];
  o.index.forEach((/** @type {any} */ e, /** @type {number} */ i) => {
    const where = `index entry ${i + 1}${e && isText(e.term) ? ` (${e.term})` : ""}`;
    if (!e || !isText(e.term)) errors.push(`${where}: missing term`);
    if (e?.sub !== undefined && !isText(e.sub)) errors.push(`${where}: "sub" must be a non-empty string`);
    if (e?.see !== undefined && !isText(e.see)) errors.push(`${where}: "see" must be a non-empty string`);
    if (e?.pages !== undefined && (!Array.isArray(e.pages) || !e.pages.every((/** @type {any} */ p) => Number.isInteger(p) && p >= 1)))
      errors.push(`${where}: pages must be whole numbers ≥ 1`);
    if (e && !e.pages?.length && e.see === undefined) errors.push(`${where}: needs pages or "see"`);
  });
  return errors;
}

/**
 * Tidy a book that just passed validateBook: trimmed text, pages sorted and
 * de-duplicated, empty "pages" dropped.
 * @param {Book} book
 * @returns {Book}
 */
export function cleanBook(book) {
  const t = (/** @type {string} */ s) => s.replace(/\s+/g, " ").trim();
  const out = /** @type {Book} */ ({ book: t(book.book), recipes: book.recipes.map((r) => ({ title: t(r.title), page: r.page })) });
  if (book.index?.length)
    out.index = book.index.map((e) => ({
      term: t(e.term),
      ...(e.sub ? { sub: t(e.sub) } : {}),
      ...(e.pages?.length ? { pages: uniquePages(e.pages) } : {}),
      ...(e.see ? { see: t(e.see) } : {}),
    }));
  return out;
}

/**
 * Add an imported book's recipes and index to an existing one. Recipes
 * already there (same title ignoring case/punctuation, same page) and index
 * lines already there (same term + sub) aren't duplicated; an index line's
 * pages are unioned. Importing the same photos twice is a no-op.
 * @param {Book} existing
 * @param {Book} incoming
 * @returns {{ book: Book, recipes: number, index: number }} the merged book and how many recipes / index lines were new or gained pages
 */
export function mergeBook(existing, incoming) {
  let recipes = 0;
  let book = existing;
  for (const r of incoming.recipes) {
    if (isDuplicate(book, r)) continue;
    book = addRecipe(book, r);
    recipes++;
  }
  const index = new Map((existing.index ?? []).map((e) => [indexKey(e), e]));
  let changed = 0;
  for (const e of incoming.index ?? []) {
    const k = indexKey(e);
    const prev = index.get(k);
    if (!prev) {
      index.set(k, e);
      changed++;
      continue;
    }
    const pages = uniquePages([...(prev.pages ?? []), ...(e.pages ?? [])]);
    const see = prev.see ?? e.see;
    if (pages.length === (prev.pages?.length ?? 0) && see === prev.see) continue;
    index.set(k, { term: prev.term, ...(prev.sub ? { sub: prev.sub } : {}), ...(pages.length ? { pages } : {}), ...(see ? { see } : {}) });
    changed++;
  }
  if (index.size) book = { ...book, index: sortIndex([...index.values()]) };
  return { book, recipes, index: changed };
}

/**
 * The headings a "see" points at. Printed indexes write lists ("butter beans,
 * white beans etc", "blue cheese; goat's cheese", "dried fruit and apples")
 * and name a heading by its start ("see smoked haddock" for "smoked haddock,
 * scrambled eggs with"), so try the whole text, then each part, then each
 * "and" half. For each name: an exact heading, else one it begins.
 * @param {string} see
 * @param {string[]} terms every heading in the book's index
 * @returns {string[]} matching headings as written, possibly none
 */
export function resolveSee(see, terms) {
  const keys = new Map();
  for (const t of terms) if (!keys.has(titleKey(t))) keys.set(titleKey(t), t);
  const find = (/** @type {string} */ name) => {
    const k = titleKey(name.replace(/\s*\betc\.?\s*$/i, ""));
    if (!k) return null;
    if (keys.has(k)) return keys.get(k);
    for (const [key, t] of keys) if (key.startsWith(k + " ")) return t;
    return null;
  };
  const whole = find(see);
  if (whole) return [whole];
  const out = [];
  for (const part of see.split(/[;,]/)) {
    const hit = find(part);
    if (hit) out.push(hit);
    else for (const half of part.split(/\s+and\s+/)) {
      const h = find(half);
      if (h) out.push(h);
    }
  }
  return [...new Set(out)];
}

/**
 * Things worth a second look in a book that is valid: likely misreadings,
 * not errors.
 * @param {Book} book
 * @returns {string[]}
 */
export function checkBook(book) {
  const warnings = [];
  const index = book.index ?? [];
  const terms = index.map((e) => e.term);
  const lastRecipe = Math.max(0, ...book.recipes.map((r) => r.page));
  for (const e of index) {
    const name = e.sub ? `${e.term} › ${e.sub}` : e.term;
    if (e.see && !resolveSee(e.see, terms).length) warnings.push(`"${name}" says see "${e.see}", which matches no heading in the index (yet?)`);
    const late = lastRecipe ? (e.pages ?? []).filter((p) => p > lastRecipe + 10) : [];
    if (late.length) warnings.push(`"${name}" p. ${late.join(", ")} is after the last recipe (p. ${lastRecipe}); misread?`);
    if (/\[\?\]/.test(`${name} ${e.see ?? ""}`)) warnings.push(`"${name}" was marked unreadable [?]; check it and fix the file`);
  }
  for (const r of book.recipes) if (/\[\?\]/.test(r.title)) warnings.push(`"${r.title}" (p. ${r.page}) was marked unreadable [?]; check it and fix the file`);
  return warnings;
}

/**
 * The JSON an AI chat returns, as pasted: tolerates a ```json fence and
 * chatter before or after the object.
 * @param {string} text
 * @returns {unknown}
 */
export function parseImport(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("No JSON object found — paste the whole ```json block.");
  return JSON.parse(text.slice(start, end + 1));
}

/**
 * A free file name for a new book.
 * @param {string} name
 * @param {string[]} taken existing slugs (file names without .json)
 */
export function slugForNewBook(name, taken) {
  const base = slugify(name) || "book";
  let slug = base;
  for (let n = 2; taken.includes(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/**
 * GitHub Actions page for a remote URL, or null if it isn't GitHub.
 * @param {string} remote e.g. git@github.com:owner/repo.git
 */
export function actionsUrl(remote) {
  const m = remote.trim().match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?\/?$/);
  return m ? `https://github.com/${m[1]}/${m[2]}/actions` : null;
}
