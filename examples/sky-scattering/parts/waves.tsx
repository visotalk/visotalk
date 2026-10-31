import {Obj, useProp, useTime} from '@visotalk/runtime';
import {wavePath} from './colors.ts';

// Two waves on one clock: both slide right at the same rate, so only their spacing differs.
// `gap` draws the crest-to-crest bracket on the single wave; `split` brings the pair in.
const SPEED = 78;

export const Waves = () => {
  const t = useTime();
  const gap = useProp('gap', 0);
  const phase = -((t * SPEED) / 560) * Math.PI * 2;
  return (
    <svg viewBox="0 0 1600 620" width={1600} height={620}>
      {/* red: long waves */}
      <Obj as="path" id="wave-red" d={wavePath(160, 560, 86, 80, 1520, phase)} stroke="#ff4d4d" strokeWidth={9} fill="none" strokeLinejoin="round" />
      {/* blue: short waves, same speed */}
      <Obj as="path" id="wave-blue" d={wavePath(440, 160, 86, 80, 1520, phase * 3.5)} stroke="#3b82f6" strokeWidth={9} fill="none" strokeLinejoin="round" />
      {/* the gap between two crests, on the red wave */}
      <g opacity={gap}>
        <line x1={300} y1={40} x2={860} y2={40} stroke="var(--vt-muted)" strokeWidth={4} strokeDasharray={560} strokeDashoffset={560 * (1 - gap)} />
        <line x1={300} y1={20} x2={300} y2={62} stroke="var(--vt-muted)" strokeWidth={4} opacity={gap > 0.9 ? 1 : 0} />
        <line x1={860} y1={20} x2={860} y2={62} stroke="var(--vt-muted)" strokeWidth={4} opacity={gap > 0.9 ? 1 : 0} />
      </g>
    </svg>
  );
};

// One wave travelling into one small molecule and leaving at a new angle.
export const Hit = () => {
  const t = useTime();
  const out = useProp('out', 0);
  const run = Math.round(t * 90) % 200;
  return (
    <svg viewBox="0 0 1600 620" width={1600} height={620}>
      <circle cx={760} cy={310} r={26} fill="#9fd0ff" opacity={0.9} />
      <circle cx={760} cy={310} r={54} fill="none" stroke="#9fd0ff" strokeWidth={2} opacity={0.35} />
      <path d={wavePath(310, 70, 26, 560 - run, 720)} stroke="#3b82f6" strokeWidth={7} fill="none" />
      <g transform="rotate(-38 760 310)">
        <path d={wavePath(310, 70, 26, 792, 1060 + run)} stroke="#3b82f6" strokeWidth={7} fill="none" opacity={out} />
      </g>
    </svg>
  );
};
