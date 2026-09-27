import { useEffect, type MouseEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Panel } from "@/components/Panel";
import "@/styles/tools.css";
import { FLAVOURS, type Flavour, type Kind } from "./data";

const KIND_LABEL: Record<Kind, string> = { rub: "Rub", marinade: "Marinade", sauce: "Sauce" };
export const LIBRARY = "/food/flavour-library";

/** A Google search for the recipe: the name without its bracketed aside ("Texas SPG rub (salt, pepper, garlic)"). */
export function recipeSearchUrl(f: Flavour): string {
  const name = f.name.replace(/\s*\([^)]*\)/g, "").trim();
  return `https://www.google.com/search?q=${encodeURIComponent(`${name} recipe`)}`;
}

// One rub, marinade or sauce on its own page: /food/flavour-library/<id>.
export function FlavourDetail() {
  const { id } = useParams();
  const f = FLAVOURS.find((x) => x.id === id);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = `${f ? f.name : "Flavour Library"} · Seb Carss`;
    return () => {
      document.title = "Seb Carss";
    };
  }, [f]);

  // Came from the list: go back to it (keeping the search and scroll).
  // Opened directly: the link just goes to the library.
  const back = (e: MouseEvent) => {
    if (location.key === "default") return;
    e.preventDefault();
    navigate(-1);
  };

  return (
    <main className="wide">
      <Link className="back" to={LIBRARY} onClick={back}>
        ‹ Flavour Library
      </Link>
      {!f ? (
        <Panel>
          <p className="note">That rub, marinade or sauce isn't in the library.</p>
        </Panel>
      ) : (
        <>
          <section className="intro flavour-detail">
            <p className="kicker">
              {KIND_LABEL[f.kind]} · {f.cuisine}
              {f.heat ? <span aria-label={`heat ${f.heat} of 3`}> · {"🌶".repeat(f.heat)}</span> : null}
            </p>
            <h1>{f.name}</h1>
            <p className="lead">{f.about}</p>
            <div className="actions">
              <a className="btn btn-primary" href={recipeSearchUrl(f)} target="_blank" rel="noopener noreferrer">
                Search for a recipe ↗
              </a>
            </div>
          </section>
          <Panel>
            <dl className="facts">
              <dt>Goes with</dt>
              <dd>{f.pairsWith.join(", ")}</dd>
              {f.cooking && (
                <>
                  <dt>Cooking</dt>
                  <dd>{f.cooking.join(", ")}</dd>
                </>
              )}
              <dt>Region</dt>
              <dd>{f.region}</dd>
              <dt>Heat</dt>
              <dd>{["None", "Mild", "Medium", "Hot"][f.heat ?? 0]}</dd>
            </dl>
          </Panel>
        </>
      )}
    </main>
  );
}
