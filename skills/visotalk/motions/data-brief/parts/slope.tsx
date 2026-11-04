import {clamp, held, ink, fmt, spread, textW, GUIDE} from './brief.ts';

export const meta = {
  name: {en: 'Before and after', 'zh-CN': '前后对比'},
  purpose: 'compare',
  line: 'A slope chart: items at two moments, valued at both ends; the guide lies along one.',
  fits: 'this year against last; before and after; two to eight items',
  params: {
    w: {type: 'px', default: 1680, doc: 'the width'},
    h: {type: 'px', default: 520, doc: 'the height'},
    from: {type: 'text', doc: 'the first moment\'s heading: 2022'},
    to: {type: 'text', doc: 'the second moment\'s heading: 2023'},
    items: {type: 'list', doc: '{label, a, b, change}: each item\'s value at the first and the second moment, and its change, written after b while it is focused: −73%'},
    min: {type: 'number', default: 0, doc: 'the scale\'s floor'},
    max: {type: 'number', default: 100, doc: 'the scale\'s top'},
    prefix: {type: 'text', default: '', doc: 'before every figure'},
    suffix: {type: 'text', default: '', doc: 'after every figure'},
    decimals: {type: 'number', default: 0, doc: 'digits after the point'},
    focus: {type: 'number', default: -1, doc: 'the item in the highlight and under the guide; between two while it passes; -1 for none'},
    draw: {type: 'progress', default: 1, doc: '0 to 1: the lines drawn from the first moment to the second'},
  },
  preview: 41.0,
};

type Item = {label: string; a: number; b: number; change?: string};

export function Slope({w = 1680, h = 520, from = '', to = '', items = [], min = 0, max = 100, prefix = '', suffix = '', decimals = 0, focus = -1, draw = 1}: {w?: number; h?: number; from?: string; to?: string; items?: Item[]; min?: number; max?: number; prefix?: string; suffix?: string; decimals?: number; focus?: number; draw?: number}) {
  const label = (v: number) => `${prefix}${fmt(v, decimals)}${suffix}`;
  // the left labels (name and figure) and the right ones take what they need; the slope gets the middle
  const leftW = Math.max(...items.map((it) => textW(it.label, 30) + 24 + textW(label(it.a), 30, true))) + 30;
  const rightW = Math.max(...items.map((it) => textW(label(it.b), 30, true) + (it.change ? textW(it.change, 30) + 30 : 0))) + 30;
  const pt = 84, pb = 24;
  const x0 = Math.round(Math.min(leftW, w * 0.36)), x1 = Math.round(w - Math.min(rightW, w * 0.3));
  const Y = (v: number) => Math.round(pt + (1 - (v - min) / (max - min)) * (h - pt - pb));
  const la = spread(items.map((it) => Y(it.a)), 44, pt, h - pb);
  const lb = spread(items.map((it) => Y(it.b)), 44, pt, h - pb);
  const d = 1 - Math.pow(1 - clamp(draw), 3);
  const order = items.map((_, i) => i).sort((p, q) => held(p, focus) - held(q, focus));
  const fi = Math.round(focus);
  const f = focus >= 0 && items[fi] ? items[fi] : null;
  const fw = focus >= 0 ? held(fi, focus) : 0;
  // the guide: a band laid along the focused line, ruled on both edges
  const band = 18;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display: 'block', overflow: 'visible', fontFamily: 'var(--font-sans)'}}>
      <text x={x0} y={34} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={30} fontWeight={700} fill="var(--color-text)">{from}</text>
      <text x={x1} y={34} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={30} fontWeight={700} fill="var(--color-text)">{to}</text>
      <line x1={x0} x2={x0} y1={pt - 30} y2={h - pb + 10} stroke="var(--color-text)" strokeWidth={2.5} />
      <line x1={x1} x2={x1} y1={pt - 30} y2={h - pb + 10} stroke="var(--color-text)" strokeWidth={2.5} />
      {f && fw > 0 && (
        <g opacity={fw}>
          <path d={`M${x0} ${Y(f.a) - band} L${x0 + (x1 - x0) * d} ${Y(f.a) + (Y(f.b) - Y(f.a)) * d - band} L${x0 + (x1 - x0) * d} ${Y(f.a) + (Y(f.b) - Y(f.a)) * d + band} L${x0} ${Y(f.a) + band}Z`} fill={GUIDE.fill} />
          <line x1={x0} y1={Y(f.a) - band} x2={x0 + (x1 - x0) * d} y2={Y(f.a) + (Y(f.b) - Y(f.a)) * d - band} stroke={GUIDE.edge} strokeWidth={GUIDE.width} />
          <line x1={x0} y1={Y(f.a) + band} x2={x0 + (x1 - x0) * d} y2={Y(f.a) + (Y(f.b) - Y(f.a)) * d + band} stroke={GUIDE.edge} strokeWidth={GUIDE.width} />
        </g>
      )}
      {order.map((i) => {
        const it = items[i], wgt = focus >= 0 ? held(i, focus) : 0;
        const ya = Y(it.a), yb = Y(it.b);
        const c = ink(wgt, 'var(--color-faint)');
        const t = ink(wgt, 'var(--color-muted)');
        return (
          <g key={it.label}>
            <line x1={x0} y1={ya} x2={x0 + (x1 - x0) * d} y2={ya + (yb - ya) * d} stroke={c} strokeWidth={3 + wgt * 3} strokeLinecap="round" />
            <circle cx={x0} cy={ya} r={7 + wgt * 2} fill={c} />
            {d > 0.98 && <circle cx={x1} cy={yb} r={7 + wgt * 2} fill={c} />}
            {Math.abs(la[i] - ya) > 6 && <line x1={x0 - 6} y1={ya} x2={x0 - 18} y2={la[i]} stroke="var(--color-faint)" strokeWidth={1.5} />}
            <text x={x0 - 22} y={la[i] + 10} textAnchor="end" fontSize={30} fontWeight={wgt > 0.5 ? 700 : 500} fill={wgt > 0.5 ? 'var(--color-text)' : 'var(--color-muted)'}>
              {it.label}<tspan dx={20} fontFamily="var(--font-mono)" fontWeight={wgt > 0.5 ? 700 : 400} fill={t}>{label(it.a)}</tspan>
            </text>
            <g opacity={clamp((d - 0.8) * 5)}>
              {Math.abs(lb[i] - yb) > 6 && <line x1={x1 + 6} y1={yb} x2={x1 + 18} y2={lb[i]} stroke="var(--color-faint)" strokeWidth={1.5} />}
              <text x={x1 + 22} y={lb[i] + 10} fontFamily="var(--font-mono)" fontSize={30} fontWeight={wgt > 0.5 ? 700 : 400} fill={t}>
                {label(it.b)}{wgt > 0.5 && it.change && <tspan dx={18} fontFamily="var(--font-sans)" fill="var(--color-text)">{it.change}</tspan>}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
