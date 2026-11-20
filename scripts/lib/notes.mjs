// Pure logic for add-note.mjs (the Recipe Notes in
// src/tools/recipe-notes/notes.json). Plain Node ESM, no I/O, so
// notes.test.ts can import it. Keep the rules in step with NoteSchema in
// src/tools/recipe-notes/data.ts.

/**
 * @typedef {{ id: string, title: string, added: string, tags: string[], about?: string, ingredients: string[], method: string[] }} Note
 */

const TAG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "Chicken & Squash Saagwala" → "chicken-and-squash-saagwala". */
export function slugify(/** @type {string} */ s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** A tag in the site's form: "Slow Cooker" → "slow-cooker". Empty when nothing usable. */
export const normaliseTag = (/** @type {string} */ s) => slugify(s);

/** "Curry, Slow Cooker; curry" → ["curry", "slow-cooker"] (comma or semicolon separated, de-duplicated). */
export function parseTags(/** @type {string} */ s) {
  return [...new Set(s.split(/[,;]/).map(normaliseTag).filter(Boolean))];
}

/** A free id for `title`: the slug, then slug-2, slug-3… */
export function uniqueId(/** @type {string} */ title, /** @type {string[]} */ existing) {
  const base = slugify(title) || "note";
  let id = base;
  for (let n = 2; existing.includes(id); n++) id = `${base}-${n}`;
  return id;
}

/** Strip a leading bullet or number ("- ", "• ", "1. ") from a pasted line. */
export const cleanLine = (/** @type {string} */ s) => s.trim().replace(/^(?:[-*•]|\d+[.)])\s+/, "").trim();

/** Today as YYYY-MM-DD in local time. */
export function today(/** @type {Date} */ d = new Date()) {
  const p = (/** @type {number} */ n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Problems with a note (empty when it's fine). */
export function validateNote(/** @type {any} */ n) {
  /** @type {string[]} */
  const errors = [];
  if (!n || typeof n !== "object") return ["not an object"];
  if (typeof n.id !== "string" || !/^[a-z0-9-]+$/.test(n.id)) errors.push("id must be lowercase letters, digits and dashes");
  if (typeof n.title !== "string" || !n.title.trim()) errors.push("title is required");
  if (typeof n.added !== "string" || !DATE_RE.test(n.added)) errors.push("added must be YYYY-MM-DD");
  if (!Array.isArray(n.tags) || !n.tags.length) errors.push("at least one tag is required");
  else if (n.tags.some((/** @type {any} */ t) => typeof t !== "string" || !TAG_RE.test(t))) errors.push("tags must be lowercase-kebab-case");
  if (n.about != null && (typeof n.about !== "string" || !n.about.trim())) errors.push("about must be a non-empty string when given");
  for (const k of ["ingredients", "method"]) {
    if (!Array.isArray(n[k]) || !n[k].length) errors.push(`${k}: at least one line is required`);
    else if (n[k].some((/** @type {any} */ x) => typeof x !== "string" || !x.trim())) errors.push(`${k}: lines must be non-empty text`);
  }
  return errors;
}

/**
 * Turn loose input (as typed, or from `--file`) into a Note: trims, cleans
 * bullets, normalises tags, fills `added` and `id`.
 * @param {any} raw
 * @param {string[]} existingIds
 * @returns {Note}
 */
export function buildNote(raw, existingIds, now = new Date()) {
  const tags = Array.isArray(raw.tags) ? [...new Set(raw.tags.map((/** @type {string} */ t) => normaliseTag(String(t))).filter(Boolean))] : parseTags(String(raw.tags ?? ""));
  const lines = (/** @type {any} */ v) => (Array.isArray(v) ? v : String(v ?? "").split("\n")).map((x) => cleanLine(String(x))).filter(Boolean);
  const title = String(raw.title ?? "").trim();
  /** @type {Note} */
  const note = {
    id: raw.id ? String(raw.id) : uniqueId(title, existingIds),
    title,
    added: raw.added ? String(raw.added) : today(now),
    tags,
    ...(raw.about && String(raw.about).trim() ? { about: String(raw.about).trim() } : {}),
    ingredients: lines(raw.ingredients),
    method: lines(raw.method),
  };
  return note;
}

/** Add a note (newest first, as the site shows them). Throws on a duplicate id. */
export function addNote(/** @type {Note[]} */ list, /** @type {Note} */ note) {
  if (list.some((n) => n.id === note.id)) throw new Error(`There's already a note with the id "${note.id}".`);
  return [note, ...list];
}

/** One note per block: tags on one line, every ingredient and step on its own. */
export function serializeNotes(/** @type {Note[]} */ list) {
  const j = JSON.stringify;
  const arr = (/** @type {string[]} */ a) => `[\n${a.map((x) => `      ${j(x)}`).join(",\n")}\n    ]`;
  const blocks = list.map((n) => {
    const fields = [
      `    "id": ${j(n.id)}`,
      `    "title": ${j(n.title)}`,
      `    "added": ${j(n.added)}`,
      `    "tags": [${n.tags.map((t) => j(t)).join(", ")}]`,
      ...(n.about ? [`    "about": ${j(n.about)}`] : []),
      `    "ingredients": ${arr(n.ingredients)}`,
      `    "method": ${arr(n.method)}`,
    ];
    return `  {\n${fields.join(",\n")}\n  }`;
  });
  return `[\n${blocks.join(",\n")}\n]\n`;
}
