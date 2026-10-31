import {Obj, useProp, useTime} from '@visotalk/runtime';
import {wavePath} from './colors.ts';
import {COLS} from './colors.ts';

// A cross-section of air: a field of molecules the light must cross to reach the eye.
// `mols` fades the field in, `beam` draws the ray reaching the eye.
const MOLS = COLS.flatMap((_, row) =>
  Array.from({length: 26}, (_, i) => ({
    id: `${row}-${i}`,
    x: 110 + i * 50 + (row % 2) * 24,
    y: 130 + row * 70 + Math.sin(i * 1.7 + row) * 12,
  })),
);

export const AirField = () => {
  const mols = useProp('mols', 0);
  const beam = useProp('beam', 0);
  const t = useTime();
  const flick = 0.75 + 0.25 * Math.sin(t * 1.4);
  return (
    <svg viewBox="0 0 1600 620" width={1600} height={620}>
      <Obj as="rect" id="airblock" x={20} y={40} width={1380} height={540} rx={26}
        fill="rgba(150,200,255,0.05)" stroke="rgba(150,200,255,0.28)" strokeWidth={2} />
      <g opacity={mols * flick}>
        {MOLS.map((m) => (
          <circle key={m.id} cx={Math.round(m.x)} cy={Math.round(m.y)} r={7} fill="#9fd0ff" opacity={0.85} />
        ))}
      </g>
      {beam > 0.001 && <line x1={20} y1={310} x2={20 + 1380 * beam} y2={310}
        stroke="#ffffff" strokeWidth={10} strokeLinecap="round" opacity={0.9} />}
      {/* the eye the light is trying to reach */}
      <Obj as="g" id="eye">
        <path d="M 1400 310 q 55 -52 110 0 q -55 52 -110 0 z" fill="none" stroke="var(--vt-text)" strokeWidth={6} />
        <circle cx={1455} cy={310} r={15} fill="var(--vt-text)" />
      </Obj>
    </svg>
  );
};

// One molecule, one wave arriving, one wave leaving at a new angle, then many directions at once.
// The molecule sits left of centre so the arriving beam has room and the leaving rays fill the right.
const MX = 560;
export const Redirect = () => {
  const t = useTime();
  const out = useProp('out', 0);
  const many = useProp('many', 0);
  const pulse = 1 + 0.06 * Math.sin(t * 3);
  return (
    <svg viewBox="0 0 1600 620" width={1600} height={620}>
      <circle cx={MX} cy={310} r={46 * pulse} fill="#9fd0ff" />
      <circle cx={MX} cy={310} r={96} fill="none" stroke="#9fd0ff" strokeWidth={3} opacity={0.3} />
      <text x={MX} y={178} textAnchor="middle" fill="var(--vt-muted)" fontSize={32} fontFamily="var(--vt-sans)">molecule</text>

      {/* the wave arriving: a sine that slides along the beam */}
      <path d={wavePath(310, 64, 30, 40, MX - 70, -t * 6)} stroke="#ffffff" strokeWidth={8} fill="none" strokeLinejoin="round" />

      <g opacity={out}>
        {[-20, 16].map((a, i) => (
          <g key={i} transform={`rotate(${a} ${MX} 310)`}>
            <path d={wavePath(310, 58, 24, MX + 62, 1180, -t * 6)} stroke="#3b82f6" strokeWidth={9} fill="none" strokeLinejoin="round" />
          </g>
        ))}
      </g>
      <g opacity={many}>
        {[-37, -22, -8, 8, 22, 37].map((a, i) => (
          <g key={i} transform={`rotate(${a} ${MX} 310)`}>
            <path d={wavePath(310, 50, 16, MX + 70, MX + 70 + 430, -t * 6)} stroke="#5b9dff" strokeWidth={8} fill="none" strokeLinejoin="round" />
          </g>
        ))}
      </g>
    </svg>
  );
};
