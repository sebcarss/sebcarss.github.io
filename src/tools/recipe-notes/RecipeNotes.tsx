import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ToolPage } from "@/components/ToolPage";
import { Panel } from "@/components/Panel";
import { NOTES, allTags } from "./data";
import { searchNotes } from "./engine";

export const NOTES_PATH = "/food/recipe-notes";

const TAGS = allTags(NOTES);

export function RecipeNotes() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  // Only tags that exist, so a stale link can't hide everything.
  const selected = params.getAll("tag").filter((t) => TAGS.some((x) => x.tag === t));

  const results = useMemo(() => searchNotes({ text: q, tags: selected }, NOTES), [q, selected.join(",")]);

  // Typing replaces the history entry rather than adding one per keystroke.
  const setQ = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set("q", value);
    else next.delete("q");
    setParams(next, { replace: true });
  };
  const toggleTag = (tag: string) => {
    const next = new URLSearchParams(params);
    next.delete("tag");
    (selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag]).forEach((t) => next.append("tag", t));
    setParams(next, { replace: true });
  };
  const clear = () => setParams(new URLSearchParams(), { replace: true });

  return (
    <ToolPage
      emoji="📝"
      title="Recipe Notes"
      blurb="Short notes on things I've cooked at home: what went in and how it was done. Search, or tap a tag."
    >
      <Panel title="Find a dish">
        <div className="params">
          <label className="wide">
            Search notes
            <input
              type="search"
              aria-label="Search notes"
              placeholder="e.g. squash, curry, roast"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
        </div>
        <div className="chips" role="group" aria-label="Tags">
          {TAGS.map(({ tag, count }) => (
            <button key={tag} type="button" className="chip" aria-pressed={selected.includes(tag)} onClick={() => toggleTag(tag)}>
              {tag} <span className="count">{count}</span>
            </button>
          ))}
        </div>
        <p className="note">
          {NOTES.length} {NOTES.length === 1 ? "note" : "notes"}.
          {(q || selected.length > 0) && (
            <>
              {" "}
              <button type="button" className="linklike" onClick={clear}>
                Clear search
              </button>
            </>
          )}
        </p>
      </Panel>

      {results.length === 0 ? (
        <Panel>
          <p className="note">{NOTES.length ? "Nothing matches. Try fewer words or clear the tags." : "No notes yet."}</p>
        </Panel>
      ) : (
        <Panel title={`${results.length} ${results.length === 1 ? "dish" : "dishes"}`}>
          <ul className="list recipe-notes">
            {results.map(({ note }) => (
              <li key={note.id} className="recipe-note">
                <Link className="row" to={`${NOTES_PATH}/${note.id}`}>
                  <span className="text">
                    <span className="name">{note.title}</span>
                    {note.about && <span className="about">{note.about}</span>}
                    <span className="note">{note.tags.join(" · ")}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </ToolPage>
  );
}
