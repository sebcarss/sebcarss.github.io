import type { ReactNode } from "react";
import { clamp } from "@/lib/math";

export type Status = "" | "ok" | "off" | "low" | "high";

export interface Band { from: number; to: number; cls?: string }

export function Meter({ scale, bands = [], value, status = "" }: {
  scale: readonly [number, number];
  bands?: Band[];
  value?: number | null;
  status?: Status;
}) {
  const [lo, hi] = scale;
  const pct = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const over = value != null && value > hi;
  return (
    <div className="meter">
      {bands.map((b, i) => (
        <div
          key={i}
          className={"band " + (b.cls ?? "")}
          style={{ left: pct(Math.max(b.from, lo)) + "%", width: pct(Math.min(b.to, hi)) - pct(Math.max(b.from, lo)) + "%" }}
        />
      ))}
      {value != null && Number.isFinite(value) && (
        <div
          className={"marker " + (over ? "over" : status)}
          style={{ left: clamp(pct(value), 0, 99) + "%" }}
          title={over ? "off the scale" : undefined}
        />
      )}
    </div>
  );
}

export function Scale({ scale, ticks }: { scale: readonly [number, number]; ticks: number[] }) {
  const [lo, hi] = scale;
  return (
    <div className="scale">
      {ticks.map((t) => (
        <span key={t} style={{ left: ((t - lo) / (hi - lo)) * 100 + "%" }}>
          {t}
        </span>
      ))}
    </div>
  );
}

export function Metric({ label, hint, value, status = "", children }: {
  label: ReactNode;
  hint?: ReactNode;
  value?: ReactNode;
  status?: Status;
  children?: ReactNode;
}) {
  return (
    <div className="metric">
      <div className="metric-head">
        <span>
          {label} {hint && <span className="target">{hint}</span>}
        </span>
        {value !== undefined && <span className={"value " + status}>{value ?? "–"}</span>}
      </div>
      {children}
    </div>
  );
}

export const statusFor = (v: number | null | undefined, [lo, hi]: readonly [number, number]): Status =>
  v == null || !Number.isFinite(v) ? "" : v < lo ? "low" : v > hi ? "high" : "ok";
