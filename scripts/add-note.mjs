#!/usr/bin/env node
// Add a note to Recipe Notes (src/tools/recipe-notes/notes.json), then commit
// and push so GitHub Pages redeploys.
//
//   npm run add-note                          # ask for each field
//   npm run add-note -- --file note.json      # a note (or array of notes) as JSON
//   npm run add-note -- --no-git              # just edit the JSON file
//
// A --file note needs title, tags, ingredients and method (arrays, or text
// with one line each); id and added are filled in.
import { createInterface } from "node:readline/promises";
import { readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { addNote, buildNote, parseTags, serializeNotes, validateNote } from "./lib/notes.mjs";
import { commitAndPush, dim, green, root, startOnMaster, yellow } from "./lib/cli.mjs";

const FILE = join(root, "src/tools/recipe-notes/notes.json");
const args = process.argv.slice(2);
const useGit = !args.includes("--no-git");
const fileArg = args.includes("--file") ? args[args.indexOf("--file") + 1] : null;

const load = () => JSON.parse(readFileSync(FILE, "utf8"));

async function main() {
  if (useGit) startOnMaster();
  let list = load();
  /** @type {any[]} */
  let incoming;

  if (fileArg) {
    const data = JSON.parse(readFileSync(fileArg, "utf8"));
    incoming = Array.isArray(data) ? data : [data];
  } else {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.on("SIGINT", () => {
      console.log("\nCancelled; nothing saved.");
      process.exit(130);
    });
    // Read through the line iterator, never rl.question, so pasted or piped
    // lines are buffered rather than dropped. End of input counts as blank.
    const lines = rl[Symbol.asyncIterator]();
    const ask = async (/** @type {string} */ q) => {
      rl.setPrompt(q);
      rl.prompt();
      const { value, done } = await lines.next();
      if (!done && !process.stdin.isTTY) process.stdout.write(value + "\n");
      return done ? "" : value;
    };
    const many = async (/** @type {string} */ label) => {
      console.log(dim(`${label} (one per line, blank line to finish)`));
      /** @type {string[]} */
      const out = [];
      for (;;) {
        const l = await ask("  > ");
        if (!l.trim()) return out;
        out.push(l);
      }
    };
    console.log("\n📝 Recipe Notes — add a note\n");
    const title = (await ask("Title: ")).trim();
    const tags = parseTags(await ask("Tags (comma separated, e.g. curry, chicken, spinach): "));
    const about = (await ask("One-line summary (optional): ")).trim();
    const ingredients = await many("Ingredients");
    const method = await many("How you cooked it");
    rl.close();
    incoming = [{ title, tags, about, ingredients, method }];
  }

  const added = [];
  for (const raw of incoming) {
    const note = buildNote(raw, list.map((n) => n.id));
    const errors = validateNote(note);
    if (errors.length) {
      console.error(yellow(`Can't add "${note.title || "(untitled)"}": ${errors.join("; ")}`));
      process.exit(1);
    }
    list = addNote(list, note);
    added.push(note);
  }

  writeFileSync(FILE, serializeNotes(list));
  const rel = relative(root, FILE);
  for (const n of added) console.log(green(`✓ ${n.title}`) + dim(` (${n.tags.join(", ")}) → /food/recipe-notes/${n.id}`));
  console.log(`Saved to ${rel}.`);

  if (!useGit) return;
  commitAndPush(rel, `Recipe Notes: add ${added.map((n) => n.title).join(", ")}`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
