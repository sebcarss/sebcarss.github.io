import { Link } from "react-router-dom";
import { ToolPage } from "@/components/ToolPage";
import { COURSES } from "../registry";
import { currentDay, dayStatus } from "../engine/progress";
import { useProgress } from "../useProgress";
import "../guitar.css";

export function Guitar() {
  const [progress] = useProgress();
  return (
    <ToolPage emoji="🎸" title="Guitar School" blurb="Short, structured courses with real challenges, and a timing check that listens to you play. Your progress stays on this device.">
      <div className="cards">
        {COURSES.map((c) => {
          const done = c.days.filter((d) => ["done", "carry"].includes(dayStatus(c, progress, d.n))).length;
          return (
            <Link key={c.id} className="card" to={`/guitar/${c.id}/`}>
              <h3>
                <span aria-hidden="true">{c.emoji}</span> {c.title}
              </h3>
              <p>{c.blurb}</p>
              <p className="note">
                {c.days.length} days × {c.minutesPerDay} min ·{" "}
                {done === 0 ? "Not started" : done === c.days.length ? "Complete" : `On day ${currentDay(c, progress)}`}
              </p>
            </Link>
          );
        })}
      </div>
    </ToolPage>
  );
}
