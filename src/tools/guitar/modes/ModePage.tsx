import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ToolPage } from "@/components/ToolPage";
import { Panel } from "@/components/Panel";
import { Toggle } from "@/components/Toggle";
import { NotFound } from "@/pages/NotFound";
import { FingerKey, LeadKey, TabView } from "../components/TabView";
import { PatternPlayer, type Pos } from "../components/PatternPlayer";
import type { Pattern } from "../schema";
import { ChordBox } from "./ChordBox";
import { MODE_CHORDS, type ModeChord } from "./chords";
import { KIND_LABEL, MODES, RIFF_KINDS, getMode, type Mode, type Riff, type RiffKind } from "./data";
import { FretMap } from "./FretMap";
import { MODE_INTERVALS, characteristic, degreeLabel, noteName, pentatonicDiff } from "./theory";
import "../guitar.css";

type Filter = "all" | RiffKind;
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "bridge", label: "Pentatonic" },
  { value: "lead", label: "Lead" },
  { value: "finger", label: "Fingerpicked" },
  { value: "genre", label: "Genre" },
];

function Vamp({ mode }: { mode: Mode }) {
  const [pos, setPos] = useState<Pos>(null);
  const chords = [...new Set(mode.vampBars.flat())] as ModeChord[];
  return (
    <>
      <div className="chord-row">
        {chords.map((c) => (
          <ChordBox key={c} chord={MODE_CHORDS[c]} />
        ))}
      </div>
      <p>{mode.vampTip}</p>
      <TabView pattern={mode.vamp} active={pos} />
      <PatternPlayer pattern={mode.vamp} start={mode.bpm} target={mode.bpm} onPos={setPos} />
      <div className="why">
        <h3>Why these chords</h3>
        <p>{mode.vampWhy}</p>
      </div>
    </>
  );
}

function RiffView({ riff, vamp, bpm }: { riff: Riff; vamp: Pattern; bpm: number }) {
  const [pos, setPos] = useState<Pos>(null);
  return (
    <article className="exercise" id={riff.id}>
      <h3>
        {riff.title}
        <span className="tag riff-kind">{KIND_LABEL[riff.kind]}</span>
      </h3>
      <p>
        <strong>Listen for:</strong> {riff.listenFor}
      </p>
      <TabView pattern={riff.pattern} active={pos} fingers={riff.kind === "finger"} />
      <PatternPlayer pattern={riff.pattern} backing={vamp} start={Math.round(bpm * 0.7)} target={bpm} onPos={setPos} />
    </article>
  );
}

export function ModePage() {
  const { mode: id } = useParams();
  const mode = getMode(id);
  const [filter, setFilter] = useState<Filter>("all");
  if (!mode) return <NotFound />;

  const chars = characteristic(mode.id);
  const diff = pentatonicDiff(mode.id);
  const names = (ivs: readonly number[]) => ivs.map((iv) => `${noteName(mode.id, iv)} (${degreeLabel(mode.id, iv)})`).join(", ");
  const i = MODES.indexOf(mode);
  const prev = MODES[i - 1];
  const next = MODES[i + 1];
  const riffs = mode.riffs.filter((r) => filter === "all" || r.kind === filter);
  const shown = RIFF_KINDS.filter((k) => riffs.some((r) => r.kind === k));

  return (
    <ToolPage emoji="🎼" title={`A ${mode.name}`} blurb={mode.sound}>
      <nav className="day-nav">
        <Link className="back" to="/guitar/modes/">
          ‹ Mode Library
        </Link>
        <span>
          {prev && <Link to={`/guitar/modes/${prev.id}/`}>‹ {prev.name}</Link>}
          {next && <Link to={`/guitar/modes/${next.id}/`}>{next.name} ›</Link>}
        </span>
      </nav>

      <Panel title="The sound">
        <p>{mode.feel}</p>
        <ul className="mode-formula" aria-label={`Notes of A ${mode.name}`}>
          {MODE_INTERVALS[mode.id].map((iv) => (
            <li key={iv} className={chars.includes(iv) ? "char" : undefined}>
              <strong>{noteName(mode.id, iv)}</strong>
              <span>{degreeLabel(mode.id, iv)}</span>
            </li>
          ))}
        </ul>
        <p className="note">
          Highlighted: the notes that make it {mode.name}. Land on them and hold them; the other notes are shared with scales you already play.
        </p>
      </Panel>

      <Panel title="From the box you know">
        <p>{mode.fromBox}</p>
        <FretMap mode={mode.id} name={mode.name} />
        <p className="note">
          A {diff.base} pentatonic plus {names(diff.added)}
          {diff.dropped.length > 0 ? `, with the 5th (E) lowered to ${noteName(mode.id, 6)}` : ""}.
        </p>
      </Panel>

      <Panel title="Looper vamp">
        <Vamp mode={mode} />
      </Panel>

      <Panel title="Riffs">
        <p>
          Each riff is two bars and loops over the vamp. "Backing chords" plays the vamp under the riff; untick it once your looper is running. Slow the tempo with − until it is easy.
        </p>
        <div className="riff-filter">
          <Toggle label="Riff type" options={FILTERS} value={filter} onChange={setFilter} />
        </div>
        <LeadKey />
        {shown.includes("finger") && <FingerKey />}
        {riffs.map((r) => (
          <RiffView key={r.id} riff={r} vamp={mode.vamp} bpm={mode.bpm} />
        ))}
      </Panel>
    </ToolPage>
  );
}
