import {Obj, useProp} from '@visotalk/runtime';

// An orbit from numbers: the ellipse is drawn by a tweened `draw` (0 to 1 of its length), the comet rides it by `comet` (0 to 1 of the inner arc).
const CX = 800, CY = 380, RX = 700, RY = 220, SUN_X = CX - 640;
export const Orbit = () => {
  const draw = useProp('draw', 0);
  const comet = useProp('comet', 0);
  const len = 2 * Math.PI * Math.sqrt((RX * RX + RY * RY) / 2);
  const a = Math.PI * (0.75 + 0.5 * comet); // the arc that passes the Sun
  return (
    <svg viewBox="0 0 1600 760" width={1600} height={760}>
      <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke="var(--vt-muted)" strokeWidth={4} strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
      <Obj as="g" id="sun"><circle cx={SUN_X} cy={CY} r={36} fill="var(--vt-warn)" /><text x={SUN_X + 60} y={CY + 12} fill="var(--vt-text)" fontSize={36} fontFamily="var(--vt-sans)">Sun</text></Obj>
      <Obj as="g" id="neptune"><circle cx={CX + 600} cy={CY - 113} r={18} fill="var(--vt-data)" /><text x={CX + 600} y={CY - 150} fill="var(--vt-text)" fontSize={36} fontFamily="var(--vt-sans)" textAnchor="middle">Neptune</text></Obj>
      {draw >= 1 && <circle cx={Math.round(CX + RX * Math.cos(a))} cy={Math.round(CY + RY * Math.sin(a))} r={16} fill="var(--vt-text)" />}
    </svg>
  );
};
