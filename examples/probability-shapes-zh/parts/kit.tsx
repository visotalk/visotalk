// Look: a warm lithograph of everyday statistics. Ground #131110 (near-black umber), ink #F1EAE0 (bone),
// one accent #E3A14F (amber) for the thing the sentence names; headings Noto Serif SC 600 at 92 px, key line
// Noto Sans SC 36 px; every chart is pale ruled ink on a faint warm grid, and the everyday objects (dice, coins,
// cups, buses, people) are flat bone silhouettes. The palette, the type scale and the scene frame below are that
// line in code, and every scene uses them. Ground and faces are also the theme's tokens in doc.tsx.
import type {ReactNode} from 'react';

export const C = {
  ground: '#131110', panel: '#1B1714', rule: '#3A332B',
  ink: '#F1EAE0', quiet: '#A89B89', dim: '#7A6D5F',
  bar: '#5E5246', barTop: '#7C6D5C',
  accent: '#E3A14F', accentSoft: 'rgba(227, 161, 79, 0.18)', glow: 'rgba(227, 161, 79, 0.09)',
};
export const F = {display: 'var(--vt-display)', sans: 'var(--vt-sans)', mono: 'var(--vt-mono)'};
export const T = {
  kicker: {fontSize: 21, fontWeight: 700, letterSpacing: 5},
  title: {fontSize: 92, fontWeight: 600, lineHeight: 1.08},
  key: {fontSize: 36, fontWeight: 400, lineHeight: 1.55},
  formula: {fontSize: 27, fontWeight: 400, lineHeight: 1.7},
  label: {fontSize: 30, fontWeight: 400},
  small: {fontSize: 24, fontWeight: 400},
  figure: {fontSize: 120, fontWeight: 600, lineHeight: 1},
};

// the plot box inside the 1180 x 730 chart area
export const P = {w: 1180, h: 730, top: 64, base: 616, left: 92, right: 1104};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// The scene frame: copy column on the left (kicker, title, a short amber rule, key line, an optional extra such as
// a formula or the everyday cases), the chart on a warm pool of light on the right, a hairline between them.
export const Frame = ({kicker, title, keyLine, extra, children}: {kicker: string; title: string; keyLine: string; extra?: ReactNode; children: ReactNode}) => (
  <div style={{position: 'absolute', inset: 0, background: `radial-gradient(1500px 1050px at 70% 42%, #201A15 0%, ${C.ground} 64%)`}}>
    <div style={{position: 'absolute', left: 108, top: 112, width: 505}}>
      <div style={{...T.kicker, fontFamily: F.sans, color: C.accent}}>{kicker}</div>
      <div style={{...T.title, fontFamily: F.display, color: C.ink, marginTop: 26}}>{title}</div>
      <div style={{width: 64, height: 3, background: C.accent, marginTop: 30, marginBottom: 26}} />
      <div style={{...T.key, fontFamily: F.sans, color: C.quiet}}>{keyLine}</div>
      {extra ? <div style={{marginTop: 30}}>{extra}</div> : null}
    </div>
    <div style={{position: 'absolute', left: 640, top: 140, width: 1, height: 710, background: C.rule, opacity: 0.55}} />
    <div style={{
      position: 'absolute', left: 660, top: 140, width: 1180, height: 730,
      background: `radial-gradient(760px 560px at 48% 60%, ${C.glow}, transparent 72%)`,
    }}>{children}</div>
  </div>
);

export const Formula = ({children, size}: {children: ReactNode; size?: number}) => (
  <div style={{...T.formula, ...(size ? {fontSize: size} : {}), fontFamily: F.mono, color: C.quiet}}>{children}</div>
);

export const Case = ({children}: {children: ReactNode}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 13, ...T.small, fontFamily: F.sans, color: C.quiet, marginBottom: 14}}>
    <span style={{width: 7, height: 7, borderRadius: 4, background: C.accent, flex: '0 0 auto'}} />
    {children}
  </div>
);

// one SVG baseline with optional dashed grid rows: rows are [y, label]
export const Grid = ({rows, top = P.top, base = P.base, left = P.left, right = P.right}: {rows: Array<[number, string]>; top?: number; base?: number; left?: number; right?: number}) => (
  <g>
    {rows.map(([y, label]) => (
      <g key={y}>
        <line x1={left} x2={right} y1={y} y2={y} stroke={C.rule} strokeWidth={1} strokeDasharray="2 9" opacity={0.75} />
        <text x={left - 18} y={y + 8} textAnchor="end" fontSize={22} fill={C.dim} fontFamily={F.mono}>{label}</text>
      </g>
    ))}
    <line x1={left} x2={right} y1={base} y2={base} stroke={C.rule} strokeWidth={2} />
  </g>
);

// a person silhouette standing on (x, y), about 26 px wide and 30 tall at s = 1
export const Person = ({x, y, s = 1, fill, opacity = 1}: {x: number; y: number; s?: number; fill: string; opacity?: number}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity}>
    <circle cx={0} cy={-23} r={5.4} fill={fill} />
    <path d="M -7.4 0 L -7.4 -10 Q -7.4 -17 0 -17 Q 7.4 -17 7.4 -10 L 7.4 0 Z" fill={fill} />
  </g>
);

// a die face with its pips, drawn for a face value of 1 to 6
const PIPS: Record<number, Array<[number, number]>> = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

export const Die = ({cx, top, value, s = 62, accent = false}: {cx: number; top: number; value: number; s?: number; accent?: boolean}) => {
  const k = s * 0.26;
  return (
    <g>
      <rect x={cx - s / 2} y={top} width={s} height={s} rx={s * 0.19} fill={C.panel} stroke={accent ? C.accent : C.quiet} strokeWidth={2} />
      {PIPS[value].map(([u, v], i) => (
        <circle key={i} cx={cx + u * k} cy={top + s / 2 + v * k} r={s * 0.084} fill={accent ? C.accent : C.ink} />
      ))}
    </g>
  );
};
