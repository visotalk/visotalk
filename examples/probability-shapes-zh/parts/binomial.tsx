import {Obj, useProp} from '@visotalk/runtime';
import {C, F, Frame, Formula, Case, Grid, P, clamp01, lerp} from './kit.tsx';

// Ten coin tosses, and how many heads: eleven bars, the middle one most likely, with the smooth
// hill the same shape approaches when the count of trials grows (drawn on `smooth`).
const COEF = [1, 10, 45, 120, 210, 252, 210, 120, 45, 10, 1];
const PMAX = 252;
const TOP = 616, MAXH = 400;
const SLOT = (P.right - P.left) / 11;
const BW = 56;

export const Binomial = () => {
  const grow = useProp('grow', 0.03);
  const peak = useProp('peak', 0);
  const smooth = useProp('smooth', 0);
  const toss = useProp('toss', 0);
  const rel = (k: number) => Math.exp(-Math.pow(k - 5, 2) / (2 * 2.5)) / Math.exp(0);
  const curve = Array.from({length: 61}, (_, i) => {
    const k = (i / 60) * 10;
    return `${i === 0 ? 'M' : 'L'} ${(P.left + SLOT * (k + 0.5)).toFixed(1)} ${(TOP - ((rel(k) / rel(5)) * MAXH)).toFixed(1)}`;
  }).join(' ');
  return (
    <Frame kicker="03 ／ 离散" title="二项分布" keyLine="抛十次硬币，数正面"
      extra={<>
        <Obj id="formula"><Formula size={25}>P(X=k)=C(n,k)·p<sup>k</sup>·(1−p)<sup>n−k</sup></Formula></Obj>
        <div style={{marginTop: 26}}>
          <Obj id="tag-1"><Case>投篮 · 命中数</Case></Obj>
          <Obj id="tag-2"><Case>质检 · 次品数</Case></Obj>
        </div>
      </>}>
      <svg viewBox={`0 0 ${P.w} ${P.h}`} width={P.w} height={P.h} style={{display: 'block'}}>
        {Array.from({length: 10}, (_, i) => {
          const x = 150 + i * 97, y = 86;
          const a = 2 * Math.PI * toss * (2 + 0.5 * (i % 4));
          const sy = 0.16 + 0.84 * Math.abs(Math.cos(a));
          const face = Math.cos(a) >= 0 ? '正' : '反';
          return (
            <g key={i} transform={`translate(${x} ${y}) scale(1 ${sy.toFixed(3)})`}>
              <circle r={26} fill={C.panel} stroke={C.quiet} strokeWidth={2} />
              <text y={9} textAnchor="middle" fontSize={26} fill={C.ink} fontFamily={F.display}>{face}</text>
            </g>
          );
        })}
        <Grid rows={[[TOP - MAXH, ''], [TOP - MAXH / 2, '']]} left={P.left} right={P.right} />
        {COEF.map((c, i) => {
          const g = clamp01(grow * 1.55 - i * 0.055);
          const h = 6 + g * (c / PMAX) * MAXH;
          const x = P.left + SLOT * (i + 0.5) - BW / 2;
          const fill = i === 5 ? `rgb(${Math.round(lerp(94, 227, peak))} ${Math.round(lerp(82, 161, peak))} ${Math.round(lerp(70, 79, peak))})` : C.bar;
          return (
            <g key={i}>
              <rect x={x} y={TOP - h} width={BW} height={h} rx={3} fill={fill} />
              <rect x={x} y={TOP - h} width={BW} height={4} fill={C.barTop} opacity={0.85} />
              <text x={x + BW / 2} y={TOP + 46} textAnchor="middle" fontSize={26} fill={C.quiet} fontFamily={F.mono}>{i}</text>
            </g>
          );
        })}
        <Obj as="g" id="smooth">
          <path d={curve} fill="none" stroke={C.ink} strokeWidth={3} strokeDasharray="9 7" opacity={0.75 * smooth} />
        </Obj>
        <Obj as="g" id="peak-label">
          <text x={P.left + SLOT * 5.5} y={TOP - (PMAX / PMAX) * MAXH - 24} textAnchor="middle" fontSize={27} fill={C.accent} fontFamily={F.sans}>最可能 ≈ 25%</text>
        </Obj>
        <text x={(P.left + P.right) / 2} y={706} textAnchor="middle" fontSize={24} fill={C.dim} fontFamily={F.sans}>十次里，正面出现的次数</text>
      </svg>
    </Frame>
  );
};
