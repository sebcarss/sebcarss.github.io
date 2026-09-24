// Pure helpers for scripts/add-recipes.mjs, kept separate so they can be
// tested (cookbooks.test.ts). The file format matches BookSchema in
// src/tools/cookbooks/data.ts.

/** @typedef {{ title: string, page: number }} Recipe */
/** @typedef {{ book: string, recipes: Recipe[] }} Book */
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

/**
 * Pretty JSON with one recipe per line, so diffs read as one line per recipe.
 * @param {Book} book
 */
export function serializeBook(book) {
  const rows = sortRecipes(book.recipes).map((r) => `    { "title": ${JSON.stringify(r.title)}, "page": ${r.page} }`);
  const recipes = rows.length ? `[\n${rows.join(",\n")}\n  ]` : "[]";
  return `{\n  "book": ${JSON.stringify(book.book)},\n  "recipes": ${recipes}\n}\n`;
}

/**
 * Problems with a parsed book file; empty when it's valid.
 * @param {unknown} obj
 * @returns {string[]}
 */
export function validateBook(obj) {
  const o = /** @type {any} */ (obj);
  if (!o || typeof o !== "object") return ["not a JSON object"];
  const errors = [];
  if (typeof o.book !== "string" || !o.book.trim()) errors.push('"book" must be a non-empty string');
  if (!Array.isArray(o.recipes)) return [...errors, '"recipes" must be an array'];
  o.recipes.forEach((/** @type {any} */ r, /** @type {number} */ i) => {
    if (!r || typeof r.title !== "string" || !r.title.trim()) errors.push(`recipe ${i + 1}: missing title`);
    if (!r || !Number.isInteger(r.page) || r.page < 1) errors.push(`recipe ${i + 1}: page must be a whole number ≥ 1`);
  });
  return errors;
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
