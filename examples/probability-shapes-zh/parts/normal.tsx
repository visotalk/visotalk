import {Obj, useProp} from '@visotalk/runtime';
import {C, F, Frame, Formula, Case, Person, clamp01, lerp, easeInOut} from './kit.tsx';

// A crowd of people, scattered at first, then binned by height: the stacks of people make the hill, and the
// normal curve is drawn over their tops. Every position is a function of the tweened `sort`.
const N = 64, MU = 170, SIG = 7.5, BASE = 616, STEP = 28, B0 = 140, BW = 5, NB = 12;
const X = (h: number) => 130 + ((h - 140) / 60) * 930;

function qnorm(p: number) {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425, ph = 1 - pl;
  let q: number, r: number;
  if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p <= ph) { q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

type P = {h: number; bin: number; idx: number; x0: number};
const PEOPLE: P[] = (() => {
  const hs = Array.from({length: N}, (_, i) => MU + SIG * qnorm((i + 0.5) / N)).sort((u, v) => u - v);
  const bins: number[][] = Array.from({length: NB}, () => []);
  hs.forEach((h, i) => {
    const b = Math.max(0, Math.min(NB - 1, Math.floor((h - B0) / BW)));
    bins[b].push(i);
  });
  const out: P[] = hs.map((h, i) => ({h, bin: 0, idx: 0, x0: 130 + ((i * 0.6180339887) % 1) * 930}));
  bins.forEach((list, b) => list.forEach((i, k) => { out[i].bin = b; out[i].idx = k; }));
  return out;
})();

const pdf = (h: number) => Math.exp(-Math.pow(h - MU, 2) / (2 * SIG * SIG)) / (SIG * Math.sqrt(2 * Math.PI));
const CY = (h: number) => BASE - pdf(h) * N * BW * STEP;
const CURVE = (() => {
  const pts: string[] = [];
  for (let i = 0; i <= 90; i++) {
    const h = 140 + (60 * i) / 90;
    pts.push(`${i === 0 ? 'M' : 'L'} ${X(h).toFixed(1)} ${CY(h).toFixed(1)}`);
  }
  return pts.join(' ');
})();
const LEN = 960;

export const Normal = () => {
  const sort = useProp('sort', 0);
  const draw = useProp('draw', 0);
  const middle = useProp('middle', 0);
  const t = easeInOut(clamp01(sort));
  return (
    <Frame kicker="07 ／ 连续" title="正态分布" keyLine="一大群人的身高"
      extra={<>
        <Obj id="formula"><Formula>X ～ N(μ, σ²)</Formula></Obj>
        <div style={{marginTop: 24}}>
          <Obj id="tag-1"><Case>体重</Case></Obj>
          <Obj id="tag-2"><Case>考试成绩</Case></Obj>
          <Obj id="tag-3"><Case>测量误差</Case></Obj>
        </div>
      </>}>
      <svg viewBox="0 0 1180 730" width={1180} height={730} style={{display: 'block'}}>
        {[5, 10, 15].map((k) => (
          <g key={k}>
            <line x1={130} x2={1060} y1={BASE - k * STEP} y2={BASE - k * STEP} stroke={C.rule} strokeWidth={1} strokeDasharray="2 9" />
            <text x={112} y={BASE - k * STEP + 8} textAnchor="end" fontSize={21} fill={C.dim} fontFamily={F.mono}>{k} 人</text>
          </g>
        ))}
        <line x1={130} x2={1060} y1={BASE} y2={BASE} stroke={C.rule} strokeWidth={2} />
        {[140, 150, 160, 170, 180, 190, 200].map((h) => (
          <text key={h} x={X(h)} y={BASE + 46} textAnchor="middle" fontSize={23} fill={C.dim} fontFamily={F.mono}>{h}</text>
        ))}
        <text x={330} y={BASE + 88} fontSize={23} fill={C.dim} fontFamily={F.sans}>身高（厘米）</text>
        <text x={1060} y={BASE + 88} textAnchor="end" fontSize={20} fill={C.dim} fontFamily={F.sans} opacity={0.85}>示意：六十四人</text>

        {PEOPLE.map((p, i) => {
          const bx = X(p.bin * BW + B0 + BW / 2) + (p.idx % 2 ? 3 : -3);
          const x = lerp(p.x0, bx, t);
          const y = BASE - p.idx * STEP * t;
          return <Person key={i} x={x} y={y} s={0.92} fill={C.ink} opacity={0.88} />;
        })}

        <Obj as="g" id="middle">
          <path d={`M ${X(165)} 122 L ${X(165)} 112 L ${X(180)} 112 L ${X(180)} 122`} fill="none" stroke={C.accent} strokeWidth={2.5} opacity={middle} />
          <text x={(X(165) + X(180)) / 2} y={94} textAnchor="middle" fontSize={26} fill={C.accent} fontFamily={F.sans} opacity={middle}>大多数</text>
        </Obj>
        <Obj as="g" id="curve">
          <path d={CURVE} fill="none" stroke={C.accent} strokeWidth={5} strokeLinecap="round" strokeDasharray={LEN} strokeDashoffset={LEN * (1 - draw)} />
        </Obj>
      </svg>
    </Frame>
  );
};
