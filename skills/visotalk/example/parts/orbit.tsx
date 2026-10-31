import {Obj, useProp} from '@visotalk/runtime';
import {C, F, Frame, T} from './kit.tsx';

// Scene "orbit": the same frame; the ellipse is on screen from the first frame as a faint path (a visible first state),
// a tweened `draw` traces it bright, and the comet rides the inner arc by `comet` (0 to 1).
const CX = 520, CY = 360, RX = 440, RY = 150, SUN_X = CX - 400;
export const Orbit = () => {
  const draw = useProp('draw', 0);
  const comet = useProp('comet', 0);
  const len = 2 * Math.PI * Math.sqrt((RX * RX + RY * RY) / 2);
  const a = Math.PI * (0.75 + 0.5 * comet);
  return (
    <Frame kicker="The orbit" title="A long ellipse" keyLine="Out past Neptune, then a few months close to the Sun."
      extra={<div style={{...T.label, fontFamily: F.mono, color: C.ink}}>e ≈ 0.967</div>}>
      <svg viewBox="0 0 1040 720" width={1040} height={720} style={{display: 'block'}}>
        <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke={C.edge} strokeWidth={3} />
        <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke={C.accent} strokeWidth={4} strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
        <Obj as="g" id="sun">
          <circle cx={SUN_X} cy={CY} r={30} fill="#FFD27A" style={{filter: 'drop-shadow(0 0 24px #FFB43C)'}} />
          <text x={SUN_X} y={CY + 76} fill={C.ink} fontSize={30} fontFamily="var(--vt-sans)" textAnchor="middle">Sun</text>
        </Obj>
        <Obj as="g" id="neptune">
          <circle cx={CX + 380} cy={CY - 76} r={14} fill="#6CB6FF" />
          <text x={CX + 380} y={CY - 106} fill={C.ink} fontSize={30} fontFamily="var(--vt-sans)" textAnchor="middle">Neptune</text>
        </Obj>
        {draw >= 1 && <circle cx={Math.round(CX + RX * Math.cos(a))} cy={Math.round(CY + RY * Math.sin(a))} r={13} fill={C.ink} />}
      </svg>
    </Frame>
  );
};
