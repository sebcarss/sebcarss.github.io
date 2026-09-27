import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ToolPage } from "@/components/ToolPage";
import { Panel } from "@/components/Panel";
import { Toggle } from "@/components/Toggle";
import { BOOKS, ENTRIES, INDEX_ROWS, type Entry } from "./data";
import { bookIndex, bookRecipes, bookSummaries, search, searchBooks, type BookSummary, type IndexGroup, type Match, type SearchResults } from "./engine";

const BOOK_MATCHES_SHOWN = 5;

// Opening a book is a real navigation (pushes history, drops the query) so
// Back returns to the list or results and a book can be bookmarked.
const bookHref = (book: string) => ({ search: "?book=" + encodeURIComponent(book) });
const plural = (n: number, one: string, many = one + "s") => `${n.toLocaleString()} ${n === 1 ? one : many}`;
/** "105 recipes", "105 recipes · index" or, for a book imported from its index alone, "881 index lines". */
const bookCount = (b: BookSummary) =>
  b.recipes || !b.index ? plural(b.recipes, "recipe") + (b.index ? " · index" : "") : plural(b.index, "index line");

function BookList({ books }: { books: BookSummary[] }) {
  return (
    <ul className="list links">
      {books.map((b) => (
        <li key={b.book}>
          <Link className="row" to={bookHref(b.book)}>
            <span>{b.book}</span>
            <span className="meta">{bookCount(b)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Results({ items, showBook }: { items: (Match | Entry)[]; showBook: boolean }) {
  return (
    <ul className="list results">
      {items.map((m) => (
        <li key={`${m.book}|${m.page}|${m.title}`}>
          <span>
            {m.title}
            {"kind" in m && m.kind === "exact" && <span className="badge">Exact</span>}
            {"via" in m && m.via && m.via !== m.title && <span className="via">Index: {m.via}</span>}
          </span>
          <span className="meta">
            {showBook && (
              <>
                <Link className="book-link" to={bookHref(m.book)}>
                  {m.book}
                </Link>
                {" · "}
              </>
            )}
            p. {m.page}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** A book's index as printed: headings A–Z with their pages, sub-entries indented. */
function IndexList({ groups }: { groups: IndexGroup[] }) {
  return (
    <ul className="list book-index">
      {groups.map((g) => (
        <li key={g.term}>
          <div className="row">
            <span className="term">{g.term}</span>
            <span className="meta">{g.pages.join(", ")}</span>
          </div>
          {g.subs.map((s) => (
            <div className="row sub" key={s.sub}>
              <span>{s.sub}</span>
              <span className="meta">{s.pages.join(", ")}</span>
            </div>
          ))}
        </li>
      ))}
    </ul>
  );
}

/**
 * Recipes named like the query first (partial matches under their own
 * heading), then, separately, the dishes the indexes list under it — ideas
 * when the query is an ingredient.
 */
function RecipeMatches({ results, showBook }: { results: SearchResults; showBook: boolean }) {
  const best = results.recipes.filter((m) => m.kind !== "partial");
  const partial = results.recipes.filter((m) => m.kind === "partial");
  if (!results.recipes.length && !results.index.length) return <p className="note">No recipes match — try fewer words.</p>;
  return (
    <>
      {best.length > 0 ? (
        <Results items={best} showBook={showBook} />
      ) : (
        <p className="note">No recipe is called that{results.index.length ? " — see the ingredient matches below" : ""}.</p>
      )}
      {partial.length > 0 && (
        <>
          <h3>Close matches</h3>
          <Results items={partial} showBook={showBook} />
        </>
      )}
      {results.index.length > 0 && (
        <>
          <h3>By ingredient ({results.index.length})</h3>
          <Results items={results.index} showBook={showBook} />
        </>
      )}
    </>
  );
}

export function Cookbooks() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const book = params.get("book") ?? "";
  const wantIndex = params.get("view") === "index";
  const typing = q.trim() !== "";
  const books = useMemo(() => bookSummaries(BOOKS), []);
  const open = book ? books.find((b) => b.book === book) : undefined;
  // A book with only an index opens on it; with both, the toggle chooses.
  const view = open && open.index > 0 && (wantIndex || open.recipes === 0) ? "index" : "recipes";

  const bookMatches = useMemo(() => (typing && !book ? searchBooks(q, books) : []), [q, book, typing, books]);
  const recipeMatches = useMemo(() => search(typing ? q : "", ENTRIES, { book: book || undefined, index: INDEX_ROWS }), [q, book, typing]);
  const contents = useMemo(() => (open ? bookRecipes(ENTRIES, open.book) : []), [open]);
  const indexGroups = useMemo(() => bookIndex((open && BOOKS.find((b) => b.book === open.book)?.index) || []), [open]);
  const indexed = books.filter((b) => b.index > 0).length;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [book]);

  // Typing replaces the history entry rather than adding one per keystroke.
  const setQuery = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set("q", value);
    else next.delete("q");
    setParams(next, { replace: true });
  };
  const setView = (value: "recipes" | "index") => {
    const next = new URLSearchParams(params);
    if (value === "index") next.set("view", value);
    else next.delete("view");
    setParams(next, { replace: true });
  };

  const searchBox = (
    <div className="params">
      <label className="wide">
        {open ? `Search in ${open.book}` : "Recipe or book"}
        <input
          type="search"
          aria-label={open ? "Search this book" : "Search recipes"}
          placeholder={open ? "e.g. soup" : "e.g. moussaka, pasta bake, Ottolenghi"}
          value={q}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </label>
    </div>
  );

  return (
    <ToolPage
      emoji="📚"
      title="Cookbook Finder"
      blurb="Which of my cookbooks has that recipe? Search by recipe, ingredient or book — the books' indexes and close matches count too — or browse a book's recipes."
    >
      {book ? (
        <Panel>
          <Link className="back" to={{ search: "" }}>
            ‹ All books
          </Link>
          {open ? (
            <>
              <h2>{open.book}</h2>
              <p className="note book-count">{bookCount(open)}</p>
              {searchBox}
              {typing ? (
                <RecipeMatches results={recipeMatches} showBook={false} />
              ) : (
                <>
                  {open.recipes > 0 && indexGroups.length > 0 && (
                    <Toggle
                      label="Show"
                      value={view}
                      onChange={setView}
                      options={[
                        { value: "recipes", label: "Recipes" },
                        { value: "index", label: "Index" },
                      ]}
                    />
                  )}
                  {view === "index" ? <IndexList groups={indexGroups} /> : <Results items={contents} showBook={false} />}
                </>
              )}
            </>
          ) : (
            <>
              <h2>Book not found</h2>
              <p className="note">There's no book called “{book}”. It may have been renamed.</p>
            </>
          )}
        </Panel>
      ) : (
        <>
          <Panel title="Search">
            {searchBox}
            <p className="note">
              {plural(ENTRIES.length, "recipe")} across {plural(books.length, "book")}
              {indexed > 0 && <>, with the index of {plural(indexed, "book")} searched too</>}.
            </p>
          </Panel>

          {typing ? (
            <>
              {bookMatches.length > 0 && (
                <Panel title="Books">
                  <BookList books={bookMatches.slice(0, BOOK_MATCHES_SHOWN)} />
                  {bookMatches.length > BOOK_MATCHES_SHOWN && (
                    <details className="more">
                      <summary>Show all {bookMatches.length} books</summary>
                      <BookList books={bookMatches.slice(BOOK_MATCHES_SHOWN)} />
                    </details>
                  )}
                </Panel>
              )}
              <Panel title="Recipes">
                <RecipeMatches results={recipeMatches} showBook />
              </Panel>
            </>
          ) : (
            <Panel title={`Your books (${books.length})`}>
              {books.length ? <BookList books={books} /> : <p className="note">No books yet — add some with npm run add-recipes.</p>}
            </Panel>
          )}
        </>
      )}
    </ToolPage>
  );
}
