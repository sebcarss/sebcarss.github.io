import { Link, useParams } from "react-router-dom";
import { ToolPage } from "@/components/ToolPage";
import { Panel } from "@/components/Panel";
import { NotFound } from "@/pages/NotFound";
import { getCourse } from "../registry";
import { currentDay, dayStatus, key, type DayStatus, type Result } from "../engine/progress";
import { useProgress } from "../useProgress";
import "../guitar.css";

const LABEL: Record<DayStatus, string> = { todo: "To do", started: "In progress", done: "✓ Done", carry: "Done, with carry-over" };

function ResultCell({ r }: { r?: Result }) {
  if (!r) return <span className="note">–</span>;
  return (
    <span className={r.pass ? "ok" : "off"}>
      {r.pass ? "✓" : "✗"} {r.bpm} bpm
      {r.meanAbsMs != null && <span className="note"> · ±{r.meanAbsMs} ms</span>}
      {r.missed != null && r.missed > 0 && <span className="note"> · {r.missed} missed</span>}
      {r.driftBpm != null && <span className="note"> · drift {r.driftBpm > 0 ? "+" : ""}{r.driftBpm}</span>}
      {r.self && <span className="note"> (self)</span>}
    </span>
  );
}

export function Course() {
  const { course: id } = useParams();
  const course = getCourse(id);
  const [progress, dispatch] = useProgress();
  if (!course) return <NotFound />;
  const next = currentDay(course, progress);
  const passed = course.tests.filter((t) => progress.tests.exit[key(course, t.id)]?.pass).length;

  return (
    <ToolPage emoji={course.emoji} title={course.title} blurb={course.blurb}>
      <p className="back-row">
        <Link className="back" to="/guitar/">
          ‹ Guitar School
        </Link>
      </p>
      <Panel title="The goal">
        <p>{course.goal}</p>
        <div className="actions">
          <Link className="btn btn-primary" to={`/guitar/${course.id}/day/${next}/`}>
            {Object.keys(progress.days).some((k) => k.startsWith(course.id + ":")) ? `Continue: day ${next}` : "Start day 1"} ›
          </Link>
        </div>
      </Panel>

      <Panel title="The 7-day plan">
        <ol className="days">
          {course.days.map((d) => {
            const st = dayStatus(course, progress, d.n);
            return (
              <li key={d.n} className={d.n === next ? "next" : ""}>
                <Link to={`/guitar/${course.id}/day/${d.n}/`}>
                  <span className="day-n">Day {d.n}</span> <strong>{d.title}</strong>
                </Link>
                <span className={`status ${st}`}>{LABEL[st]}</span>
                <p className="note">{d.focus}</p>
                <p className="blocks-line note">{d.blocks.map((b) => `${b.title} ${b.minutes}′`).join(" · ")}</p>
              </li>
            );
          })}
        </ol>
      </Panel>

      <Panel title={`The standard: ${passed} of ${course.tests.length} exit tests passed`}>
        <p className="note" style={{ marginTop: 0 }}>
          The baseline is taken on day 1 and the exit test on day 7. You can retake any test from those days.
        </p>
        <div className="table-wrap">
          <table className="rows bench">
            <thead>
              <tr>
                <th>Test</th>
                <th>Baseline</th>
                <th>Exit</th>
              </tr>
            </thead>
            <tbody>
              {course.tests.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.title}</strong>
                    <div className="note">{t.what}</div>
                  </td>
                  <td>{t.baseline ? <ResultCell r={progress.tests.baseline[key(course, t.id)]} /> : <span className="note">day 7 only</span>}</td>
                  <td>
                    <ResultCell r={progress.tests.exit[key(course, t.id)]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Settings">
        <p className="note" style={{ marginTop: 0 }}>
          Mic calibration: {progress.latencyMs == null ? "not done yet (you'll be asked before your first timing check)" : `${progress.latencyMs} ms round-trip delay`}. Recalibrate from any
          challenge if you change device or headphones.
        </p>
        <div className="actions">
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (window.confirm("Clear all Guitar School progress on this device? Your mic calibration is kept.")) dispatch({ type: "reset" });
            }}
          >
            Reset progress
          </button>
        </div>
      </Panel>
    </ToolPage>
  );
}
