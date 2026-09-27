import type { Bar, Finger, Pattern, TabEvent } from "../schema";

/**
 * Tab as SVG, one bar per box so it wraps on a phone. Fret numbers are
 * coloured by the picking-hand finger (p i m a), with the fingers written
 * under each column and the count under that.
 */

const COL = 24;
const PAD = 10;
const TOP = 26;
const GAP = 13;
const FING = TOP + 5 * GAP + 18;
const COUNT = FING + 15;
const H = COUNT + 6;

const y = (s: number) => TOP + (s - 1) * GAP;

function fingersOf(ev: TabEvent): Finger[] {
  if (ev.kind === "chunk") return [];
  if (ev.kind === "strum") return ev.finger ? [ev.finger] : [];
  const seen: Finger[] = [];
  for (const n of ev.notes) if (!seen.includes(n.finger)) seen.push(n.finger);
  return seen;
}

function countLabel(p: Pattern, col: number) {
  if (p.subdiv === 3) return String(col + 1);
  if (col % p.subdiv === 0) return String(col / p.subdiv + 1);
  return p.subdiv === 2 ? "&" : "·";
}

function BarSvg({ p, bar, n, active }: { p: Pattern; bar: Bar; n: number; active: number | null }) {
  const cols = p.beats * p.subdiv;
  const W = PAD * 2 + cols * COL;
  const x = (at: number) => PAD + (at * p.subdiv + 0.5) * COL;
  const muted = bar.events.some((e) => e.notes.some((q) => q.mute));
  return (
    <svg className="tab-bar" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`Bar ${n}${bar.chord ? `, ${bar.chord}` : ""}`}>
      <text className="tab-chord" x={PAD} y={12}>
        {bar.chord ?? ""}
      </text>
      <text className="tab-barno" x={W - PAD} y={12} textAnchor="end">
        {n}
        {muted ? " · PM" : ""}
      </text>
      {bar.events.map((e, i) =>
        active === i ? <rect key={`h${i}`} className="tab-active" x={x(e.at) - COL / 2 + 1} y={TOP - 9} width={COL - 2} height={COUNT - TOP + 12} rx={4} /> : null,
      )}
      {[1, 2, 3, 4, 5, 6].map((s) => (
        <line key={s} className="tab-line" x1={PAD / 2} x2={W - PAD / 2} y1={y(s)} y2={y(s)} />
      ))}
      <line className="tab-edge" x1={W - 1} x2={W - 1} y1={y(1)} y2={y(6)} />
      {Array.from({ length: p.beats }, (_, b) => (
        <line key={`b${b}`} className="tab-beat" x1={PAD + b * p.subdiv * COL} x2={PAD + b * p.subdiv * COL} y1={y(6) + 4} y2={y(6) + 8} />
      ))}
      {bar.events.map((e, i) => {
        const cx = x(e.at);
        if (e.kind === "chunk")
          return (
            <text key={i} className="tab-chunk" x={cx} y={y(5) + 4} textAnchor="middle">
              ✕
            </text>
          );
        const strum = e.kind === "strum";
        const ss = e.notes.map((q) => q.s);
        return (
          <g key={i}>
            {strum && ss.length > 0 && (
              <line className={`tab-strum f-${e.finger}`} x1={cx - 8} x2={cx - 8} y1={y(Math.min(...ss)) - 4} y2={y(Math.max(...ss)) + 4} />
            )}
            {e.notes.map((q) => (
              <g key={q.s}>
                <rect className="tab-bg" x={cx - 7} y={y(q.s) - 6} width={14} height={12} rx={2} />
                <text className={`tab-fret f-${q.finger}${q.mute ? " mute" : ""}${strum ? " small" : ""}`} x={cx} y={y(q.s) + 4} textAnchor="middle">
                  {q.f}
                </text>
              </g>
            ))}
            {e.accent && (
              <text className="tab-accent" x={cx} y={TOP - 11} textAnchor="middle">
                &gt;
              </text>
            )}
            {e.slur && (
              <text className="tab-slur" x={cx - 9} y={y(Math.min(...ss)) - 7} textAnchor="middle">
                {e.slur}
              </text>
            )}
          </g>
        );
      })}
      {bar.events.map((e, i) => {
        const f = fingersOf(e);
        const arrow = e.kind === "strum" ? (e.dir === "up" ? "↑" : "↓") : "";
        return (
          <text key={`f${i}`} className="tab-fingers" x={x(e.at)} y={FING} textAnchor="middle">
            {e.kind === "chunk" ? (
              <tspan className="f-p">x</tspan>
            ) : (
              f.map((k) => (
                <tspan key={k} className={`f-${k}`}>
                  {k}
                </tspan>
              ))
            )}
            {arrow}
          </text>
        );
      })}
      {Array.from({ length: cols }, (_, c) => (
        <text key={`c${c}`} className={"tab-count" + (c % p.subdiv === 0 ? " on" : "")} x={PAD + (c + 0.5) * COL} y={COUNT} textAnchor="middle">
          {countLabel(p, c)}
        </text>
      ))}
    </svg>
  );
}

export function TabView({ pattern, active }: { pattern: Pattern; active?: { bar: number; idx: number } | null }) {
  const len = pattern.bars.length;
  const activeBar = active ? ((active.bar % len) + len) % len : -1;
  return (
    <div className="tab" aria-label={`Tab: ${pattern.name}`}>
      {pattern.bars.map((b, i) => (
        <BarSvg key={i} p={pattern} bar={b} n={i + 1} active={i === activeBar ? active!.idx : null} />
      ))}
    </div>
  );
}

export function FingerKey() {
  return (
    <p className="finger-key note">
      <span className="f-p">p</span> thumb · <span className="f-i">i</span> index · <span className="f-m">m</span> middle · <span className="f-a">a</span> ring · ↓↑ strum · ✕ chunk · &gt; accent · h hammer-on
    </p>
  );
}
