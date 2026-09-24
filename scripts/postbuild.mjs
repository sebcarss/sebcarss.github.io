// GitHub Pages serves static files only, so every SPA route gets its own copy
// of index.html (a real 200 on deep links) and 404.html doubles as the
// fallback for anything else. The music tools are real files under
// public/music and are untouched.
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const dist = new URL("../dist/", import.meta.url).pathname;
const index = join(dist, "index.html");

// Keep in sync with src/routes.tsx.
const routes = ["food", "food/ice-cream-calculator", "food/bakers-percentage", "food/ramen-noodles", "food/cookbooks"];

for (const route of routes) {
  const dir = join(dist, route);
  mkdirSync(dir, { recursive: true });
  const target = join(dir, "index.html");
  if (existsSync(target)) {
    // A legacy static page still lives at this route; leave it alone.
    console.log(`postbuild: keeping existing ${route}/index.html`);
    continue;
  }
  copyFileSync(index, target);
  console.log(`postbuild: wrote ${route}/index.html`);
}
copyFileSync(index, join(dist, "404.html"));
console.log("postbuild: wrote 404.html");
