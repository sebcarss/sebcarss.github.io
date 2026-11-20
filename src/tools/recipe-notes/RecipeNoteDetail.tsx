import { useEffect, type MouseEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Panel } from "@/components/Panel";
import "@/styles/tools.css";
import { NOTES } from "./data";
import { NOTES_PATH } from "./RecipeNotes";

const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// One note on its own page: /food/recipe-notes/<id>.
export function RecipeNoteDetail() {
  const { id } = useParams();
  const note = NOTES.find((n) => n.id === id);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = `${note ? note.title : "Recipe Notes"} · Seb Carss`;
    return () => {
      document.title = "Seb Carss";
    };
  }, [note]);

  // Came from the list: go back to it (keeping the search and scroll).
  // Opened directly: the link just goes to the notes.
  const back = (e: MouseEvent) => {
    if (location.key === "default") return;
    e.preventDefault();
    navigate(-1);
  };

  return (
    <main className="wide">
      <Link className="back" to={NOTES_PATH} onClick={back}>
        ‹ Recipe Notes
      </Link>
      {!note ? (
        <Panel>
          <p className="note">There's no note with that name.</p>
        </Panel>
      ) : (
        <>
          <section className="intro flavour-detail">
            <p className="kicker">Cooked {formatDate(note.added)}</p>
            <h1>{note.title}</h1>
            {note.about && <p className="lead">{note.about}</p>}
            <div className="chips" role="group" aria-label="Tags">
              {note.tags.map((t) => (
                <Link key={t} className="chip" to={`${NOTES_PATH}?tag=${encodeURIComponent(t)}`}>
                  {t}
                </Link>
              ))}
            </div>
          </section>
          <Panel title="Ingredients">
            <ul className="note-lines">
              {note.ingredients.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </Panel>
          <Panel title="How I cooked it">
            <ol className="note-lines">
              {note.method.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ol>
          </Panel>
        </>
      )}
    </main>
  );
}
