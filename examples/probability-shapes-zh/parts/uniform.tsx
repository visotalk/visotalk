import {Obj, useProp} from '@visotalk/runtime';
import {C, F, Frame, Formula, Case, Grid, P, lerp, Die} from './kit.tsx';

// One die, six faces: six bars of equal height, each carrying its face, rising together to one sixth.
const SLOT = (P.right - P.left) / 6;
const MAX = 0.25;
const UNIT = 430 / MAX;
const BAR_W = 108;

export const Uniform = () => {
  const grow = useProp('grow', 0.06);
  const h = lerp(0.06, 1, grow) * (1 / 6) * UNIT;
  return (
    <Frame kicker="01 ／ 离散" title="均匀分布" keyLine="掷一次骰子"
      extra={<>
        <Obj id="formula"><Formula>P(X = k) = 1 / 6，k = 1…6</Formula></Obj>
        <div style={{marginTop: 26}}>
          <Obj id="tag-1"><Case>摸奖</Case></Obj>
          <Obj id="tag-2"><Case>摇号</Case></Obj>
          <Obj id="tag-3"><Case>抽签</Case></Obj>
        </div>
      </>}>
      <svg viewBox={`0 0 ${P.w} ${P.h}`} width={P.w} height={P.h} style={{display: 'block'}}>
        <Grid rows={[[P.base - 0.1 * UNIT, '0.1'], [P.base - (1 / 6) * UNIT, '1/6'], [P.base - 0.2 * UNIT, '0.2']]} />
        {[1, 2, 3, 4, 5, 6].map((v, i) => {
          const cx = P.left + SLOT * (i + 0.5);
          const top = P.base - h;
          return (
            <g key={v}>
              <rect x={cx - BAR_W / 2} y={top} width={BAR_W} height={h} rx={4} fill={C.bar} />
              <rect x={cx - BAR_W / 2} y={top} width={BAR_W} height={4} fill={C.barTop} opacity={0.9} />
              <Die cx={cx} top={top - 16 - 62} value={v} />
              <text x={cx} y={P.base + 52} textAnchor="middle" fontSize={32} fill={C.quiet} fontFamily={F.sans}>{['一', '二', '三', '四', '五', '六'][i]}</text>
            </g>
          );
        })}
        <Obj as="g" id="rule">
          <line x1={P.left} x2={P.right} y1={P.base - h} y2={P.base - h} stroke={C.accent} strokeWidth={3} strokeDasharray="10 8" />
        </Obj>
      </svg>
    </Frame>
  );
};
