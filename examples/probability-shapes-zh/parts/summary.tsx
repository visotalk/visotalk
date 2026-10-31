import {Obj, useProp} from '@visotalk/runtime';
import {C, F, T, clamp01} from './kit.tsx';

// The closing map: one random phenomenon splits into what is counted (discrete) and what is measured
// (continuous), and the seven shapes of the film sit under the two branches with their everyday case.
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const A = hex(a), B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * clamp01(t))).join(',')})`;
};

const MINI = (kind: number, w: number, h: number, color: string, area = 0) => {
  if (kind === 0) {
    const n = 6, bw = w / 10, gap = (w - n * bw) / (n - 1);
    return <g>{Array.from({length: n}, (_, i) => <rect key={i} x={i * (bw + gap)} y={-h * 0.66} width={bw} height={h * 0.66} fill={color} />)}</g>;
  }
  if (kind === 1) {
    return <g>{[0, 1].map((i) => <rect key={i} x={i * (w * 0.62)} y={-h * 0.7} width={w * 0.38} height={h * 0.7} fill={color} />)}</g>;
  }
  if (kind === 2) {
    const v = [0.05, 0.18, 0.48, 0.82, 1, 0.82, 0.48, 0.18, 0.05], bw = w / 12, gap = (w - v.length * bw) / (v.length - 1);
    return <g>{v.map((x, i) => <rect key={i} x={i * (bw + gap)} y={-x * h} width={bw} height={x * h} fill={color} />)}</g>;
  }
  if (kind === 3) {
    const v = [0.34, 0.72, 1, 0.72, 0.4, 0.2, 0.08], bw = w / 11, gap = (w - v.length * bw) / (v.length - 1);
    return <g>{v.map((x, i) => <rect key={i} x={i * (bw + gap)} y={-x * h} width={bw} height={x * h} fill={color} />)}</g>;
  }
  if (kind === 4) {
    const v = [1, 0.83, 0.69, 0.58, 0.48, 0.4], bw = w / 8, gap = (w - v.length * bw) / (v.length - 1);
    return <g>{v.map((x, i) => <rect key={i} x={i * (bw + gap)} y={-x * h * 0.9} width={bw} height={x * h * 0.9} fill={color} />)}</g>;
  }
  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const y = kind === 5 ? -h * Math.exp(-3.4 * t) : -h * Math.exp(-Math.pow((t - 0.5) * 4.2, 2) / 2);
    pts.push(`${(w * t).toFixed(1)} ${y.toFixed(1)}`);
  }
  return (
    <g>
      {area > 0 && <path d={`M 0 0 L ${pts.join(' L ')} L ${w} 0 Z`} fill={C.accent} opacity={0.2 * area} />}
      <path d={`M ${pts.join(' L ')}`} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" />
    </g>
  );
};

const DISC = [
  {kind: 0, name: '均匀', word: '掷骰子'},
  {kind: 1, name: '伯努利', word: '抛一次'},
  {kind: 2, name: '二项', word: '十次里几次'},
  {kind: 3, name: '泊松', word: '一小时几次'},
  {kind: 4, name: '几何', word: '等到成功'},
];
const CONT = [
  {kind: 5, name: '指数', word: '等多久'},
  {kind: 6, name: '正态', word: '量大小'},
];

export const Summary = () => {
  const d = useProp('d', 0);
  const c = useProp('c', 0);
  const qb = useProp('qb', 0);
  const qc = useProp('qc', 0);
  const disc = mix('#574C40', C.ink, d);
  const cont = mix('#574C40', C.ink, c);
  return (
    <div style={{position: 'absolute', inset: 0, background: `radial-gradient(1500px 1050px at 52% 50%, #1F1914 0%, ${C.ground} 66%)`}}>
      <div style={{position: 'absolute', left: 108, top: 84}}>
        <div style={{...T.kicker, fontFamily: F.sans, color: C.accent}}>08 ／ 地图</div>
        <div style={{fontFamily: F.display, fontWeight: 600, fontSize: 64, color: C.ink, marginTop: 14}}>分布地图</div>
        <div style={{fontFamily: F.sans, fontSize: 30, color: C.quiet, marginTop: 10}}>离散看次数，连续看大小</div>
      </div>
      <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{position: 'absolute', inset: 0, display: 'block'}}>
        <circle cx={112} cy={572} r={7} fill={C.accent} />
        <text x={134} y={584} fontSize={32} fill={C.ink} fontFamily={F.sans}>随机现象</text>
        <path d="M 250 578 L 318 578 L 318 370 L 430 370" fill="none" stroke={C.rule} strokeWidth={2} />
        <path d="M 318 586 L 318 740 L 430 740" fill="none" stroke={C.rule} strokeWidth={2} />
        <line x1={430} x2={1800} y1={370} y2={370} stroke={C.rule} strokeWidth={2} />
        <line x1={430} x2={1800} y1={740} y2={740} stroke={C.rule} strokeWidth={2} />

        <text x={430} y={338} fontSize={30} fill={mix(C.dim, C.accent, d)} fontFamily={F.sans}>离散 · 数次数</text>
        <text x={430} y={708} fontSize={30} fill={mix(C.dim, C.accent, c)} fontFamily={F.sans}>连续 · 量数值</text>

        {DISC.map((it, i) => {
          const cx = 580 + i * 270;
          return (
            <g key={it.name} transform={`translate(${cx} 470)`}>
              <line x1={0} x2={0} y1={-100} y2={-62} stroke={C.rule} strokeWidth={2} />
              <g transform="translate(-50 0)">
                {MINI(it.kind, 100, 62, disc)}
                <line x1={0} x2={100} y1={0} y2={0} stroke={C.accent} strokeWidth={3.5} opacity={qb} />
              </g>
              <text y={50} textAnchor="middle" fontSize={30} fill={mix(C.dim, C.ink, d)} fontFamily={F.sans}>{it.name}</text>
              <text y={86} textAnchor="middle" fontSize={21} fill={mix('#5B5044', C.quiet, d)} fontFamily={F.sans}>{it.word}</text>
            </g>
          );
        })}

        {CONT.map((it, i) => {
          const x0 = i === 0 ? 430 : 1180;
          return (
            <g key={it.name} transform={`translate(${x0} 838)`}>
              <line x1={90} x2={90} y1={-98} y2={-70} stroke={C.rule} strokeWidth={2} />
              <text x={0} y={-54} fontSize={30} fill={mix(C.dim, C.ink, c)} fontFamily={F.sans}>{it.name}</text>
              <text x={0} y={-18} fontSize={21} fill={mix('#5B5044', C.quiet, c)} fontFamily={F.sans}>{it.word}</text>
              <g transform="translate(200 0)">{MINI(it.kind, 260, 68, cont, qc)}</g>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
