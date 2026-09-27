import { useEffect, useRef, useState } from "react";
import type { Block } from "../schema";
import { chime } from "../audio/synth";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * The session clock: counts down each block in turn, chimes at the end of
 * one, marks it done and rolls on to the next.
 */
export function BlockTimer({ blocks, onBlockDone, onJump }: { blocks: Block[]; onBlockDone: (id: string) => void; onJump: (id: string) => void }) {
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(() => (blocks[0]?.minutes ?? 0) * 60);
  const [running, setRunning] = useState(false);
  const endAt = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    endAt.current = Date.now() + left * 1000;
    const t = window.setInterval(() => {
      const rem = Math.max(0, Math.round((endAt.current! - Date.now()) / 1000));
      setLeft(rem);
    }, 250);
    return () => window.clearInterval(t);
    // Restart the interval only when running toggles or the block changes.
  }, [running, idx]);

  useEffect(() => {
    if (!running || left > 0) return;
    const b = blocks[idx];
    if (b) onBlockDone(b.id);
    chime();
    if (idx + 1 < blocks.length) {
      setIdx(idx + 1);
      setLeft(blocks[idx + 1]!.minutes * 60);
      onJump(blocks[idx + 1]!.id);
    } else setRunning(false);
  }, [left, running, idx, blocks, onBlockDone, onJump]);

  const go = (i: number) => {
    setIdx(i);
    setLeft(blocks[i]!.minutes * 60);
    onJump(blocks[i]!.id);
  };
  const b = blocks[idx];
  const total = blocks.reduce((a, x) => a + x.minutes, 0) * 60;
  const elapsed = blocks.slice(0, idx).reduce((a, x) => a + x.minutes * 60, 0) + ((b?.minutes ?? 0) * 60 - left);
  return (
    <div className="timer" role="timer" aria-label="Session timer">
      <div className="timer-main">
        <button type="button" className={"btn " + (running ? "" : "btn-primary")} onClick={() => setRunning((r) => !r)}>
          {running ? "⏸ Pause" : elapsed > 0 ? "▶ Resume" : "▶ Start session"}
        </button>
        <span className="timer-block">
          {idx + 1}/{blocks.length} · <strong>{b?.title}</strong>
        </span>
        <span className="timer-left">{mmss(left)}</span>
        <button type="button" className="btn" onClick={() => idx + 1 < blocks.length && go(idx + 1)} disabled={idx + 1 >= blocks.length}>
          Next ›
        </button>
      </div>
      <div className="timer-track" aria-hidden="true">
        {blocks.map((x, i) => (
          <button key={x.id} type="button" tabIndex={-1} className={"seg" + (i < idx ? " past" : i === idx ? " now" : "")} style={{ flexGrow: x.minutes }} onClick={() => go(i)} title={`${x.title} (${x.minutes} min)`} />
        ))}
        <span className="fill" style={{ width: `${(elapsed / total) * 100}%` }} />
      </div>
    </div>
  );
}
