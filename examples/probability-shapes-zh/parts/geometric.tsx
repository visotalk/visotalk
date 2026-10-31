import {Obj, useProp} from '@visotalk/runtime';
import {C, F, Frame, Formula, Case, Grid, clamp01, lerp, Die} from './kit.tsx';

// Throwing until the first six: the throws at the top are the story, and below them the probability that
// the first success lands on throw one, two, three… falls away — a bar for each, sliding down.
const PL = {left: 92, right: 1104, base: 616};
const PROB = [1, 5 / 6, 25 / 36, 125 / 216, 625 / 1296, 3125 / 7776, 15625 / 46656, 78125 / 279936];
const MAXH = 400, BW = 74, GAP = 46;
const START = (1180 - (PROB.length * BW + (PROB.length - 1) * GAP)) / 2;
const DICE = [2, 5, 3, 6];

export const Geometric = () => {
  const grow = useProp('grow', 0.03);
  const first = useProp('first', 0);
  return (
    <Frame kicker="05 ／ 离散" title="几何分布" keyLine="第一次成功，要试几把？"
      extra={<>
        <Obj id="formula"><Formula>P(X = k) = (1 − p)<sup>k−1</sup> · p</Formula></Obj>
        <div style={{marginTop: 22}}>
          <Obj id="tag-1"><Case>抽卡 · 抽到为止</Case></Obj>
        </div>
      </>}>
      <svg viewBox="0 0 1180 730" width={1180} height={730} style={{display: 'block'}}>
        {DICE.map((v, i) => (
          <Obj as="g" key={v + '-' + i} id={`throw-${i + 1}`}>
            <Die cx={286 + i * 200} top={52} value={v} s={92} accent={i === 3} />
            <text x={286 + i * 200} y={186} textAnchor="middle" fontSize={22} fill={i === 3 ? C.accent : C.dim} fontFamily={F.sans}>
              第{['一', '二', '三', '四'][i]}把
            </text>
          </Obj>
        ))}
        <Obj as="g" id="dots">
          <text x={START + 8 * BW + 7 * GAP + 8} y={PL.base - 26} textAnchor="middle" fontSize={40} fill={C.quiet} fontFamily={F.sans}>…</text>
        </Obj>

        <Grid rows={[]} />
        {PROB.map((v, i) => {
          const g = i === 0 ? clamp01(first) : clamp01(grow * 2.1 - (i - 1) * 0.15);
          const h = 5 + g * v * MAXH;
          const x = START + i * (BW + GAP);
          const accent = i === 0;
          const fill = accent ? `rgb(${Math.round(lerp(94, 227, first))} ${Math.round(lerp(82, 161, first))} ${Math.round(lerp(70, 79, first))})` : C.bar;
          return (
            <g key={i}>
              <rect x={x} y={PL.base - h} width={BW} height={h} rx={3} fill={fill} />
              <rect x={x} y={PL.base - h} width={BW} height={4} fill={C.barTop} opacity={0.85} />
              <text x={x + BW / 2} y={PL.base + 46} textAnchor="middle" fontSize={26} fill={C.quiet} fontFamily={F.sans}>{['一', '二', '三', '四', '五', '六', '七', '八'][i]}</text>
            </g>
          );
        })}
        <Obj as="g" id="sixth">
          <text x={START + BW / 2} y={PL.base - PROB[0] * MAXH - 22} textAnchor="middle" fontSize={27} fill={C.accent} fontFamily={F.mono}>1/6</text>
        </Obj>
        <text x={590} y={706} textAnchor="middle" fontSize={24} fill={C.dim} fontFamily={F.sans}>第几次才掷出六点</text>
      </svg>
    </Frame>
  );
};
