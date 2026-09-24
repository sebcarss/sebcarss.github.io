import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ToolPage } from "@/components/ToolPage";
import { Panel } from "@/components/Panel";
import { ENTRIES, type Entry } from "./data";
import { bookRecipes, bookSummaries, search, searchBooks, type BookSummary, type Match } from "./engine";

const BOOK_MATCHES_SHOWN = 5;

// Opening a book is a real navigation (pushes history, drops the query) so
// Back returns to the list or results and a book can be bookmarked.
const bookHref = (book: string) => ({ search: "?book=" + encodeURIComponent(book) });
const plural = (n: number, one: string, many = one + "s") => `${n.toLocaleString()} ${n === 1 ? one : many}`;

function BookList({ books }: { books: BookSummary[] }) {
  return (
    <ul className="list links">
      {books.map((b) => (
        <li key={b.book}>
          <Link className="row" to={bookHref(b.book)}>
            <span>{b.book}</span>
            <span className="meta">{plural(b.recipes, "recipe")}</span>
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

/** Ranked recipe matches, with partial ones under their own heading. */
function RecipeMatches({ matches, showBook }: { matches: Match[]; showBook: boolean }) {
  const best = matches.filter((m) => m.kind !== "partial");
  const partial = matches.filter((m) => m.kind === "partial");
  if (!matches.length) return <p className="note">No recipes match — try fewer words.</p>;
  return (
    <>
      {best.length > 0 && <Results items={best} showBook={showBook} />}
      {partial.length > 0 && (
        <>
          <h3>{best.length ? "Also mentions…" : "Close matches"}</h3>
          <Results items={partial} showBook={showBook} />
        </>
      )}
    </>
  );
}

export function Cookbooks() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const book = params.get("book") ?? "";
  const typing = q.trim() !== "";
  const books = useMemo(() => bookSummaries(ENTRIES), []);
  const open = book ? books.find((b) => b.book === book) : undefined;

  const bookMatches = useMemo(() => (typing && !book ? searchBooks(q, books) : []), [q, book, typing, books]);
  const recipeMatches = useMemo(() => (typing ? search(q, ENTRIES, { book: book || undefined }) : []), [q, book, typing]);
  const index = useMemo(() => (open ? bookRecipes(ENTRIES, open.book) : []), [open]);

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
      blurb="Which of my cookbooks has that recipe? Search by recipe or book — close matches count too — or browse a book's recipes."
    >
      {book ? (
        <Panel>
          <Link className="back" to={{ search: "" }}>
            ‹ All books
          </Link>
          {open ? (
            <>
              <h2>{open.book}</h2>
              <p className="note book-count">{plural(open.recipes, "recipe")}</p>
              {searchBox}
              {typing ? <RecipeMatches matches={recipeMatches} showBook={false} /> : <Results items={index} showBook={false} />}
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
              {plural(ENTRIES.length, "recipe")} across {plural(books.length, "book")}.
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
                <RecipeMatches matches={recipeMatches} showBook />
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
