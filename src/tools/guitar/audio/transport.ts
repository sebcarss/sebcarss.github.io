import type { Pattern } from "../schema";
import { barSec, clicksForBar, eventsForBar } from "../engine/rhythm";
import { click, playEvent } from "./synth";

/**
 * Look-ahead scheduler (a timer every 25 ms queues any bar that starts in
 * the next 150 ms on the AudioContext clock), shared by the practice player,
 * speed trainer and timing check. Tempo can change only at bar lines.
 */

export interface TransportOptions {
  pattern: Pattern;
  bpmForBar: (bar: number) => number;
  /** Bars after the count-in; omit to loop until stop(). */
  bars?: number;
  countIn?: number;
  click: "on" | "off" | "countin";
  sound: boolean;
  onBar?: (bar: number, bpm: number) => void;
  onEvent?: (bar: number, idx: number) => void;
  onEnd?: () => void;
}

export class Transport {
  readonly t0: number;
  private nextBar: number;
  private nextTime: number;
  private timer: number | undefined;
  private timeouts: number[] = [];
  private nodes: AudioScheduledSourceNode[] = [];
  private out: GainNode;
  private stopped = false;

  constructor(
    private ctx: AudioContext,
    private o: TransportOptions,
  ) {
    const count = o.countIn ?? 1;
    this.nextBar = -count;
    const start = ctx.currentTime + 0.12;
    this.nextTime = start;
    this.t0 = start + count * barSec(o.pattern, o.bpmForBar(0));
    this.out = ctx.createGain();
    this.out.connect(ctx.destination);
    this.tick();
    this.timer = window.setInterval(() => this.tick(), 25);
  }

  private at(t: number, fn: () => void) {
    this.timeouts.push(window.setTimeout(fn, Math.max(0, (t - this.ctx.currentTime) * 1000)));
  }

  private tick() {
    const { o, ctx } = this;
    while (!this.stopped && this.nextTime < ctx.currentTime + 0.15) {
      const bar = this.nextBar;
      if (o.bars != null && bar >= o.bars) {
        const end = this.nextTime;
        window.clearInterval(this.timer);
        this.at(end, () => o.onEnd?.());
        return;
      }
      const bpm = o.bpmForBar(Math.max(0, bar));
      const start = this.nextTime;
      const sink = (n: AudioScheduledSourceNode) => this.nodes.push(n);
      const clickOn = o.click === "on" || (o.click === "countin" && bar < 0);
      if (clickOn) for (const c of clicksForBar(o.pattern, start, bpm)) click(ctx, this.out, c.t, c.accent, sink);
      if (bar >= 0) {
        for (const s of eventsForBar(o.pattern, bar, start, bpm)) {
          if (o.sound) playEvent(ctx, this.out, s.ev, s.t, sink);
          if (o.onEvent) this.at(s.t, () => o.onEvent!(bar, s.idx));
        }
      }
      if (o.onBar) this.at(start, () => o.onBar!(bar, bpm));
      this.nextBar++;
      this.nextTime = start + barSec(o.pattern, bpm);
      // Forget finished nodes so a long loop doesn't grow without bound.
      if (this.nodes.length > 400) this.nodes = this.nodes.slice(-200);
    }
  }

  stop() {
    this.stopped = true;
    window.clearInterval(this.timer);
    this.timeouts.forEach((t) => window.clearTimeout(t));
    const now = this.ctx.currentTime;
    this.out.gain.setTargetAtTime(0, now, 0.02);
    for (const n of this.nodes) {
      try {
        n.stop(now + 0.1);
      } catch {
        /* already stopped */
      }
    }
    window.setTimeout(() => this.out.disconnect(), 300);
  }
}

/** Only one thing plays at a time: starting a new player stops the last one. */
let current: (() => void) | null = null;
export function claim(stop: () => void) {
  if (current && current !== stop) current();
  current = stop;
}
export function release(stop: () => void) {
  if (current === stop) current = null;
}
