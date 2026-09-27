import type { Criteria } from "../schema";
import type { Expected } from "./rhythm";

/**
 * Pure timing analysis: compare detected note onsets (seconds) with the
 * notes a take should have had, and turn the differences into numbers and
 * plain-English diagnoses. In "click" mode deviations are measured against
 * the click; in "free" mode (click off after the count-in) against a tempo
 * fitted to your own playing, so a slow, even drift isn't double-counted.
 */

export interface Match {
  e: Expected;
  onset: number | null;
  /** Deviation in ms; positive = late. */
  dev: number | null;
}

export interface GroupStats {
  n: number;
  mean: number;
  abs: number;
}

export interface TimingReport {
  mode: "click" | "free";
  bpm: number;
  matches: Match[];
  total: number;
  heard: number;
  meanMs: number;
  meanAbsMs: number;
  jitterMs: number;
  thumb: GroupStats;
  fingers: GroupStats;
  onBeat: GroupStats;
  offBeat: GroupStats;
  missed: Match[];
  extra: number;
  changeWorst: { ms: number; bar: number } | null;
  bpmFirst: number | null;
  bpmSecond: number | null;
  driftBpm: number | null;
  effectiveBpm: number | null;
  worst: Match[];
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const sd = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
};

/** Least squares y = a + b·x. */
export function linfit(xs: number[], ys: number[]): { a: number; b: number } | null {
  const n = xs.length;
  if (n < 2) return null;
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sxx += (xs[i]! - mx) ** 2;
  }
  if (sxx === 0) return null;
  const b = sxy / sxx;
  return { a: my - b * mx, b };
}

/** Half the smallest gap between expected notes, between 40 and 150 ms. */
export function matchWindow(expected: Expected[]): number {
  let gap = Infinity;
  for (let i = 1; i < expected.length; i++) {
    const g = expected[i]!.t - expected[i - 1]!.t;
    if (g > 0.001) gap = Math.min(gap, g);
  }
  if (!Number.isFinite(gap)) gap = 0.3;
  return Math.min(0.15, Math.max(0.04, gap / 2));
}

function nearest(onsets: number[], used: boolean[], target: number, w: number): number {
  let best = -1;
  let bestD = w;
  // onsets are sorted; a linear scan is fine for a few hundred notes.
  for (let j = 0; j < onsets.length; j++) {
    if (used[j]) continue;
    const d = Math.abs(onsets[j]! - target);
    if (d <= bestD) {
      bestD = d;
      best = j;
    }
    if (onsets[j]! > target + w) break;
  }
  return best;
}

const stats = (ms: Match[]): GroupStats => {
  const d = ms.map((m) => m.dev!).filter((x) => x != null);
  return { n: d.length, mean: mean(d), abs: mean(d.map(Math.abs)) };
};

export function analyseTiming(rawOnsets: number[], expected: Expected[], opts: { bpm: number; mode: "click" | "free" }): TimingReport {
  const onsets = [...rawOnsets].sort((a, b) => a - b);
  const w = matchWindow(expected);
  const used = onsets.map(() => false);
  const matchIdx: number[] = expected.map(() => -1);

  if (opts.mode === "click") {
    expected.forEach((e, i) => {
      const j = nearest(onsets, used, e.t, w);
      if (j >= 0) {
        used[j] = true;
        matchIdx[i] = j;
      }
    });
  } else {
    // Track the player's own tempo: predict each note from the last few matches.
    const xs: number[] = [];
    const ys: number[] = [];
    let offset = 0;
    expected.forEach((e, i) => {
      let pred = e.t + offset;
      const k = xs.length;
      if (k >= 3) {
        const fit = linfit(xs.slice(-8), ys.slice(-8));
        if (fit) pred = fit.a + fit.b * e.t;
      }
      const j = nearest(onsets, used, pred, k === 0 ? w * 1.5 : w);
      if (j >= 0) {
        used[j] = true;
        matchIdx[i] = j;
        xs.push(e.t);
        ys.push(onsets[j]!);
        if (k < 3) offset = mean(ys.map((y, q) => y - xs[q]!));
      }
    });
  }

  const pairs = expected.map((e, i) => ({ e, onset: matchIdx[i]! >= 0 ? onsets[matchIdx[i]!]! : null }));
  const hit = pairs.filter((p) => p.onset != null) as { e: Expected; onset: number }[];

  // Deviations.
  let devOf: (i: number) => number;
  if (opts.mode === "click") {
    devOf = (i) => (hit[i]!.onset - hit[i]!.e.t) * 1000;
  } else {
    // Residual from a local tempo fit centred on each note (±8 notes).
    devOf = (i) => {
      const lo = Math.max(0, i - 8);
      const hi = Math.min(hit.length, i + 9);
      const seg = hit.slice(lo, hi);
      const fit = linfit(
        seg.map((h) => h.e.t),
        seg.map((h) => h.onset),
      );
      const pred = fit ? fit.a + fit.b * hit[i]!.e.t : hit[i]!.e.t;
      return (hit[i]!.onset - pred) * 1000;
    };
  }
  const devs = new Map<Expected, number>();
  hit.forEach((h, i) => devs.set(h.e, devOf(i)));
  const matches: Match[] = pairs.map((p) => ({ e: p.e, onset: p.onset, dev: devs.get(p.e) ?? null }));

  const got = matches.filter((m) => m.dev != null);
  const d = got.map((m) => m.dev!);

  // Extra onsets: unmatched sounds during the take that aren't the tail of a
  // strum or a double-trigger just after a matched note.
  const first = expected[0]?.t ?? 0;
  const last = expected[expected.length - 1]?.t ?? 0;
  const matchedTimes = onsets.filter((_, j) => used[j]);
  let extra = 0;
  onsets.forEach((o, j) => {
    if (used[j] || o < first - w || o > last + w) return;
    if (matchedTimes.some((m) => Math.abs(o - m) < 0.06)) return;
    extra++;
  });

  // Tempo per half.
  const half = (from: number, to: number) => {
    const seg = hit.filter((h) => h.e.t >= from && h.e.t < to);
    if (seg.length < 4) return null;
    const fit = linfit(
      seg.map((h) => h.e.t),
      seg.map((h) => h.onset),
    );
    return fit && fit.b > 0 ? opts.bpm / fit.b : null;
  };
  const mid = (first + last) / 2;
  const bpmFirst = half(first, mid);
  const bpmSecond = half(mid, last + 1);
  const all = half(first, last + 1);

  const changes = got.filter((m) => m.e.change);
  const cw = changes.reduce<Match | null>((a, m) => (!a || Math.abs(m.dev!) > Math.abs(a.dev!) ? m : a), null);

  return {
    mode: opts.mode,
    bpm: opts.bpm,
    matches,
    total: expected.filter((e) => !e.optional).length,
    heard: got.length,
    meanMs: mean(d),
    meanAbsMs: mean(d.map(Math.abs)),
    jitterMs: sd(d),
    thumb: stats(got.filter((m) => m.e.group === "thumb")),
    fingers: stats(got.filter((m) => m.e.group === "fingers")),
    onBeat: stats(got.filter((m) => m.e.onBeat)),
    offBeat: stats(got.filter((m) => !m.e.onBeat)),
    missed: matches.filter((m) => m.onset == null && !m.e.optional),
    extra,
    changeWorst: cw ? { ms: cw.dev!, bar: cw.e.bar } : null,
    bpmFirst,
    bpmSecond,
    driftBpm: bpmFirst != null && bpmSecond != null ? bpmSecond - bpmFirst : null,
    effectiveBpm: all,
    worst: [...got].sort((a, b) => Math.abs(b.dev!) - Math.abs(a.dev!)).slice(0, 3),
  };
}

export interface Check {
  label: string;
  ok: boolean;
  value: string;
}

const ms = (x: number) => `${Math.round(x)} ms`;

/** Compare a report with a challenge's criteria. */
export function judge(r: TimingReport, c: Criteria): { pass: boolean; checks: Check[] } {
  const checks: Check[] = [];
  const enough = r.total > 0 && r.heard >= r.total * 0.6;
  checks.push({ label: "Heard enough of the take", ok: enough, value: `${r.heard} of ${r.total} notes` });
  if (c.maxMeanAbsMs != null) checks.push({ label: `Average timing within ${c.maxMeanAbsMs} ms`, ok: r.meanAbsMs <= c.maxMeanAbsMs, value: ms(r.meanAbsMs) });
  if (c.maxMissed != null) checks.push({ label: `No more than ${c.maxMissed} missed notes`, ok: r.missed.length <= c.maxMissed, value: String(r.missed.length) });
  if (c.maxThumbMs != null) checks.push({ label: `Thumb within ${c.maxThumbMs} ms`, ok: r.thumb.n > 0 && r.thumb.abs <= c.maxThumbMs, value: ms(r.thumb.abs) });
  if (c.maxChangeMs != null) {
    const v = r.changeWorst ? Math.abs(r.changeWorst.ms) : 0;
    checks.push({ label: `Chord changes within ${c.maxChangeMs} ms`, ok: v <= c.maxChangeMs, value: r.changeWorst ? `${ms(v)} (bar ${r.changeWorst.bar})` : "none heard" });
  }
  if (c.maxDriftBpm != null) {
    const v = r.driftBpm;
    checks.push({ label: `Tempo drift under ${c.maxDriftBpm} bpm`, ok: v != null && Math.abs(v) <= c.maxDriftBpm, value: v == null ? "not enough notes" : `${v > 0 ? "+" : ""}${v.toFixed(1)} bpm` });
  }
  return { pass: checks.every((x) => x.ok), checks };
}

/** Plain-English "where it's going wrong", most important first. */
export function diagnose(r: TimingReport): string[] {
  const out: string[] = [];
  if (r.heard < r.total * 0.6) {
    out.push("I only heard part of the take. Move the device closer to the soundhole (30–50 cm), play a little louder, or check the mic permission. If a lot of notes really were missed, slow down 10 bpm.");
    return out;
  }
  if (r.mode === "click") {
    if (r.meanMs > 15) out.push(`You're dragging: on average ${Math.round(r.meanMs)} ms behind the click. Aim to make the click disappear under your notes. Playing slightly "on top of" the beat usually fixes this.`);
    else if (r.meanMs < -15) out.push(`You're rushing: on average ${Math.round(-r.meanMs)} ms ahead of the click. Relax into the beat. Tension makes you rush, so check your shoulders and your grip on the neck.`);
  }
  if (r.thumb.n >= 4 && r.fingers.n >= 4) {
    const gap = r.fingers.mean - r.thumb.mean;
    if (gap > 20) out.push(`Your finger notes are ${Math.round(gap)} ms later than your thumb. The fingers are waiting for the thumb to finish. Go back a layer, count the "&"s out loud, and play the finger notes as their own rhythm.`);
    else if (gap < -20) out.push(`Your finger notes are ${Math.round(-gap)} ms early compared with your thumb. The fingers are pulling ahead, often onto the beat. Say "and" out loud as each finger note lands.`);
    if (r.thumb.abs > r.fingers.abs + 10) out.push(`Your thumb is less steady (±${Math.round(r.thumb.abs)} ms) than your fingers (±${Math.round(r.fingers.abs)} ms). The thumb is reacting to the fingers. Play thumb-only for 16 bars, then add the fingers back.`);
  }
  if (r.offBeat.n >= 4 && r.onBeat.n >= 4 && r.mode === "click") {
    const d = r.offBeat.mean - r.onBeat.mean;
    if (d < -25) out.push(`Off-beat notes are early by ${Math.round(-d)} ms, so you're clipping the "&"s. They belong exactly halfway between clicks.`);
    else if (d > 25) out.push(`Off-beat notes are late by ${Math.round(d)} ms, which is a swing feel. It's fine as a style choice, but this pattern is straight eighths.`);
  }
  if (r.changeWorst && Math.abs(r.changeWorst.ms) > 40)
    out.push(`The chord change into bar ${r.changeWorst.bar} was ${Math.round(Math.abs(r.changeWorst.ms))} ms ${r.changeWorst.ms > 0 ? "late" : "early"}. Start the change on the last eighth of the bar before, and get the bass-note finger down first.`);
  if (r.missed.length > 0) {
    const bars = [...new Set(r.missed.map((m) => m.e.bar))].slice(0, 5);
    const byGroup = r.missed.filter((m) => m.e.group === "fingers").length;
    out.push(
      `${r.missed.length} note${r.missed.length === 1 ? "" : "s"} not heard (bar${bars.length === 1 ? "" : "s"} ${bars.join(", ")}). ${
        byGroup > r.missed.length / 2 ? "Mostly finger notes, usually a finger missing its string or a planted finger damping it." : "Mostly bass notes, usually the thumb landing on the wrong string at a change."
      }`,
    );
  }
  if (r.driftBpm != null && Math.abs(r.driftBpm) >= 2)
    out.push(`You ${r.driftBpm > 0 ? "sped up" : "slowed down"} by ${Math.abs(r.driftBpm).toFixed(1)} bpm between the first and second half. ${r.driftBpm > 0 ? "Speeding up usually comes from excitement or tension, so breathe out on beat 1." : "Slowing down usually means a hard spot: loop the bar where it starts."}`);
  if (r.jitterMs > 30) out.push(`Your notes vary by ±${Math.round(r.jitterMs)} ms. Accuracy comes before speed, so drop 10 bpm and get 8 clean bars before going back up.`);
  if (r.extra > r.total * 0.2) out.push(`I heard ${r.extra} extra sounds: string noise, buzzes, fingers bumping strings, or a noisy room. If you're sure it was clean, move the device away from other noise.`);
  if (!out.length) out.push("Clean take. Nothing stands out. Next time, try it 5 bpm faster or with the click off.");
  return out;
}
