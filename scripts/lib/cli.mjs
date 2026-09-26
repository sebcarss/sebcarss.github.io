// Terminal and git plumbing shared by add-recipes.mjs and import-book.mjs.
// Not unit-tested (it shells out); the pure logic is in cookbooks.mjs.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { actionsUrl, validateBook } from "./cookbooks.mjs";

export const root = fileURLToPath(new URL("../..", import.meta.url));
export const BOOKS_DIR = join(root, "src/tools/cookbooks/books");

export const dim = (/** @type {string} */ s) => (process.stdout.isTTY ? `\x1b[2m${s}\x1b[0m` : s);
export const green = (/** @type {string} */ s) => (process.stdout.isTTY ? `\x1b[32m${s}\x1b[0m` : s);
export const yellow = (/** @type {string} */ s) => (process.stdout.isTTY ? `\x1b[33m${s}\x1b[0m` : s);

/**
 * Every valid book file, A–Z by name; invalid ones are skipped with a warning.
 * @returns {{ file: string, slug: string, data: import("./cookbooks.mjs").Book }[]}
 */
export function loadBooks() {
  if (!existsSync(BOOKS_DIR)) return [];
  return readdirSync(BOOKS_DIR)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => {
      const file = join(BOOKS_DIR, f);
      try {
        const data = JSON.parse(readFileSync(file, "utf8"));
        const errors = validateBook(data);
        if (errors.length) {
          console.warn(yellow(`Skipping ${f}: ${errors.join("; ")}`));
          return [];
        }
        return [{ file, slug: f.slice(0, -5), data }];
      } catch (e) {
        console.warn(yellow(`Skipping ${f}: ${/** @type {Error} */ (e).message}`));
        return [];
      }
    })
    .sort((a, b) => a.data.book.localeCompare(b.data.book));
}

export const git = (/** @type {string[]} */ ...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

/** Run a git command, printing the error instead of throwing. */
export function gitStep(/** @type {string} */ label, /** @type {string[]} */ args) {
  try {
    git(...args);
    return true;
  } catch (e) {
    const err = /** @type {any} */ (e);
    console.error(yellow(`\n${label} failed:\n${(err.stderr || err.message).trim()}`));
    return false;
  }
}

/**
 * Refuse to run off master (the site deploys from it), then pull so the push
 * at the end doesn't conflict. Exits the process when it can't continue.
 */
export function startOnMaster() {
  let branch = "";
  try {
    branch = git("rev-parse", "--abbrev-ref", "HEAD");
  } catch {
    console.error("This isn't a git checkout. Run with --no-git to only edit the files.");
    process.exit(1);
  }
  if (branch !== "master") {
    console.error(`You're on "${branch}"; the site deploys from master. Switch branch or run with --no-git.`);
    process.exit(1);
  }
  if (!gitStep("git pull", ["pull", "--rebase", "--autostash", "--quiet"])) console.log(dim("Carrying on offline; you can push later."));
}

/**
 * Commit only `rel` (whatever else is lying around in the tree), pull and
 * push. Exits with an error when a step fails; the file is already saved.
 * @param {string} rel path relative to the repo root
 * @param {string} message
 */
export function commitAndPush(rel, message) {
  const ok =
    gitStep("git add", ["add", "--", rel]) &&
    gitStep("git commit", ["commit", "--quiet", "-m", message, "--", rel]) &&
    gitStep("git pull", ["pull", "--rebase", "--autostash", "--quiet"]) &&
    gitStep("git push", ["push", "--quiet"]);
  if (!ok) {
    console.error(`\nYour changes are saved in ${rel}. Fix the problem above, then run: git push`);
    process.exit(1);
  }
  let url = null;
  try {
    url = actionsUrl(git("remote", "get-url", "origin"));
  } catch {}
  console.log(green(`\nPushed "${message}".`) + ` The site updates in a minute or two${url ? `: ${url}` : "."}`);
}
