import { useState, type ReactNode } from "react";
import type { Criteria, Pattern } from "../schema";
import type { Result } from "../engine/progress";
import { ReportView, TimingCheck, type TakeResult } from "./TimingCheck";
import type { Pos } from "./PatternPlayer";

export function criteriaChips(c: Criteria): string[] {
  const out = [`${c.bars} bars at ${c.bpm} bpm`];
  if (c.mode === "free") out.push("click off after the count-in");
  if (c.maxMeanAbsMs != null) out.push(`average within ${c.maxMeanAbsMs} ms`);
  if (c.maxThumbMs != null) out.push(`thumb within ${c.maxThumbMs} ms`);
  if (c.maxChangeMs != null) out.push(`changes within ${c.maxChangeMs} ms`);
  if (c.maxDriftBpm != null) out.push(`drift under ${c.maxDriftBpm} bpm`);
  if (c.maxMissed != null) out.push(c.maxMissed === 0 ? "no missed notes" : `at most ${c.maxMissed} missed`);
  return out;
}

/**
 * A challenge (or benchmark test): pass criteria, a checklist for what the
 * mic can't judge, the timing check, and a self-assessment fallback.
 */
export function ChallengeCard({
  label = "Challenge",
  goal,
  criteria,
  checklist,
  status,
  pattern,
  latencyMs,
  onLatency,
  onRecord,
  bpmAdjustable,
  onPos,
}: {
  label?: string;
  goal: string;
  criteria: Criteria;
  checklist: string[];
  status?: ReactNode;
  pattern: Pattern;
  latencyMs: number | null;
  onLatency: (ms: number | null) => void;
  onRecord: (r: Result) => void;
  bpmAdjustable?: boolean;
  onPos?: (p: Pos) => void;
}) {
  const [ticked, setTicked] = useState<boolean[]>(() => checklist.map(() => false));
  const [take, setTake] = useState<TakeResult | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [selfBpm, setSelfBpm] = useState(criteria.bpm);
  const [flash, setFlash] = useState("");
  const allTicked = ticked.every(Boolean);

  const fromTake = (t: TakeResult, pass: boolean): Result => ({
    at: new Date().toISOString(),
    bpm: t.bpm,
    pass,
    meanAbsMs: Math.round(t.report.meanAbsMs),
    missed: t.report.missed.length,
    driftBpm: t.report.driftBpm == null ? null : Math.round(t.report.driftBpm * 10) / 10,
    thumbMs: Math.round(t.report.thumb.abs),
  });

  const onResult = (t: TakeResult) => {
    setTake(t);
    setConfirmed(false);
    onRecord(fromTake(t, t.pass && allTicked));
    setFlash("");
  };

  const selfRecord = (pass: boolean) => {
    onRecord({ at: new Date().toISOString(), bpm: selfBpm, pass, self: true });
    setFlash(pass ? `Recorded as passed at ${selfBpm} bpm.` : "Recorded. Try again after another run at the pattern.");
  };

  return (
    <div className="challenge">
      <div className="challenge-head">
        <span className="tag">{label}</span>
        {status}
      </div>
      <p className="goal">{goal}</p>
      <ul className="chips">
        {criteriaChips(criteria).map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      {checklist.length > 0 && (
        <fieldset className="checklist">
          <legend className="note">Things the mic can't hear. Tick them only if they're true:</legend>
          {checklist.map((c, i) => (
            <label key={c}>
              <input type="checkbox" checked={ticked[i] ?? false} onChange={() => setTicked((t) => t.map((v, j) => (j === i ? !v : v)))} /> {c}
            </label>
          ))}
        </fieldset>
      )}
      <TimingCheck pattern={pattern} criteria={criteria} latencyMs={latencyMs} onLatency={onLatency} onResult={onResult} bpmAdjustable={bpmAdjustable} onPos={onPos} />
      {take && (
        <>
          <ReportView result={take} criteria={criteria} />
          {take.pass && !allTicked && !confirmed && (
            <p className="note">
              The timing passed. Tick the checklist if it's true, then{" "}
              <button
                type="button"
                className="btn"
                disabled={!allTicked}
                onClick={() => {
                  onRecord(fromTake(take, true));
                  setConfirmed(true);
                }}
              >
                confirm the pass
              </button>
            </p>
          )}
        </>
      )}
      <details className="self">
        <summary>No mic, or want to judge it yourself?</summary>
        <p className="note">
          Record yourself playing along with the click. Pass only if you'd pass on every number above: no stumbles, nothing missed, and no drifting away from the click.
        </p>
        <div className="actions">
          <label className="inline">
            Played at <input type="number" min={30} max={200} value={selfBpm} onChange={(e) => setSelfBpm(Number(e.target.value) || criteria.bpm)} /> bpm
          </label>
          <button type="button" className="btn" disabled={!allTicked || (!bpmAdjustable && selfBpm < criteria.bpm)} onClick={() => selfRecord(true)}>
            Passed
          </button>
          <button type="button" className="btn" onClick={() => selfRecord(false)}>
            Not yet
          </button>
        </div>
      </details>
      {flash && <p className="flash">{flash}</p>}
    </div>
  );
}
