import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ToolPage } from "@/components/ToolPage";
import { NotFound } from "@/pages/NotFound";
import type { Block, Course, Test } from "../schema";
import { getCourse } from "../registry";
import { getPattern } from "../patterns";
import { carryOver, challengesOf, dayKey, key, type Action, type Progress } from "../engine/progress";
import { useProgress } from "../useProgress";
import { BlockTimer } from "../components/BlockTimer";
import { ExerciseView } from "../components/ExerciseView";
import { ChallengeCard } from "../components/ChallengeCard";
import { FingerKey, TabView } from "../components/TabView";
import type { Pos } from "../components/PatternPlayer";
import "../guitar.css";

const KIND: Record<Block["kind"], string> = { warmup: "Warm-up", technique: "Technique", pattern: "Pattern", challenge: "Challenge", review: "Review" };

function TestView({ course, test, phase, progress, dispatch }: { course: Course; test: Test; phase: "baseline" | "exit"; progress: Progress; dispatch: (a: Action) => void }) {
  const pattern = getPattern(test.pattern);
  const [pos, setPos] = useState<Pos>(null);
  const r = progress.tests[phase][key(course, test.id)];
  const baseline = phase === "baseline";
  return (
    <article className="exercise test" id={`test-${test.id}`}>
      <h3>
        {baseline ? "Baseline" : "Exit test"}: {test.title}
      </h3>
      <p className="note">{test.what}</p>
      {baseline && <p className="note">Choose a tempo where you can play at least some of it. Failing is expected, because this is your starting point.</p>}
      <TabView pattern={pattern} active={pos} />
      <ChallengeCard
        label={baseline ? "Baseline" : "Exit test"}
        goal={baseline ? `Play what you can of: ${test.title.toLowerCase()}` : test.what}
        criteria={baseline ? { ...test.criteria, bpm: Math.max(40, test.criteria.bpm - 30) } : test.criteria}
        checklist={test.checklist}
        status={r ? <span className={`status ${r.pass ? "done" : "carry"}`}>{r.pass ? "✓ Passed" : "Recorded"} at {r.bpm} bpm</span> : <span className="status todo">Not taken</span>}
        pattern={pattern}
        latencyMs={progress.latencyMs}
        onLatency={(ms) => dispatch({ type: "latency", ms })}
        onRecord={(result) => dispatch({ type: "test", phase, id: key(course, test.id), result })}
        bpmAdjustable={baseline}
        onPos={setPos}
      />
    </article>
  );
}

export function Day() {
  const { course: cid, n: ns } = useParams();
  const course = getCourse(cid);
  const n = Number(ns);
  const day = course?.days.find((d) => d.n === n);
  const [progress, dispatch] = useProgress();
  const onBlockDone = useCallback((id: string) => dispatch({ type: "block", day: dayKey(cid ?? "", n), block: id, done: true }), [dispatch, cid, n]);
  const onJump = useCallback((id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), []);
  if (!course || !day) return <NotFound />;

  const dk = dayKey(course.id, n);
  const dp = progress.days[dk];
  const done = new Set(dp?.blocksDone ?? []);
  const revisit = carryOver(course, progress, n);
  const last = course.days.length;
  const isLast = n === last;
  const chs = challengesOf(course, n);
  const passedToday = chs.filter((e) => progress.challenges[key(course, e.challenge!.id)]?.passed).length;

  return (
    <ToolPage emoji={course.emoji} title={`Day ${n}: ${day.title}`} blurb={day.focus}>
      <nav className="day-nav">
        <Link className="back" to={`/guitar/${course.id}/`}>
          ‹ {course.title} plan
        </Link>
        <span>
          {n > 1 && <Link to={`/guitar/${course.id}/day/${n - 1}/`}>‹ Day {n - 1}</Link>}
          {n < last && <Link to={`/guitar/${course.id}/day/${n + 1}/`}>Day {n + 1} ›</Link>}
        </span>
      </nav>
      <p className="outcome">
        <strong>By the end of today:</strong> {day.outcome}
      </p>

      <BlockTimer blocks={day.blocks} onBlockDone={onBlockDone} onJump={onJump} />
      <FingerKey />

      {day.blocks.map((b) => (
        <section key={b.id} id={b.id} className={`panel block kind-${b.kind}`}>
          <header className="block-head">
            <span className="tag">
              {KIND[b.kind]} · {b.minutes} min
            </span>
            <h2>{b.title}</h2>
            <label className="block-done">
              <input type="checkbox" checked={done.has(b.id)} onChange={(e) => dispatch({ type: "block", day: dk, block: b.id, done: e.target.checked })} /> Done
            </label>
          </header>

          {b.why.length > 0 && (
            <div className="why">
              <h3>Why it works</h3>
              {b.why.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          )}
          {b.steps.length > 0 && (
            <ol className="steps">
              {b.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          )}

          {b.kind === "warmup" &&
            revisit.map(({ day: d, exercise }) => <ExerciseView key={`r-${exercise.id}`} course={course} ex={exercise} progress={progress} dispatch={dispatch} revisit={d} />)}

          {b.tests.map((tid) => {
            const t = course.tests.find((x) => x.id === tid)!;
            return <TestView key={tid} course={course} test={t} phase={n === 1 ? "baseline" : "exit"} progress={progress} dispatch={dispatch} />;
          })}

          {b.exercises.map((ex) => (
            <ExerciseView key={ex.id} course={course} ex={ex} progress={progress} dispatch={dispatch} />
          ))}

          {b.pitfalls.length > 0 && (
            <details className="pitfalls">
              <summary>Where it goes wrong ({b.pitfalls.length})</summary>
              <table className="rows">
                <thead>
                  <tr>
                    <th>You notice</th>
                    <th>Because</th>
                    <th>Fix</th>
                  </tr>
                </thead>
                <tbody>
                  {b.pitfalls.map((p) => (
                    <tr key={p.symptom}>
                      <td>{p.symptom}</td>
                      <td>{p.cause}</td>
                      <td>{p.fix}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}

          {b.kind === "review" && (
            <>
              <ul className="prompts">
                {b.prompts.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <label className="notes-label">
                Notes for tomorrow
                <textarea value={progress.notes[dk] ?? ""} onChange={(e) => dispatch({ type: "note", day: dk, text: e.target.value })} placeholder="What went wrong, your best tempos, what to loop tomorrow…" />
              </label>
              <p className="note">
                Challenges passed today: {passedToday} of {chs.length}.{" "}
                {passedToday < chs.length && "Anything not passed moves to the top of the next day's warm-up. That's normal, so keep going."}
              </p>
              <div className="actions">
                {dp?.completedAt ? (
                  <>
                    <span className="status done">✓ Day finished</span>
                    <button type="button" className="btn" onClick={() => dispatch({ type: "reopenDay", day: dk })}>
                      Reopen
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn btn-primary" onClick={() => dispatch({ type: "completeDay", day: dk, at: new Date().toISOString() })}>
                    Finish day {n}
                  </button>
                )}
                {!isLast && (
                  <Link className="btn" to={`/guitar/${course.id}/day/${n + 1}/`}>
                    Day {n + 1} ›
                  </Link>
                )}
                {isLast && (
                  <Link className="btn" to={`/guitar/${course.id}/`}>
                    See your results ›
                  </Link>
                )}
              </div>
            </>
          )}
        </section>
      ))}
    </ToolPage>
  );
}
