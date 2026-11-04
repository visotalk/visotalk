import {clamp, fmt, textW, spread, held, ink, GUIDE} from './brief.ts';

export const meta = {
  name: {en: 'Donut', 'zh-CN': '环形图'},
  purpose: 'compare',
  line: "One ring of at most five shares, named outside; the guide's radii hold one.",
  fits: "one year's split into two to five shares",
  params: {
    w: {type: 'px', default: 1680, doc: 'the width'},
    h: {type: 'px', default: 540, doc: 'the height'},
    names: {type: 'list', doc: 'the shares\' names, largest first, \'Other\' last; five at most'},
    values: {type: 'list', doc: 'one figure per share, in the unit of the whole'},
    total: {type: 'number', default: 0, doc: 'the whole: 100 for percentages; 0 for the sum of values'},
    suffix: {type: 'text', default: '%', doc: 'after every figure'},
    decimals: {type: 'number', default: 0, doc: 'digits after the point'},
    centre: {type: 'text', default: '', doc: 'the figure in the ring\'s middle: the share said, or the total'},
    centreLabel: {type: 'text', default: '', doc: 'one short line under it'},
    share: {type: 'number', default: -1, doc: 'the share the guide holds; tween it to turn the guide to the next, the cobalt passing with it; -1 for none'},
    grow: {type: 'progress', default: 1, doc: '0 to 1: the ring drawn clockwise from twelve o\'clock'},
  },
  preview: 45.1,
};

export function Donut({w = 1680, h = 540, names = [], values = [], total = 0, suffix = '%', decimals = 0, centre = '', centreLabel = '', share = -1, grow = 1}: {w?: number; h?: number; names?: string[]; values?: number[]; total?: number; suffix?: string; decimals?: number; centre?: string; centreLabel?: string; share?: number; grow?: number}) {
  const sum = total || values.reduce((a, b) => a + b, 0) || 1;
  const R = Math.round(h / 2 - 40), r = Math.round(R * 0.6);
  const cx = Math.round(w * 0.5), cy = Math.round(h / 2);
  const g = 1 - Math.pow(1 - clamp(grow), 3);
  // each share's start and end angle, clockwise from twelve o'clock
  let a = 0;
  const arcs = values.map((v) => { const s = a; a += (v / sum) * 360; return [s, a] as [number, number]; });
  const pt = (deg: number, rad: number): [number, number] => [cx + rad * Math.sin((deg * Math.PI) / 180), cy - rad * Math.cos((deg * Math.PI) / 180)];
  const wedge = (s: number, e: number) => {
    const s1 = s * g, e1 = Math.max(s1, e * g - 0.6);
    const big = e1 - s1 > 180 ? 1 : 0;
    const [x0, y0] = pt(s1, R), [x1, y1] = pt(e1, R), [x2, y2] = pt(e1, r), [x3, y3] = pt(s1, r);
    return `M${x0} ${y0}A${R} ${R} 0 ${big} 1 ${x1} ${y1}L${x2} ${y2}A${r} ${r} 0 ${big} 0 ${x3} ${y3}Z`;
  };
  // the guide turns between shares: its two radii are interpolated between neighbouring shares' edges
  const k = Math.max(0, Math.min(arcs.length - 1, Math.floor(share))), f = share - k;
  const gs = share >= 0 && arcs[k] ? [arcs[k][0] + (arcs[Math.min(k + 1, arcs.length - 1)][0] - arcs[k][0]) * f, arcs[k][1] + (arcs[Math.min(k + 1, arcs.length - 1)][1] - arcs[k][1]) * f] : null;
  const lit = Math.round(share);
  // labels outside, right half on the right, left half on the left, pushed apart on each side
  const mid = arcs.map(([s, e]) => (s + e) / 2);
  const side = mid.map((m) => (m <= 180 ? 1 : -1));
  const wantY = mid.map((m) => pt(m, R + 36)[1]);
  const ys = new Array(arcs.length).fill(0);
  for (const sd of [1, -1]) {
    const idx = mid.map((_, i) => i).filter((i) => side[i] === sd);
    const placed = spread(idx.map((i) => wantY[i]), 70, 30, h - 50);
    idx.forEach((i, n) => { ys[i] = placed[n]; });
  }
  const lx = (i: number) => cx + side[i] * (R + 70);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display: 'block', overflow: 'visible', fontFamily: 'var(--font-sans)'}}>
      {arcs.map(([s, e], i) => <path key={i} d={wedge(s, e)} fill={(() => {
        // greys alternate; with an odd count the last takes a third grey, so it never meets the first at twelve o'clock
        const base = i % 2 ? 'var(--color-panel2)' : i === arcs.length - 1 && arcs.length % 2 ? 'var(--color-border)' : 'var(--color-faint)';
        return share >= 0 ? ink(held(i, share), base) : base;
      })()} />)}
      {gs && (
        <g>
          <path d={`M${pt(gs[0], r - 14).join(' ')}A${r - 14} ${r - 14} 0 ${gs[1] - gs[0] > 180 ? 1 : 0} 1 ${pt(gs[1], r - 14).join(' ')}L${pt(gs[1], R + 18).join(' ')}A${R + 18} ${R + 18} 0 ${gs[1] - gs[0] > 180 ? 1 : 0} 0 ${pt(gs[0], R + 18).join(' ')}Z`} fill={GUIDE.fill} />
          <line x1={pt(gs[0], r - 14)[0]} y1={pt(gs[0], r - 14)[1]} x2={pt(gs[0], R + 18)[0]} y2={pt(gs[0], R + 18)[1]} stroke={GUIDE.edge} strokeWidth={GUIDE.width} />
          <line x1={pt(gs[1], r - 14)[0]} y1={pt(gs[1], r - 14)[1]} x2={pt(gs[1], R + 18)[0]} y2={pt(gs[1], R + 18)[1]} stroke={GUIDE.edge} strokeWidth={GUIDE.width} />
        </g>
      )}
      {g > 0.9 && arcs.map((_, i) => {
        const on = i === lit && share >= 0;
        const [ax, ay] = pt(mid[i], R + 6);
        const x = lx(i);
        return (
          <g key={i}>
            <polyline points={`${ax},${ay} ${x - side[i] * 22},${ys[i] - 10} ${x - side[i] * 8},${ys[i] - 10}`} fill="none" stroke="var(--color-faint)" strokeWidth={1.5} />
            <text x={x} y={ys[i] - 2} textAnchor={side[i] > 0 ? 'start' : 'end'} fontSize={30} fontWeight={on ? 700 : 500} fill={on ? 'var(--color-text)' : 'var(--color-muted)'}>{names[i]}</text>
            <text x={x} y={ys[i] + 32} textAnchor={side[i] > 0 ? 'start' : 'end'} fontFamily="var(--font-mono)" fontSize={30} fontWeight={on ? 700 : 400} fill={on ? 'var(--color-data)' : 'var(--color-muted)'}>{fmt(values[i], decimals)}{suffix}</text>
          </g>
        );
      })}
      {centre && (
        <g opacity={clamp(grow * 2 - 1)}>
          <text x={cx} y={cy + (centreLabel ? 10 : 22)} textAnchor="middle" fontFamily="var(--font-display)" fontSize={Math.min(96, Math.floor((r * 1.6) / Math.max(1, textW(centre, 1))))} fontWeight={300} fill="var(--color-text)" style={{fontVariantNumeric: 'tabular-nums'}}>{centre}</text>
          {centreLabel && <text x={cx} y={cy + 52} textAnchor="middle" fontSize={26} fill="var(--color-muted)">{centreLabel}</text>}
        </g>
      )}
    </svg>
  );
}
