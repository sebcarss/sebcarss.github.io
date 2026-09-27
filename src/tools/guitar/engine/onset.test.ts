import { describe, expect, it } from "vitest";
import { detectOnsets, estimateLatency } from "./onset";

const SR = 44100;

/** Synthetic plucks: fast attack, exponential decay, a few harmonics, plus noise. */
function render(plucks: { t: number; f: number; a?: number; decay?: number }[], dur: number, clicks: number[] = []) {
  const x = new Float32Array(Math.round(dur * SR));
  let seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5);
  for (let i = 0; i < x.length; i++) x[i] = rnd() * 0.002;
  for (const p of plucks) {
    const s0 = Math.round(p.t * SR);
    const decay = p.decay ?? 0.8;
    for (let i = s0; i < x.length; i++) {
      const t = (i - s0) / SR;
      const env = (p.a ?? 0.5) * Math.min(1, t / 0.002) * Math.exp(-t / decay);
      if (t > 0.01 && env < 1e-5) break;
      x[i]! += env * (Math.sin(2 * Math.PI * p.f * t) + 0.5 * Math.sin(4 * Math.PI * p.f * t) + 0.25 * Math.sin(6 * Math.PI * p.f * t));
    }
  }
  // The timing check's click (audio/synth.ts checkClick): a 4.2 kHz blip with
  // a 3 ms rise, which the detector should ignore even when it leaks in loud.
  for (const c of clicks) {
    const s0 = Math.round(c * SR);
    for (let i = 0; i < SR * 0.03; i++) {
      const t = i / SR;
      const env = t < 0.003 ? 0.5 - 0.5 * Math.cos((Math.PI * t) / 0.003) : Math.exp(-(t - 0.003) / 0.006);
      x[s0 + i]! += 0.15 * env * Math.sin(2 * Math.PI * 4200 * t);
    }
  }
  return x;
}

describe("onset detection", () => {
  it("finds isolated plucks within 10 ms", () => {
    const times = [0.5, 1.0, 1.5, 2.0, 2.5];
    const found = detectOnsets(render(times.map((t, i) => ({ t, f: 110 + i * 40 })), 3), SR);
    expect(found).toHaveLength(times.length);
    found.forEach((f, i) => expect(Math.abs(f - times[i]!)).toBeLessThan(0.01));
  });

  it("finds eighth notes at 90 bpm over ringing strings, and ignores the click", () => {
    const eighth = 60 / 90 / 2;
    const freqs = [130.8, 329.6, 246.9, 329.6, 146.8, 329.6, 246.9, 329.6];
    const plucks = Array.from({ length: 16 }, (_, i) => ({ t: 0.3 + i * eighth, f: freqs[i % 8]!, a: i % 2 ? 0.3 : 0.5, decay: 1.5 }));
    const clicks = Array.from({ length: 8 }, (_, i) => 0.3 + i * eighth * 2 + 0.11);
    const found = detectOnsets(render(plucks, 0.3 + 16 * eighth + 1, clicks), SR);
    expect(found).toHaveLength(plucks.length);
    found.forEach((f, i) => expect(Math.abs(f - plucks[i]!.t)).toBeLessThan(0.01));
  });

  it("treats a fast strum as one event", () => {
    const strum = [0, 0.012, 0.024, 0.036].map((d, i) => ({ t: 1 + d, f: 110 * (i + 1) }));
    expect(detectOnsets(render(strum, 2), SR)).toHaveLength(1);
  });

  it("returns nothing for silence", () => {
    expect(detectOnsets(render([], 1), SR)).toEqual([]);
  });

  it("estimates latency as the median offset", () => {
    const clicks = [1, 2, 3, 4, 5, 6, 7, 8];
    const onsets = clicks.map((c, i) => c + 0.08 + (i % 2 ? 0.01 : -0.01));
    expect(estimateLatency(onsets, clicks)).toBeCloseTo(0.09, 3);
    expect(estimateLatency([1.05], clicks)).toBeNull();
  });
});
