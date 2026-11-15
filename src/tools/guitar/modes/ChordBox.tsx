import type { Chord } from "../patterns";

/** A chord diagram: strings 6 to 1 left to right, nut at the top. */

const SX = 13;
const FY = 17;
const LEFT = 12;
const TOP = 34;
const FRETS = 4;

export function ChordBox({ chord }: { chord: Chord }) {
  const W = LEFT * 2 + 5 * SX;
  const H = TOP + FRETS * FY + 6;
  const x = (i: number) => LEFT + i * SX;
  const shape = chord.frets.map((f) => (f == null ? "x" : f)).join(" ");
  return (
    <svg className="chordbox" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`${chord.name} chord: ${shape}`}>
      <text className="cb-name" x={W / 2} y={12} textAnchor="middle">
        {chord.name}
      </text>
      <line className="cb-nut" x1={x(0)} x2={x(5)} y1={TOP} y2={TOP} />
      {Array.from({ length: FRETS }, (_, i) => (
        <line key={i} className="cb-line" x1={x(0)} x2={x(5)} y1={TOP + (i + 1) * FY} y2={TOP + (i + 1) * FY} />
      ))}
      {chord.frets.map((_, i) => (
        <line key={i} className="cb-line" x1={x(i)} x2={x(i)} y1={TOP} y2={TOP + FRETS * FY} />
      ))}
      {chord.frets.map((f, i) =>
        f == null ? (
          <text key={i} className="cb-x" x={x(i)} y={TOP - 6} textAnchor="middle">
            ✕
          </text>
        ) : f === 0 ? (
          <circle key={i} className="cb-open" cx={x(i)} cy={TOP - 9} r={3.2} />
        ) : (
          <circle key={i} className="cb-dot" cx={x(i)} cy={TOP + (f - 0.5) * FY} r={4.6} />
        ),
      )}
    </svg>
  );
}
