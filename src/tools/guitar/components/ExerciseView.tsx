import { useState, type Dispatch } from "react";
import type { Course, Exercise } from "../schema";
import { getPattern } from "../patterns";
import { key, type Action, type Progress } from "../engine/progress";
import { TabView } from "./TabView";
import { PatternPlayer, type Pos } from "./PatternPlayer";
import { ChallengeCard } from "./ChallengeCard";

export function challengeStatus(p: Progress, id: string) {
  const c = p.challenges[id];
  if (!c) return <span className="status todo">Not tried</span>;
  if (c.passed) return <span className="status done">✓ Passed{c.best ? ` at ${c.best.bpm} bpm` : ""}</span>;
  return <span className="status carry">Tried {c.attempts}×, not yet</span>;
}

export function ExerciseView({
  course,
  ex,
  progress,
  dispatch,
  revisit,
}: {
  course: Course;
  ex: Exercise;
  progress: Progress;
  dispatch: Dispatch<Action>;
  revisit?: number;
}) {
  const pattern = getPattern(ex.pattern);
  const [pos, setPos] = useState<Pos>(null);
  const cid = ex.challenge ? key(course, ex.challenge.id) : "";
  return (
    <article className="exercise" id={ex.id}>
      <h3>
        {ex.title}
        {revisit && <span className="tag revisit">Revisit from day {revisit}</span>}
      </h3>
      {ex.how.length > 0 && (
        <ul className="how">
          {ex.how.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      )}
      <TabView pattern={pattern} active={pos} />
      <PatternPlayer
        pattern={pattern}
        start={ex.bpm.start}
        target={ex.bpm.target}
        best={progress.bestBpm[key(course, ex.id)]}
        onBest={(bpm) => dispatch({ type: "bestBpm", id: key(course, ex.id), bpm })}
        onPos={setPos}
      />
      {ex.challenge && (
        <ChallengeCard
          goal={ex.challenge.goal}
          criteria={ex.challenge.criteria}
          checklist={ex.challenge.checklist}
          status={challengeStatus(progress, cid)}
          pattern={pattern}
          latencyMs={progress.latencyMs}
          onLatency={(ms) => dispatch({ type: "latency", ms })}
          onRecord={(result) => dispatch({ type: "attempt", id: cid, result })}
          onPos={setPos}
        />
      )}
    </article>
  );
}
