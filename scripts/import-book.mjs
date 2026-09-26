#!/usr/bin/env node
// Import a book's contents and/or index from the JSON an AI produced from
// photos of the pages (docs/cookbook-import-prompt.md), merge it into the
// book's file, then commit and push so GitHub Pages redeploys.
//
//   npm run import-book                         # paste the JSON
//   npm run import-book -- mamushka-index.json  # or read it from a file
//   npm run import-book -- --no-git             # just edit the JSON file
//
// Importing merges: recipes and index lines already in the file are kept and
// not duplicated, so importing a book a few pages at a time is fine.
import { createInterface } from "node:readline/promises";
import { readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { checkBook, cleanBook, mergeBook, parseImport, serializeBook, slugForNewBook, validateBook } from "./lib/cookbooks.mjs";
import { BOOKS_DIR, commitAndPush, dim, green, loadBooks, root, startOnMaster, yellow } from "./lib/cli.mjs";

const args = process.argv.slice(2);
const useGit = !args.includes("--no-git");
const fileArg = args.find((a) => !a.startsWith("--"));
const interactive = Boolean(process.stdin.isTTY);

/**
 * Pasted lines up to the one that completes the JSON object, END or Ctrl-D.
 * Reads through the shared line iterator: `for await` would close readline
 * when it stops, and the Save / Commit questions come after.
 * @param {AsyncIterator<string>} lines
 */
async function readPasted(lines) {
  console.log(`Paste the JSON from the AI (the whole ${green("```json")} block is fine). It's read as soon as it's complete;`);
  console.log(dim("type END on its own line (or press Ctrl-D) if it doesn't finish by itself.\n"));
  let text = "";
  for (;;) {
    const { value: line, done } = await lines.next();
    if (done || line.trim() === "END") break;
    text += line + "\n";
    // Stop at the line that completes the object: a closing brace or fence.
    if (/^\s*(\}|```)\s*$/.test(line)) {
      try {
        parseImport(text);
        break;
      } catch {}
    }
  }
  return text;
}

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const lines = rl[Symbol.asyncIterator]();
  const yes = async (/** @type {string} */ q) => {
    if (!interactive) return false;
    rl.setPrompt(`${q} (Y/n) `);
    rl.prompt();
    const { value, done } = await lines.next();
    return !done && !/^n/i.test(value.trim());
  };
  const fail = (/** @type {string} */ msg) => {
    console.error(yellow(msg));
    rl.close();
    process.exit(1);
  };

  if (useGit) startOnMaster();

  // 1. Read and check the JSON.
  console.log("\n📚 Cookbook Finder — import a book's contents / index\n");
  let data;
  try {
    data = parseImport(fileArg ? readFileSync(resolve(fileArg), "utf8") : await readPasted(lines));
  } catch (e) {
    return fail(`Couldn't read that as JSON: ${/** @type {Error} */ (e).message}`);
  }
  const errors = validateBook(data);
  if (errors.length) return fail(`That JSON isn't in the right format:\n  ${errors.slice(0, 15).join("\n  ")}${errors.length > 15 ? `\n  …and ${errors.length - 15} more` : ""}`);
  const incoming = cleanBook(/** @type {any} */ (data));

  // 2. Merge it into the book with the same name, or start a new one.
  const books = loadBooks();
  const existing = books.find((b) => b.data.book.trim().toLowerCase() === incoming.book.toLowerCase());
  const target = existing ?? {
    file: join(BOOKS_DIR, `${slugForNewBook(incoming.book, books.map((b) => b.slug))}.json`),
    data: { book: incoming.book, recipes: [] },
  };
  const merged = mergeBook(target.data, incoming);
  const rel = relative(root, target.file);
  const book = merged.book;

  console.log(`${existing ? "Updating" : "New book"} ${green(book.book)} ${dim(rel)}`);
  console.log(`  +${merged.recipes} recipe(s)  → ${book.recipes.length} in total`);
  console.log(`  +${merged.index} index line(s) new or with new pages → ${book.index?.length ?? 0} in total`);
  if (book.index?.length) {
    const sorted = book.index;
    console.log(dim(`  Index runs "${sorted[0]?.term}" … "${sorted[sorted.length - 1]?.term}" — check nothing was skipped.`));
  }
  const warnings = checkBook(book);
  if (warnings.length) console.log(yellow(`\nWorth a check (${warnings.length}):\n  ${warnings.join("\n  ")}`));

  if (!merged.recipes && !merged.index) {
    console.log("\nNothing new to add.");
    rl.close();
    return;
  }
  if (interactive && !(await yes(`\nSave ${rel}?`))) {
    console.log("Not saved.");
    rl.close();
    return;
  }
  writeFileSync(target.file, serializeBook(book));
  console.log(`Saved ${rel}.`);

  // 3. Commit and push.
  const parts = [merged.recipes && `${merged.recipes} recipe${merged.recipes === 1 ? "" : "s"}`, merged.index && `${merged.index} index line${merged.index === 1 ? "" : "s"}`];
  const message = `Cookbooks: import ${parts.filter(Boolean).join(" and ")} to ${book.book}`;
  if (!useGit || !(await yes("Commit and push to GitHub?"))) {
    console.log(`Not pushed. Check it with ${green("npm test")}, then:\n  git add ${rel} && git commit -m "${message}" && git push`);
    rl.close();
    return;
  }
  rl.close();
  commitAndPush(rel, message);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
