import { Link } from "react-router-dom";
import { ToolPage } from "@/components/ToolPage";
import { MODES } from "./data";
import { formula } from "./theory";
import "../guitar.css";

export function ModeList() {
  return (
    <ToolPage
      emoji="🎼"
      title="Mode Library"
      blurb="Every mode from the same root, A, so you can hear what changes. Each has chords to record on a looper and riffs that lean on the notes that make its sound."
    >
      <p className="back-row">
        <Link className="back" to="/guitar/">
          ‹ Guitar School
        </Link>
      </p>
      <p className="outcome">
        A mode only sounds like itself against a backing that holds the root. Record the vamp first, then play the riffs over it. They are in a suggested order: the first two are one or two notes away from the blues box you already play.
      </p>
      <div className="cards">
        {MODES.map((m, i) => (
          <Link key={m.id} className="card" to={`/guitar/modes/${m.id}/`}>
            <h3>
              <span className="day-n">{i + 1}</span> A {m.name}
            </h3>
            <p>{m.sound}</p>
            <p className="mode-degrees">{formula(m.id)}</p>
          </Link>
        ))}
      </div>
    </ToolPage>
  );
}
