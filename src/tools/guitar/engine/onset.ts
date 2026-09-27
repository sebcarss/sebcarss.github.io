/**
 * Pure note-onset detector for a mono recording. It band-limits the signal
 * (so a high-pitched metronome blip leaking into the mic is mostly ignored),
 * downsamples to ~11 kHz and computes log-magnitude spectral flux: how much
 * new spectral energy each 6 ms hop brings. A new note adds energy at its own
 * pitches even while other strings are still ringing, which a plain loudness
 * rise misses. Peaks above a local adaptive threshold are onsets, accurate to
 * about one hop (6 ms); the calibration step absorbs any constant offset.
 */

export interface OnsetOptions {
  /** Low-pass corner in Hz; the click is pitched well above it. */
  lowpassHz?: number;
  /** Peak threshold above the local mean, in standard deviations of the flux. */
  delta?: number;
  /** Minimum gap between onsets (s): a strum is one event. */
  minGap?: number;
}

function onePole(x: Float32Array, sr: number, hz: number, high = false): Float32Array {
  const y = new Float32Array(x.length);
  const a = Math.exp((-2 * Math.PI * hz) / sr);
  let lp = 0;
  for (let i = 0; i < x.length; i++) {
    lp = (1 - a) * x[i]! + a * lp;
    y[i] = high ? x[i]! - lp : lp;
  }
  return y;
}

const N = 256;
const LOG2N = 8;
const HANN = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
const REV = Uint16Array.from({ length: N }, (_, i) => {
  let r = 0;
  for (let b = 0; b < LOG2N; b++) if (i & (1 << b)) r |= 1 << (LOG2N - 1 - b);
  return r;
});
const COS = Float64Array.from({ length: N / 2 }, (_, i) => Math.cos((-2 * Math.PI * i) / N));
const SIN = Float64Array.from({ length: N / 2 }, (_, i) => Math.sin((-2 * Math.PI * i) / N));

/** In-place radix-2 FFT of length N. */
function fft(re: Float64Array, im: Float64Array) {
  for (let i = 0; i < N; i++) {
    const j = REV[i]!;
    if (j > i) {
      [re[i], re[j]] = [re[j]!, re[i]!];
      [im[i], im[j]] = [im[j]!, im[i]!];
    }
  }
  for (let size = 2; size <= N; size <<= 1) {
    const half = size >> 1;
    const step = N / size;
    for (let start = 0; start < N; start += size) {
      for (let k = 0; k < half; k++) {
        const c = COS[k * step]!;
        const s = SIN[k * step]!;
        const a = start + k;
        const b = a + half;
        const tr = re[b]! * c - im[b]! * s;
        const ti = re[b]! * s + im[b]! * c;
        re[b] = re[a]! - tr;
        im[b] = im[a]! - ti;
        re[a] = re[a]! + tr;
        im[a] = im[a]! + ti;
      }
    }
  }
}

export function detectOnsets(x: Float32Array, sr: number, o: OnsetOptions = {}): number[] {
  const lowpassHz = o.lowpassHz ?? 1800;
  const delta = o.delta ?? 1.5;
  const minGap = o.minGap ?? 0.05;
  if (x.length < sr * 0.1) return [];

  let y = onePole(x, sr, 60, true);
  y = onePole(onePole(y, sr, lowpassHz), sr, lowpassHz);

  // Downsample to ~11 kHz; the low-pass above keeps it clean enough for onsets.
  const D = Math.max(1, Math.floor(sr / 11025));
  const dsr = sr / D;
  const z = new Float32Array(Math.floor(y.length / D));
  for (let i = 0; i < z.length; i++) z[i] = y[i * D]!;

  const hop = 64;
  const frames = Math.max(0, Math.floor((z.length - N) / hop) + 1);
  if (frames < 8) return [];
  // Only bins up to the low-pass corner count, so the click's pitch never does.
  const maxBin = Math.min(N / 2, Math.ceil((lowpassHz * N) / dsr));
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  let prev = new Float64Array(N / 2);
  let cur = new Float64Array(N / 2);
  const flux = new Float64Array(frames);
  const level = new Float64Array(frames);
  for (let k = 0; k < frames; k++) {
    let e = 0;
    for (let i = 0; i < N; i++) {
      const v = z[k * hop + i]!;
      e += v * v;
      re[i] = v * HANN[i]!;
      im[i] = 0;
    }
    level[k] = 10 * Math.log10(e / N + 1e-12);
    fft(re, im);
    let f = 0;
    for (let b = 1; b < maxBin; b++) {
      cur[b] = Math.log1p(1000 * Math.hypot(re[b]!, im[b]!));
      if (k > 0) f += Math.max(0, cur[b]! - prev[b]!);
    }
    flux[k] = f;
    [prev, cur] = [cur, prev];
  }

  // Loudness gate: ignore anything near the noise floor, taken as the quietest
  // 50 ms stretch (the count-in is mostly silence), or 45 dB under the loudest frame.
  const span = Math.max(1, Math.round((0.05 * dsr) / hop));
  let floor = Infinity;
  let peak = -Infinity;
  for (let k = 0; k + span <= frames; k++) {
    let a = 0;
    for (let j = k; j < k + span; j++) a += level[j]!;
    floor = Math.min(floor, a / span);
  }
  for (const v of level) peak = Math.max(peak, v);
  const gate = Math.max(floor + 10, peak - 45);

  let m = 0;
  for (const v of flux) m += v;
  m /= frames;
  let sd = 0;
  for (const v of flux) sd += (v - m) ** 2;
  sd = Math.sqrt(sd / frames) || 1;
  const nf = Array.from(flux, (v) => (v - m) / sd);

  const out: number[] = [];
  const gapFrames = Math.round((minGap * dsr) / hop);
  let last = -Infinity;
  for (let k = 1; k < frames; k++) {
    const v = nf[k]!;
    let isMax = true;
    for (let j = Math.max(0, k - 3); j <= Math.min(frames - 1, k + 3); j++) if (nf[j]! > v) isMax = false;
    if (!isMax) continue;
    let local = 0;
    let c = 0;
    for (let j = Math.max(0, k - 16); j <= Math.min(frames - 1, k + 4); j++) {
      local += nf[j]!;
      c++;
    }
    if (v < local / c + delta) continue;
    if (Math.max(level[k]!, level[k + 1] ?? -200, level[k + 2] ?? -200) < gate) continue;
    if (k - last < gapFrames) continue;
    last = k;
    // The flux peaks as the window centre crosses the attack; +3 ms corrects the average lead.
    out.push(((k * hop + N / 2) * D) / sr + 0.003);
  }
  return out;
}

/** Latency from a calibration take: median onset − click, over clicks with a nearby onset. */
export function estimateLatency(onsets: number[], clicks: number[], window = 0.25): number | null {
  const d: number[] = [];
  for (const c of clicks) {
    let best: number | null = null;
    for (const o of onsets) {
      const x = o - c;
      if (x > -window / 2 && x < window && (best == null || Math.abs(x) < Math.abs(best))) best = x;
    }
    if (best != null) d.push(best);
  }
  if (d.length < Math.ceil(clicks.length / 2)) return null;
  d.sort((a, b) => a - b);
  return d[Math.floor(d.length / 2)]!;
}
