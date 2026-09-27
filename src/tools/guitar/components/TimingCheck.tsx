import { useEffect, useRef, useState } from "react";
import type { Criteria, Pattern } from "../schema";
import { expectedOnsets } from "../engine/rhythm";
import { analyseTiming, diagnose, judge, type Check, type TimingReport } from "../engine/timing";
import { detectOnsets, estimateLatency } from "../engine/onset";
import { audio, audioSupported } from "../audio/synth";
import { Transport, claim, release } from "../audio/transport";
import { Mic, micSupported } from "../audio/mic";
import type { Pos } from "./PatternPlayer";

export interface TakeResult {
  bpm: number;
  report: TimingReport;
  pass: boolean;
  checks: Check[];
}

type Phase = "idle" | "calibrating" | "playing" | "analysing" | "error";

const CAL: Pattern = { id: "calibration", name: "Calibration", beats: 4, subdiv: 1, bars: [{ events: [] }] };
const CAL_BPM = 80;

/**
 * Listen to a take through the mic and compare it with the tab. Calibrates
 * the device's audio delay once (8 muted plucks on the click), then runs a
 * count-in and the take, and hands the analysed result back.
 */
export function TimingCheck({
  pattern,
  criteria,
  latencyMs,
  onLatency,
  onResult,
  bpmAdjustable,
  onPos,
}: {
  pattern: Pattern;
  criteria: Criteria;
  latencyMs: number | null;
  onLatency: (ms: number | null) => void;
  onResult: (r: TakeResult) => void;
  bpmAdjustable?: boolean;
  onPos?: (p: Pos) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [msg, setMsg] = useState("");
  const [bar, setBar] = useState<number | null>(null);
  const [bpm, setBpm] = useState(criteria.bpm);
  const run = useRef<{ tr: Transport; mic: Mic } | null>(null);
  const abortRef = useRef<() => void>(() => {});

  const abort = () => {
    run.current?.tr.stop();
    run.current?.mic.stop();
    run.current?.mic.close();
    run.current = null;
    release(abortRef.current);
    setPhase("idle");
    setBar(null);
    onPos?.(null);
  };
  abortRef.current = abort;
  useEffect(() => () => abortRef.current(), []);

  const supported = audioSupported() && micSupported();

  async function openMic() {
    const c = audio();
    try {
      return { c, mic: await Mic.open(c) };
    } catch (e) {
      setPhase("error");
      setMsg(
        (e as Error).name === "NotAllowedError"
          ? "Microphone access was blocked. Allow it for this site in your browser settings, or self-assess below."
          : `Couldn't open the microphone (${(e as Error).message}). You can self-assess below.`,
      );
      return null;
    }
  }

  async function calibrate() {
    claim(abortRef.current);
    const opened = await openMic();
    if (!opened) return;
    const { c, mic } = opened;
    setPhase("calibrating");
    setMsg("");
    mic.start();
    const tr = new Transport(c, {
      pattern: CAL,
      bpmForBar: () => CAL_BPM,
      bars: 2,
      countIn: 1,
      click: "on",
      sound: false,
      onBar: (b) => setBar(b),
      onEnd: () =>
        window.setTimeout(() => {
          const rec = mic.stop();
          mic.close();
          run.current = null;
          release(abortRef.current);
          setBar(null);
          const onsets = detectOnsets(rec.samples, rec.sampleRate).map((t) => t + rec.startTime);
          const clicks = Array.from({ length: 8 }, (_, i) => tr.t0 + (i * 60) / CAL_BPM);
          const lat = estimateLatency(onsets, clicks);
          if (lat == null) {
            setPhase("error");
            setMsg("I couldn't hear 8 plucks in time with the clicks. Move the device closer, pluck a bit harder, and try again.");
          } else {
            onLatency(Math.round(lat * 1000));
            setPhase("idle");
            setMsg(`Calibrated: your device's round-trip delay is ${Math.round(lat * 1000)} ms. That's now subtracted from every take.`);
          }
        }, 400),
    });
    run.current = { tr, mic };
  }

  async function take() {
    claim(abortRef.current);
    const opened = await openMic();
    if (!opened) return;
    const { c, mic } = opened;
    setPhase("playing");
    setMsg("");
    mic.start();
    const b = bpm;
    const tr = new Transport(c, {
      pattern,
      bpmForBar: () => b,
      bars: criteria.bars,
      countIn: pattern.beats < 3 ? 2 : 1,
      click: criteria.mode === "free" ? "countin" : "on",
      sound: false,
      onBar: (x) => setBar(x),
      onEvent: (x, idx) => onPos?.({ bar: x, idx }),
      onEnd: () =>
        window.setTimeout(() => {
          const rec = mic.stop();
          mic.close();
          run.current = null;
          release(abortRef.current);
          setBar(null);
          onPos?.(null);
          setPhase("analysing");
          // Let the "Analysing" state paint before the (short) number crunch.
          window.setTimeout(() => {
            const lat = (latencyMs ?? 0) / 1000;
            const onsets = detectOnsets(rec.samples, rec.sampleRate).map((t) => t + rec.startTime - lat);
            const expected = expectedOnsets(pattern, b, criteria.bars, tr.t0);
            const report = analyseTiming(onsets, expected, { bpm: b, mode: criteria.mode });
            const v = judge(report, { ...criteria, bpm: b });
            setPhase("idle");
            onResult({ bpm: b, report, pass: v.pass && (bpmAdjustable || b >= criteria.bpm), checks: v.checks });
          }, 30);
        }, 600),
    });
    run.current = { tr, mic };
  }

  if (!supported) return <p className="note">This browser can't record audio, so use the self-assessment below.</p>;

  const busy = phase === "calibrating" || phase === "playing" || phase === "analysing";
  return (
    <div className="check">
      {latencyMs == null ? (
        <>
          <p className="note">
            First, calibrate: mute the strings with your fretting hand, then pluck once on each of the 8 clicks after the count-in.
          </p>
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={() => void calibrate()} disabled={busy}>
              🎙 Calibrate
            </button>
          </div>
        </>
      ) : (
        <div className="actions">
          {bpmAdjustable && (
            <label className="inline">
              Tempo{" "}
              <input type="number" min={30} max={200} value={bpm} disabled={busy} onChange={(e) => setBpm(Math.max(30, Math.min(200, Number(e.target.value) || criteria.bpm)))} /> bpm
            </label>
          )}
          <button type="button" className="btn btn-primary" onClick={() => void take()} disabled={busy}>
            🎙 Check my timing{bpmAdjustable ? "" : ` at ${bpm} bpm`}
          </button>
          <button type="button" className="btn" onClick={() => void calibrate()} disabled={busy}>
            Recalibrate
          </button>
        </div>
      )}
      {busy && (
        <div className="check-live" aria-live="polite">
          {phase === "analysing" ? (
            "Analysing…"
          ) : (
            <>
              <strong>{bar == null ? "Get ready…" : bar < 0 ? "Count-in…" : `Bar ${bar + 1} of ${phase === "calibrating" ? 2 : criteria.bars}`}</strong>
              {phase === "playing" && criteria.mode === "free" && bar != null && bar >= 0 && <span className="note"> The click is off, so keep the time yourself.</span>}
              {phase === "calibrating" && <span className="note"> Pluck a muted string on every click.</span>}
              <button type="button" className="btn" onClick={abort}>
                Stop
              </button>
            </>
          )}
        </div>
      )}
      {msg && <p className={phase === "error" ? "warn" : "note"}>{msg}</p>}
    </div>
  );
}

export function ReportView({ result, criteria }: { result: TakeResult; criteria: Criteria }) {
  const r = result.report;
  const notes = diagnose(r);
  const fmt = (x: number) => `${x > 0 ? "+" : ""}${Math.round(x)}`;
  return (
    <div className={"report " + (result.pass ? "pass" : "fail")}>
      <p className="report-head">
        {result.pass ? "✓ Passed" : "Not yet"} <span className="note">at {result.bpm} bpm</span>
      </p>
      <ul className="checks">
        {result.checks.map((c) => (
          <li key={c.label} className={c.ok ? "ok" : "bad"}>
            {c.ok ? "✓" : "✗"} {c.label}: <strong>{c.value}</strong>
          </li>
        ))}
        {result.bpm < criteria.bpm && <li className="bad">✗ Tempo below the target of {criteria.bpm} bpm</li>}
      </ul>
      <DotPlot r={r} />
      <div className="stats">
        {r.mode === "click" && (
          <span>
            Bias <strong>{fmt(r.meanMs)} ms</strong> {r.meanMs > 5 ? "(late)" : r.meanMs < -5 ? "(early)" : ""}
          </span>
        )}
        <span>
          Thumb <strong>±{Math.round(r.thumb.abs)} ms</strong>
        </span>
        <span>
          Fingers <strong>±{Math.round(r.fingers.abs)} ms</strong>
        </span>
        <span>
          Missed <strong>{r.missed.length}</strong>
        </span>
        <span>
          Extra <strong>{r.extra}</strong>
        </span>
        {r.effectiveBpm != null && (
          <span>
            Your tempo <strong>{r.effectiveBpm.toFixed(1)}</strong>
            {r.driftBpm != null && ` (${fmt(r.driftBpm)} drift)`}
          </span>
        )}
      </div>
      <h4>Where it's going wrong</h4>
      <ul className="diagnosis">
        {notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
      {r.worst.length > 0 && r.worst[0]!.dev != null && Math.abs(r.worst[0]!.dev) > 30 && (
        <p className="note">
          Worst notes:{" "}
          {r.worst
            .filter((m) => Math.abs(m.dev!) > 30)
            .map((m) => `bar ${m.e.bar} beat ${m.e.label} (${m.e.group === "thumb" ? "thumb" : "finger"}) ${fmt(m.dev!)} ms`)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}

/** Every note as a dot: across = time through the take, up/down = early/late. */
function DotPlot({ r }: { r: TimingReport }) {
  const W = 600;
  const H = 120;
  const lim = 100;
  const ms = r.matches;
  if (!ms.length) return null;
  const t0 = ms[0]!.e.t;
  const t1 = ms[ms.length - 1]!.e.t || t0 + 1;
  const x = (t: number) => 8 + ((t - t0) / Math.max(0.001, t1 - t0)) * (W - 16);
  const y = (d: number) => H / 2 + (Math.max(-lim, Math.min(lim, d)) / lim) * (H / 2 - 8);
  return (
    <svg className="dotplot" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Timing of every note: above the line is early, below is late">
      <rect className="band" x={0} y={y(-25)} width={W} height={y(25) - y(-25)} />
      <line className="zero" x1={0} x2={W} y1={H / 2} y2={H / 2} />
      <text className="axis" x={4} y={12}>
        early
      </text>
      <text className="axis" x={4} y={H - 4}>
        late
      </text>
      {ms.map((m, i) =>
        m.dev == null ? (
          m.e.optional ? null : (
            <text key={i} className="miss" x={x(m.e.t)} y={H / 2 + 4} textAnchor="middle">
              ×
            </text>
          )
        ) : (
          <circle key={i} className={m.e.group === "thumb" ? "dot-thumb" : "dot-fingers"} cx={x(m.e.t)} cy={y(m.dev)} r={3} />
        ),
      )}
    </svg>
  );
}
