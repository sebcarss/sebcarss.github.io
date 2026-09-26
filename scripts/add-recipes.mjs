#!/usr/bin/env node
// Interactive entry for the Cookbook Finder: pick a book, type recipes as
// "Title, page", then commit and push so GitHub Pages redeploys.
//
//   npm run add-recipes              # add, then offer to commit + push
//   npm run add-recipes -- --no-git  # just edit the JSON file
//
// The book file is rewritten after every recipe, so Ctrl-C never loses work.
import { createInterface } from "node:readline/promises";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { join, relative } from "node:path";
import { addRecipe, isDuplicate, parseEntryLine, parsePage, removeRecipe, serializeBook, slugForNewBook } from "./lib/cookbooks.mjs";
import { BOOKS_DIR, commitAndPush, dim, green, loadBooks, root, startOnMaster, yellow } from "./lib/cli.mjs";

const useGit = !process.argv.includes("--no-git");

const HELP = `  Type one recipe per line as ${green("Title, page")} (e.g. "Moussaka, 123"), or just the title and you'll be asked for the page.
  Commands: ${green("undo")} (remove the last one), ${green("list")} (show this session), ${green("quit")} (discard this session), ${green("help")}.
  Press Enter on an empty line when you've finished the book.`;

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let saved = null; // { file, count } once something has been written
  rl.on("SIGINT", () => {
    if (saved?.count) console.log(`\n\nSaved ${saved.count} recipe(s) to ${relative(root, saved.file)} — not committed.`);
    else console.log();
    process.exit(130);
  });
  // Read through the line iterator rather than rl.question so pasted or piped
  // lines are buffered, not dropped. End of input counts as a blank line.
  const lines = rl[Symbol.asyncIterator]();
  let eof = false;
  const ask = async (q) => {
    rl.setPrompt(q);
    rl.prompt();
    const { value, done } = await lines.next();
    if (done) eof = true;
    else if (!process.stdin.isTTY) process.stdout.write(value + "\n");
    return done ? "" : value;
  };
  const yes = async (q) => {
    const ans = (await ask(`${q} (Y/n) `)).trim();
    return !eof && !/^n/i.test(ans);
  };

  if (useGit) startOnMaster();

  // 1. Pick a book.
  const books = loadBooks();
  console.log("\n📚 Cookbook Finder — add recipes\n");
  books.forEach((b, i) => console.log(`  ${String(i + 1).padStart(2)}) ${b.data.book} ${dim(`(${b.data.recipes.length} recipes)`)}`));
  let target = null;
  while (!target) {
    const ans = (await ask(books.length ? "\nBook number, or a new book's name: " : "Name of the book: ")).trim();
    if (eof) {
      rl.close();
      return;
    }
    if (!ans) continue;
    const n = Number(ans);
    const existing = Number.isInteger(n) && n >= 1 && n <= books.length ? books[n - 1] : books.find((b) => b.data.book.toLowerCase() === ans.toLowerCase());
    if (existing) target = { ...existing, isNew: false };
    else if (/^\d+$/.test(ans)) console.log(yellow(`There's no book ${ans}.`));
    else if (await yes(`Create a new book "${ans}"?`)) {
      const slug = slugForNewBook(ans, books.map((b) => b.slug));
      target = { file: join(BOOKS_DIR, `${slug}.json`), slug, data: { book: ans, recipes: [] }, isNew: true };
    }
  }
  const original = target.isNew ? null : readFileSync(target.file, "utf8");
  let book = target.data;
  const added = [];
  const save = () => {
    writeFileSync(target.file, serializeBook(book));
    saved = { file: target.file, count: added.length };
  };

  // 2. Enter recipes.
  console.log(`\nAdding to ${green(book.book)} ${dim(relative(root, target.file))}\n${HELP}\n`);
  for (;;) {
    const parsed = parseEntryLine(await ask(`${added.length + 1}. `));
    if (!parsed) break;
    if (parsed.kind === "error") {
      console.log(yellow(`   ${parsed.message}`));
      continue;
    }
    if (parsed.kind === "command") {
      if (parsed.command === "help") console.log(HELP);
      else if (parsed.command === "list") {
        if (!added.length) console.log(dim("   Nothing added yet."));
        added.forEach((r) => console.log(`   ${r.title} — p. ${r.page}`));
      } else if (parsed.command === "undo") {
        const last = added.pop();
        if (!last) console.log(dim("   Nothing to undo."));
        else {
          book = removeRecipe(book, last);
          save();
          console.log(dim(`   Removed ${last.title} (p. ${last.page}).`));
        }
      } else if (parsed.command === "quit") {
        if (!added.length || (await yes(`Discard the ${added.length} recipe(s) added this session?`))) {
          if (original != null) writeFileSync(target.file, original);
          else if (existsSync(target.file)) unlinkSync(target.file);
          console.log("Discarded.");
          rl.close();
          return;
        }
      }
      continue;
    }
    let page = parsed.page;
    while (page == null) {
      const ans = await ask("   Page: ");
      if (!ans.trim()) break; // blank page abandons this recipe
      page = parsePage(ans);
      if (page == null) console.log(yellow("   A page is a whole number, e.g. 123."));
    }
    if (page == null) continue;
    const recipe = { title: parsed.title, page };
    if (isDuplicate(book, recipe) && !(await yes(yellow(`   "${recipe.title}" is already on p. ${page}. Add it again?`)))) continue;
    book = addRecipe(book, recipe);
    added.push(recipe);
    save();
    console.log(dim(`   ✓ ${recipe.title} — p. ${page}`));
  }

  if (!added.length) {
    console.log("Nothing added.");
    rl.close();
    return;
  }
  const rel = relative(root, target.file);
  console.log(`\nAdded ${added.length} recipe(s) to ${book.book} (${book.recipes.length} in total), saved to ${rel}.`);

  // 3. Commit and push.
  if (!useGit || !(await yes(`Commit and push to GitHub?`))) {
    console.log(`Not pushed. When you're ready:\n  git add ${rel} && git commit -m "Cookbooks: ${book.book}" && git push`);
    rl.close();
    return;
  }
  rl.close();
  commitAndPush(rel, `Cookbooks: add ${added.length} recipe${added.length === 1 ? "" : "s"} to ${book.book}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
