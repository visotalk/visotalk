import {Obj, useProp} from '@visotalk/runtime';
import {C, F, Frame, Formula, Case, Grid, P, lerp, clamp01} from './kit.tsx';

// One trial, two outcomes: a coin tumbles above two half-height bars. The flip is drawn from `flip`
// (a tweened number), so the frame is a function of the clock: the face shows heads while the coin faces us.
const CX = 590, TOP = 616, BAR = 232;

export const Bernoulli = () => {
  const flip = useProp('flip', 0);
  const grow = useProp('grow', 0.07);
  const a = flip * 4 * Math.PI;
  const squash = 0.16 + 0.84 * Math.abs(Math.cos(a));
  const face = Math.cos(a) >= 0 ? '正' : '反';
  const h = 0.5 * BAR * lerp(0.07, 1, ease(grow));
  return (
    <Frame kicker="02 ／ 离散" title="伯努利分布" keyLine="抛一枚硬币"
      extra={<>
        <Obj id="formula"><Formula>P(X = 1) = p，P(X = 0) = 1 − p</Formula></Obj>
        <div style={{marginTop: 26}}>
          <Obj id="tag-1"><Case>罚球：命中 / 未中</Case></Obj>
          <Obj id="tag-2"><Case>面试：通过 / 未通过</Case></Obj>
        </div>
      </>}>
      <svg viewBox={`0 0 ${P.w} ${P.h}`} width={P.w} height={P.h} style={{display: 'block'}}>
        <Grid rows={[[TOP - BAR, '½']]} />
        <Obj as="g" id="coin">
          <g transform={`translate(${CX} 214) scale(1 ${squash})`}>
            <circle r={104} fill={C.panel} stroke={C.accent} strokeWidth={4} />
            <circle r={86} fill="none" stroke={C.accent} strokeWidth={1.5} opacity={0.45} />
            <text y={26} textAnchor="middle" fontSize={92} fill={C.accent} fontFamily={F.display}>{face}</text>
          </g>
        </Obj>
        {[{x: 340, label: '正'}, {x: 630, label: '反'}].map((b) => (
          <g key={b.label}>
            <rect x={b.x} y={TOP - h} width={210} height={h} rx={4} fill={C.bar} />
            <rect x={b.x} y={TOP - h} width={210} height={4} fill={C.barTop} opacity={0.9} />
            <text x={b.x + 105} y={TOP - h - 18} textAnchor="middle" fontSize={28} fill={C.quiet} fontFamily={F.mono}>0.5</text>
            <text x={b.x + 105} y={TOP + 54} textAnchor="middle" fontSize={34} fill={C.ink} fontFamily={F.sans}>{b.label}</text>
          </g>
        ))}
        <Obj as="g" id="kinds"><text x={CX} y={TOP + 54} textAnchor="middle" fontSize={24} fill={C.quiet} fontFamily={F.sans}>两种结果</text></Obj>
      </svg>
    </Frame>
  );
};

const ease = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
