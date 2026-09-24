import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ToolPage } from "@/components/ToolPage";
import { Panel } from "@/components/Panel";
import { ENTRIES } from "./data";
import { search, stats, type Match } from "./engine";

function Results({ items }: { items: Match[] }) {
  return (
    <ul className="list results">
      {items.map((m) => (
        <li key={`${m.book}|${m.page}|${m.title}`}>
          <span>
            {m.title}
            {m.kind === "exact" && <span className="badge">Exact</span>}
          </span>
          <span className="meta">
            {m.book} · p. {m.page}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Cookbooks() {
  // The search lives in the URL so it can be bookmarked or shared.
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const book = params.get("book") ?? "";
  const info = useMemo(() => stats(ENTRIES), []);
  const results = useMemo(() => search(q, ENTRIES, { book: book || undefined }), [q, book]);
  const best = results.filter((m) => m.kind !== "partial");
  const partial = results.filter((m) => m.kind === "partial");

  const set = (key: "q" | "book", value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <ToolPage
      emoji="📚"
      title="Cookbook Finder"
      blurb="Which of my cookbooks has that recipe? Search by name — close matches count too — and get the book and page."
    >
      <Panel title="Search">
        <div className="params">
          <label className="wide">
            Recipe
            <input type="search" aria-label="Search recipes" placeholder="e.g. moussaka, pasta bake" value={q} onChange={(e) => set("q", e.target.value)} autoFocus />
          </label>
          <label>
            Book
            <select aria-label="Book" value={book} onChange={(e) => set("book", e.target.value)}>
              <option value="">All books</option>
              {info.books.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="note">
          {info.recipes.toLocaleString()} recipes across {info.books.length} {info.books.length === 1 ? "book" : "books"}.
        </p>
      </Panel>

      {q.trim() && (
        <Panel title="Results">
          {results.length === 0 && <p className="note">No recipes match — try fewer words.</p>}
          {best.length > 0 && <Results items={best} />}
          {partial.length > 0 && (
            <>
              <h3>{best.length ? "Also mentions…" : "Close matches"}</h3>
              <Results items={partial} />
            </>
          )}
        </Panel>
      )}
    </ToolPage>
  );
}
