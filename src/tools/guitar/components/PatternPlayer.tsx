import { useEffect, useRef, useState } from "react";
import type { Pattern } from "../schema";
import { trainerBpm } from "../engine/rhythm";
import { audio, audioSupported } from "../audio/synth";
import { Transport, claim, release } from "../audio/transport";

export type Pos = { bar: number; idx: number } | null;

/**
 * Practice player: hear the tab, play along with the click, and let the
 * speed trainer push the tempo up bar by bar. "Log clean tempo" saves your
 * best clean bpm for the exercise.
 */
export function PatternPlayer({
  pattern,
  start,
  target,
  best,
  onBest,
  onPos,
}: {
  pattern: Pattern;
  start: number;
  target: number;
  best?: number;
  onBest?: (bpm: number) => void;
  onPos?: (p: Pos) => void;
}) {
  const [bpm, setBpm] = useState(start);
  const [sound, setSound] = useState(true);
  const [clickOn, setClickOn] = useState(true);
  const [trainer, setTrainer] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [live, setLive] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const tr = useRef<Transport | null>(null);
  const stopRef = useRef<() => void>(() => {});

  const stop = () => {
    tr.current?.stop();
    tr.current = null;
    release(stopRef.current);
    setPlaying(false);
    setLive(null);
    onPos?.(null);
  };
  stopRef.current = stop;
  useEffect(() => () => stopRef.current(), []);

  const play = () => {
    if (!audioSupported()) return;
    const s = stopRef.current;
    claim(s);
    const top = Math.max(target, bpm);
    tr.current = new Transport(audio(), {
      pattern,
      bpmForBar: (b) => (trainer ? trainerBpm(b, { start: bpm, step: 4, every: 4, max: top }) : bpm),
      countIn: pattern.beats < 3 ? 2 : 1,
      click: clickOn ? "on" : "countin",
      sound,
      onBar: (b, v) => {
        setLive(v);
        if (b < 0) onPos?.(null);
      },
      onEvent: (bar, idx) => onPos?.({ bar, idx }),
    });
    setPlaying(true);
    setSaved(false);
  };

  // Settings apply on the next start; restart if they change mid-play.
  const restart = useRef(false);
  useEffect(() => {
    if (!restart.current) return;
    restart.current = false;
    if (playing) {
      stop();
      play();
    }
  }, [sound, clickOn, trainer]);
  const toggle = (set: (f: (v: boolean) => boolean) => void) => () => {
    restart.current = true;
    set((v) => !v);
  };

  const shown = live ?? bpm;
  return (
    <div className="player">
      <div className="player-row">
        <button type="button" className={"btn " + (playing ? "" : "btn-primary")} onClick={playing ? stop : play} disabled={!audioSupported()}>
          {playing ? "■ Stop" : "▶ Play"}
        </button>
        <div className="tempo">
          <button type="button" className="btn step" onClick={() => setBpm((b) => Math.max(30, b - 2))} disabled={playing} aria-label="Slower">
            −
          </button>
          <span className="bpm">
            <strong>{shown}</strong> bpm
          </span>
          <button type="button" className="btn step" onClick={() => setBpm((b) => Math.min(200, b + 2))} disabled={playing} aria-label="Faster">
            +
          </button>
        </div>
        <span className="note bpm-hint">
          Start {start} → target {target}
          {pattern.beats === 2 ? " (click = dotted quarter)" : ""}
        </span>
      </div>
      <div className="player-row opts">
        <label>
          <input type="checkbox" checked={sound} onChange={toggle(setSound)} /> Hear the tab
        </label>
        <label>
          <input type="checkbox" checked={clickOn} onChange={toggle(setClickOn)} /> Click
        </label>
        <label>
          <input type="checkbox" checked={trainer} onChange={toggle(setTrainer)} /> Speed trainer (+4 bpm every 4 bars)
        </label>
      </div>
      {onBest && (
        <div className="player-row">
          <button
            type="button"
            className="btn"
            onClick={() => {
              onBest(shown);
              setSaved(true);
            }}
          >
            Log {shown} bpm as clean
          </button>
          <span className="note">
            {saved ? "Logged. " : ""}
            {best ? `Best clean: ${best} bpm${best >= target ? " ✓ target reached" : ""}` : "Log it when you get 4 clean bars in a row."}
          </span>
        </div>
      )}
    </div>
  );
}
