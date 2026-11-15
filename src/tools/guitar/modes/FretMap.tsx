import { fretboardMap, type ModeId } from "./theory";

/**
 * The neck around the fret-5 pentatonic box: pentatonic notes plain, the
 * notes the mode adds highlighted, roots filled. String 1 is at the top,
 * as in tab.
 */

const FROM = 4;
const TO = 9;
const CELL = 46;
const GAP = 22;
const LEFT = 14;
const TOP = 12;

export function FretMap({ mode, name }: { mode: ModeId; name: string }) {
  const cells = fretboardMap(mode, FROM, TO);
  const frets = TO - FROM + 1;
  const W = LEFT * 2 + frets * CELL;
  const H = TOP + 5 * GAP + 30;
  const y = (s: number) => TOP + (s - 1) * GAP;
  const x = (f: number) => LEFT + (f - FROM + 0.5) * CELL;
  return (
    <>
      <svg className="fretmap" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`A ${name} on the neck, frets ${FROM} to ${TO}`}>
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <line key={s} className="fm-string" x1={LEFT} x2={W - LEFT} y1={y(s)} y2={y(s)} />
        ))}
        {Array.from({ length: frets + 1 }, (_, i) => (
          <line key={i} className="fm-fret" x1={LEFT + i * CELL} x2={LEFT + i * CELL} y1={y(1)} y2={y(6)} />
        ))}
        {Array.from({ length: frets }, (_, i) => (
          <text key={i} className="fm-no" x={x(FROM + i)} y={H - 6} textAnchor="middle">
            {FROM + i}
          </text>
        ))}
        {cells.map((c) => (
          <g key={`${c.s}-${c.f}`}>
            <circle className={`fm-dot ${c.role}`} cx={x(c.f)} cy={y(c.s)} r={9.5} />
            <text className={`fm-label ${c.role}`} x={x(c.f)} y={y(c.s) + 3.5} textAnchor="middle">
              {c.label}
            </text>
          </g>
        ))}
      </svg>
      <p className="note map-key">
        <span>
          <span className="dot root" /> root (A)
        </span>
        <span>
          <span className="dot" /> pentatonic you know
        </span>
        <span>
          <span className="dot added" /> added by the mode
        </span>
      </p>
    </>
  );
}
