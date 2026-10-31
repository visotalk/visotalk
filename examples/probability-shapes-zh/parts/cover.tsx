import {Obj} from '@visotalk/runtime';
import {C, F, T} from './kit.tsx';

// The cover: the film's title, and the seven distribution shapes as a skyline along one amber baseline,
// faint at first, lit one after another on the word for "shape", numbered on "seven kinds". No fade: this is frame one.
const SLOT = 232, GAP = 16, X0 = 108, BASE = 868;

const BINOM = [0.004, 0.04, 0.18, 0.48, 0.83, 1, 0.83, 0.48, 0.18, 0.04, 0.004];
const POISSON = [0.5, 1, 1, 0.66, 0.33, 0.13, 0.055, 0.02];
const GEOM = [1, 0.833, 0.694, 0.579, 0.482, 0.402, 0.335, 0.279];

const bars = (vals: number[], max: number, w: number, gap: number, height: number) => {
  const total = vals.length * w + (vals.length - 1) * gap;
  return vals.map((v, i) => ({x: (SLOT - total) / 2 + i * (w + gap), h: Math.max(6, v * height), w}));
};

const decay = (x0: number, x1: number, h: number, rate: number) => {
  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    pts.push(`${(x0 + (x1 - x0) * t).toFixed(1)} ${(0 - h * Math.exp(-rate * t)).toFixed(1)}`);
  }
  return pts.join(' L ');
};

const bell = (x0: number, x1: number, h: number) => {
  const pts: string[] = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    pts.push(`${(x0 + (x1 - x0) * t).toFixed(1)} ${(0 - h * Math.exp(-Math.pow((t - 0.5) * 4.4, 2) / 2)).toFixed(1)}`);
  }
  return pts.join(' L ');
};

const Shape = ({kind, fill}: {kind: number; fill: string}) => {
  const stroke = {fill: 'none', stroke: fill, strokeWidth: 3, strokeLinejoin: 'round' as const};
  if (kind === 0) return <g>{bars(Array(6).fill(0.52), 1, 28, 10, 1).map((b, i) => <rect key={i} x={b.x} y={-160} width={b.w} height={160} fill={fill} />)}</g>;
  if (kind === 1) return <g>{bars([1, 1], 1, 54, 44, 1).map((b, i) => <rect key={i} x={b.x} y={-175} width={b.w} height={175} fill={fill} />)}</g>;
  if (kind === 2) return <g>{bars(BINOM, 1, 15, 4.6, 312).map((b, i) => <rect key={i} x={b.x} y={-b.h} width={b.w} height={b.h} fill={fill} />)}</g>;
  if (kind === 3) return <g>{bars(POISSON, 1, 21, 5.5, 312).map((b, i) => <rect key={i} x={b.x} y={-b.h} width={b.w} height={b.h} fill={fill} />)}</g>;
  if (kind === 4) return <g>{bars(GEOM, 1, 21, 5.5, 300).map((b, i) => <rect key={i} x={b.x} y={-b.h} width={b.w} height={b.h} fill={fill} />)}</g>;
  if (kind === 5) return <g><path d={`M ${decay(10, 222, 312, 3.2)}`} {...stroke} /></g>;
  return <g><path d={`M ${bell(8, 224, 330)}`} {...stroke} /></g>;
};

const Faint = ({kind}: {kind: number}) => <Shape kind={kind} fill="#463C31" />;

const NAMES = ['均匀', '伯努利', '二项', '泊松', '几何', '指数', '正态'];
const PEAK = [160, 175, 312, 312, 300, 312, 330];

export const Cover = () => (
  <div style={{position: 'absolute', inset: 0, background: `radial-gradient(1500px 1000px at 62% 78%, #241C16 0%, ${C.ground} 66%)`}}>
    <div style={{position: 'absolute', left: 120, top: 96}}>
      <div style={{...T.kicker, fontFamily: F.sans, color: C.accent}}>统计 · 入门</div>
      <div style={{fontFamily: F.display, fontWeight: 600, fontSize: 148, lineHeight: 1, color: C.ink, marginTop: 30, letterSpacing: 4}}>概率分布</div>
      <div style={{width: 72, height: 3, background: C.accent, marginTop: 40}} />
      <div style={{fontFamily: F.sans, fontSize: 42, color: C.quiet, marginTop: 30, letterSpacing: 2}}>七种形状，七个日常瞬间</div>
    </div>

    <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{position: 'absolute', inset: 0, display: 'block'}}>
      <line x1={X0} x2={X0 + 7 * SLOT + 6 * GAP} y1={BASE} y2={BASE} stroke={C.accent} strokeWidth={2} opacity={0.75} />
      {NAMES.map((name, i) => {
        const x = X0 + i * (SLOT + GAP);
        return (
          <g key={name} transform={`translate(${x} ${BASE})`}>
            <Faint kind={i} />
            <Obj as="g" id={`shape-${i + 1}`}>
              <Shape kind={i} fill={i === 6 ? C.accent : '#DCCFB9'} />
            </Obj>
            <Obj as="g" id={`num-${i + 1}`}>
              <text x={SLOT / 2} y={-(PEAK[i] + 36)} textAnchor="middle" fontSize={26} fill={C.quiet} fontFamily={F.mono} letterSpacing={2}>{`0${i + 1}`}</text>
            </Obj>
          </g>
        );
      })}
    </svg>
  </div>
);
