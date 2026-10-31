import {Obj, useProp} from '@visotalk/runtime';
import {C, F, Frame, Formula, Case, Grid, P, clamp01, lerp, Person} from './kit.tsx';

// One hour at a milk tea shop: customers arrive at random minutes (the raw events), then the hour is cut
// into six ten-minute bins and the counts rise as bars. The mean line makes the Poisson parameter visible.
const TIMES = [3, 8, 16, 21, 25, 29, 41, 43, 46, 49, 52, 57];
const COUNT = [2, 1, 3, 0, 4, 2];
const X0 = 130, X1 = 1050, TL = 200, TOP = 616, UNIT = 96;
const sx = (min: number) => X0 + (min / 60) * (X1 - X0);
const BINW = (X1 - X0) / 6;

export const Poisson = () => {
  const grow = useProp('grow', 0.03);
  const empty = useProp('empty', 0);
  const tall = useProp('tall', 0);
  return (
    <Frame kicker="04 ／ 离散" title="泊松分布" keyLine="一小时的客人"
      extra={<>
        <Obj id="formula"><Formula>P(X = k) = λ<sup>k</sup> e<sup>−λ</sup> / k!</Formula></Obj>
        <div style={{marginTop: 22}}>
          <Obj id="tag-1"><Case>电话呼入</Case></Obj>
          <Obj id="tag-2"><Case>路口事故</Case></Obj>
          <Obj id="tag-3"><Case>书页错字</Case></Obj>
        </div>
      </>}>
      <svg viewBox={`0 0 ${P.w} ${P.h}`} width={P.w} height={P.h} style={{display: 'block'}}>
        <line x1={X0} x2={X1} y1={TL} y2={TL} stroke={C.rule} strokeWidth={2} />
        {[0, 10, 20, 30, 40, 50, 60].map((m) => (
          <g key={m}>
            <line x1={sx(m)} x2={sx(m)} y1={TL - 10} y2={TL + 10} stroke={C.quiet} strokeWidth={2} />
            <text x={sx(m)} y={TL + 46} textAnchor="middle" fontSize={21} fill={C.dim} fontFamily={F.mono}>{m}</text>
          </g>
        ))}
        <text x={X1 + 16} y={TL + 46} fontSize={21} fill={C.dim} fontFamily={F.sans}>分钟</text>
        <text x={X0} y={TL - 34} fontSize={24} fill={C.quiet} fontFamily={F.sans}>奶茶店的一小时</text>

        {TIMES.map((t, i) => (
          <Obj as="g" key={t} id={`guest-${i + 1}`}>
            <Person x={sx(t)} y={TL + 4} s={0.92} fill={C.ink} opacity={0.92} />
          </Obj>
        ))}

        <Grid rows={[[TOP - 4 * UNIT, '4']]} left={X0} right={X1} />
        {[1, 2, 3, 4, 5].map((b) => (
          <Obj as="g" key={b} id={`div-${b}`}>
            <line x1={X0 + b * BINW} x2={X0 + b * BINW} y1={TL + 60} y2={TOP} stroke={C.rule} strokeWidth={2} strokeDasharray="6 10" />
          </Obj>
        ))}
        <Obj as="g" id="divs-lit">
          {[1, 2, 3, 4, 5].map((b) => (
            <line key={b} x1={X0 + b * BINW} x2={X0 + b * BINW} y1={TL + 60} y2={TOP} stroke={C.accent} strokeWidth={2} strokeDasharray="6 10" opacity={0.55} />
          ))}
        </Obj>

        {COUNT.map((c, i) => {
          const g = clamp01(grow * 1.4 - i * 0.05);
          const h = 5 + g * c * UNIT;
          const x = X0 + i * BINW + BINW / 2 - 46;
          const isTall = c === 4, isZero = c === 0;
          const fill = isTall ? `rgb(${Math.round(lerp(94, 227, tall))} ${Math.round(lerp(82, 161, tall))} ${Math.round(lerp(70, 79, tall))})` : C.bar;
          return (
            <g key={i}>
              <rect x={x} y={TOP - h} width={92} height={h} rx={3} fill={fill} />
              <rect x={x} y={TOP - h} width={92} height={4} fill={C.barTop} opacity={0.85} />
              <text x={x + 46} y={TOP - h - 16} textAnchor="middle" fontSize={28} fontFamily={F.mono} fill={isZero && empty > 0.5 ? C.accent : C.quiet} opacity={isZero ? empty : 0.4 + 0.6 * g}>{c}</text>
            </g>
          );
        })}

        <Obj as="g" id="mean">
          <line x1={X0} x2={X1} y1={TOP - 2 * UNIT} y2={TOP - 2 * UNIT} stroke={C.accent} strokeWidth={3} strokeDasharray="10 8" />
          <text x={X0 - 18} y={TOP - 2 * UNIT + 8} textAnchor="end" fontSize={23} fill={C.accent} fontFamily={F.sans}>平均 2</text>
        </Obj>
        <text x={(X0 + X1) / 2} y={706} textAnchor="middle" fontSize={24} fill={C.dim} fontFamily={F.sans}>每十分钟来了几位客人</text>
      </svg>
    </Frame>
  );
};
