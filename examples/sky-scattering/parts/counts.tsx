import {Obj, useProp} from '@visotalk/runtime';
import {COLS, wavePath} from './colors.ts';

// Deflections counted: one dot per "turned aside" for each colour, growing toward the blue end.
// The counts are illustration, not measurement: no figures are written.
const HITS: Record<string, number> = {red: 2, orange: 3, yellow: 4, green: 6, blue: 11, violet: 14};

export const Counts = () => {
  const grow = useProp('grow', 0);
  return (
    <svg viewBox="0 0 1600 620" width={1600} height={620}>
      {COLS.map((c, row) => {
        const y = 60 + row * 92;
        const n = Math.round(HITS[c.id] * grow);
        return (
          <g key={c.id}>
            <text x={40} y={y + 26} fill="var(--vt-muted)" fontSize={34} fontFamily="var(--vt-sans)">{c.name}</text>
            <line x1={230} y1={y + 14} x2={1540} y2={y + 14} stroke="rgba(255,255,255,0.08)" strokeWidth={2} />
            {Array.from({length: n}, (_, i) => (
              <circle key={i} cx={260 + i * (1240 / 15)} cy={y + 14} r={13} fill={c.hex} />
            ))}
          </g>
        );
      })}
    </svg>
  );
};

// Two strands side by side: the long wave runs on, the short one is turned aside again and again.
export const Zigzag = () => {
  const bounces = useProp('bounces', 0);
  return (
    <svg viewBox="0 0 1600 620" width={1600} height={620}>
      <text x={40} y={120} fill="#ff4d4d" fontSize={38} fontFamily="var(--vt-sans)">red</text>
      <path d={wavePath(120, 120, 20, 200, 1540)} stroke="#ff4d4d" strokeWidth={7} fill="none" />
      <text x={40} y={500} fill="#3b82f6" fontSize={38} fontFamily="var(--vt-sans)">blue</text>
      <g>
        {Array.from({length: Math.round(bounces)}, (_, i) => {
          const x0 = 200 + i * (1340 / 7);
          return <path key={i} d={wavePath(i % 2 ? 440 : 500, 60, 22, x0, x0 + 190)} stroke="#3b82f6" strokeWidth={7} fill="none" />;
        })}
      </g>
    </svg>
  );
};
