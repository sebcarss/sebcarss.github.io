import type { Note, TabEvent } from "../schema";
import { OPEN_MIDI } from "../patterns";

/**
 * Browser audio: one shared AudioContext, a Karplus-Strong plucked string
 * for tab demos, and the click. The click is a soft-attack 4.2 kHz blip,
 * pitched far above the guitar so the onset detector (engine/onset.ts)
 * ignores it when it leaks into the mic.
 */

let ctx: AudioContext | null = null;

export function audioSupported() {
  return typeof window !== "undefined" && ("AudioContext" in window || "webkitAudioContext" in window);
}

export function audio(): AudioContext {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new C({ latencyHint: "interactive" });
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

const midiOf = (n: Note) => OPEN_MIDI[n.s] + n.f;
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

const cache = new Map<string, AudioBuffer>();

function pluck(c: AudioContext, midi: number, mute: boolean): AudioBuffer {
  const key = `${midi}:${mute ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const sr = c.sampleRate;
  const len = Math.round(sr * (mute ? 0.3 : 2.5));
  const buf = c.createBuffer(1, len, sr);
  const out = buf.getChannelData(0);
  const period = Math.max(2, Math.round(sr / hz(midi)));
  const line = new Float32Array(period);
  // Noise burst, lightly smoothed for a warmer (flesh rather than pick) attack.
  let prev = 0;
  for (let i = 0; i < period; i++) {
    const r = Math.random() * 2 - 1;
    prev = 0.6 * r + 0.4 * prev;
    line[i] = prev;
  }
  const rho = mute ? 0.9 : midi < 55 ? 0.9985 : 0.997;
  let p = 0;
  for (let i = 0; i < len; i++) {
    const a = line[p]!;
    const b = line[(p + 1) % period]!;
    const v = rho * 0.5 * (a + b);
    out[i] = a;
    line[p] = v;
    p = (p + 1) % period;
  }
  cache.set(key, buf);
  return buf;
}

/** Everything a Transport schedules, so stop() can silence it. */
export type Sink = (node: AudioScheduledSourceNode) => void;

function playBuffer(c: AudioContext, dest: AudioNode, buf: AudioBuffer, when: number, gain: number, sink: Sink) {
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(g).connect(dest);
  src.start(when);
  sink(src);
}

export function playEvent(c: AudioContext, dest: AudioNode, ev: TabEvent, when: number, sink: Sink) {
  if (ev.kind === "chunk") return chunk(c, dest, when, sink);
  const strum = ev.kind === "strum";
  ev.notes.forEach((n, i) => {
    const t = strum ? when + i * 0.012 : when;
    let g = n.finger === "p" ? 0.5 : 0.38;
    if (ev.accent) g *= 1.6;
    if (ev.slur) g *= 0.7;
    if (strum) g *= 0.55;
    playBuffer(c, dest, pluck(c, midiOf(n), !!n.mute), t, g, sink);
  });
}

function chunk(c: AudioContext, dest: AudioNode, when: number, sink: Sink) {
  const len = Math.round(c.sampleRate * 0.06);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len / 6)) + 0.6 * Math.sin((2 * Math.PI * 90 * i) / c.sampleRate) * Math.exp(-i / (len / 4));
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 1200;
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = 0.7;
  src.connect(f).connect(g).connect(dest);
  src.start(when);
  sink(src);
}

export function click(c: AudioContext, dest: AudioNode, when: number, accent: boolean, sink: Sink, volume = 0.35) {
  const o = c.createOscillator();
  o.frequency.value = accent ? 4800 : 4200;
  const g = c.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(volume * (accent ? 1 : 0.7), when + 0.003);
  g.gain.setTargetAtTime(0, when + 0.003, 0.006);
  o.connect(g).connect(dest);
  o.start(when);
  o.stop(when + 0.05);
  sink(o);
}

/** Two-note chime for the end of a practice block. */
export function chime() {
  if (!audioSupported()) return;
  const c = audio();
  const t = c.currentTime + 0.05;
  playBuffer(c, c.destination, pluck(c, 76, false), t, 0.5, () => {});
  playBuffer(c, c.destination, pluck(c, 83, false), t + 0.18, 0.5, () => {});
}
