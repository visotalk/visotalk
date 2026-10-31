import {Obj, useProp} from '@visotalk/runtime';
import {C, F, Frame, Formula, Case, P, clamp01} from './kit.tsx';

// Waiting for the next bus: the chance of still waiting after t minutes falls away exponentially. The shaded
// tail past ten minutes is what the line turns to, and the dashed curve that restarts at ten is memorylessness.
const X0 = 140, X1 = 1040, BASE = 616, TOPV = 400, MEAN = 10;
const sx = (t: number) => X0 + (t / 30) * (X1 - X0);
const sy = (t: number) => BASE - TOPV * Math.exp(-t / MEAN);

const restart = () => {
  const out: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const s = (20 * i) / 60;
    out.push(`${i === 0 ? 'M' : 'L'} ${sx(10 + s).toFixed(1)} ${(BASE - TOPV * Math.exp(-s / MEAN)).toFixed(1)}`);
  }
  return out.join(' ');
};
const LEN = 1014;
const path = (from: number, to: number) => {
  const out: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const t = from + ((to - from) * i) / 60;
    out.push(`${i === 0 ? 'M' : 'L'} ${sx(t).toFixed(1)} ${sy(t).toFixed(1)}`);
  }
  return out.join(' ');
};

export const Exponential = () => {
  const draw = useProp('draw', 0);
  const tail = useProp('tail', 0);
  const again = useProp('again', 0);
  return (
    <Frame kicker="06 ／ 连续" title="指数分布" keyLine="等下一班车"
      extra={<>
        <Obj id="formula"><Formula>f(t) = λ e<sup>−λt</sup>，期望 = 1/λ</Formula></Obj>
        <div style={{marginTop: 22}}>
          <Obj id="tag-1"><Case>等下一班公交</Case></Obj>
          <Obj id="tag-2"><Case>灯泡的寿命</Case></Obj>
        </div>
      </>}>
      <svg viewBox={`0 0 ${P.w} ${P.h}`} width={P.w} height={P.h} style={{display: 'block'}}>
        <g opacity={0.5}>
          <path d={path(0, 30)} fill="none" stroke={C.quiet} strokeWidth={2.5} strokeDasharray="5 8" />
        </g>
        {[10, 20].map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={sy(t)} y2={BASE} stroke={C.rule} strokeWidth={1} strokeDasharray="2 8" />
            <text x={sx(t)} y={BASE + 48} textAnchor="middle" fontSize={24} fill={C.dim} fontFamily={F.mono}>{t}</text>
          </g>
        ))}
        <text x={X0} y={BASE + 48} textAnchor="middle" fontSize={24} fill={C.dim} fontFamily={F.mono}>0</text>
        <line x1={X0} x2={X1} y1={BASE} y2={BASE} stroke={C.rule} strokeWidth={2} />
        <text x={X1} y={BASE + 48} textAnchor="end" fontSize={24} fill={C.dim} fontFamily={F.sans}>分钟</text>

        <Obj as="g" id="tail">
          <path d={`${path(10, 30)} L ${sx(30)} ${BASE} L ${sx(10)} ${BASE} Z`} fill={C.accent} opacity={0.16 * tail} />
        </Obj>
        <Obj as="g" id="curve">
          <path d={path(0, 30)} fill="none" stroke={C.accent} strokeWidth={5} strokeLinecap="round" strokeDasharray={LEN} strokeDashoffset={LEN * (1 - draw)} />
        </Obj>

        <Obj as="g" id="pct-1">
          <circle cx={sx(1)} cy={sy(1)} r={6} fill={C.accent} />
          <text x={sx(1) + 18} y={sy(1) - 6} fontSize={30} fill={C.accent} fontFamily={F.mono}>90%</text>
        </Obj>
        <Obj as="g" id="pct-10">
          <line x1={sx(10)} x2={sx(10)} y1={sy(10)} y2={sy(10) - 26} stroke={C.accent} strokeWidth={2} />
          <text x={sx(10) + 14} y={sy(10) - 20} fontSize={30} fill={C.accent} fontFamily={F.mono}>37%</text>
        </Obj>

        <Obj as="g" id="restart">
          <path d={restart()} fill="none" stroke={C.ink} strokeWidth={3} strokeDasharray="8 8" opacity={0.8 * again} />
          <text x={sx(10) + 16} y={BASE - TOPV - 14} fontSize={24} fill={C.ink} fontFamily={F.sans} opacity={again}>重新开始</text>
        </Obj>
        <text x={(X0 + X1) / 2} y={BASE + 96} textAnchor="middle" fontSize={24} fill={C.dim} fontFamily={F.sans}>还要等几分钟</text>
      </svg>
    </Frame>
  );
};
