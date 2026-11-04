import {clamp, fmt, ticks, under, textW, stepDecimals, niceEvery, GUIDE} from './brief.ts';

export const meta = {
  name: {en: 'Columns', 'zh-CN': '柱状图'},
  purpose: 'data',
  line: 'Columns from zero on a real scale, figures at the tips; the guide stands on one.',
  fits: 'eight quarters; twenty years; gains and losses',
  params: {
    w: {type: 'px', default: 1680, doc: 'the chart\'s width'},
    h: {type: 'px', default: 520, doc: 'the chart\'s height'},
    categories: {type: 'list', doc: 'the labels along the base, one per column: Q1 2024, 2023'},
    values: {type: 'list', doc: 'one figure per column, in the scale\'s unit; negative ones hang below zero'},
    min: {type: 'number', default: 0, doc: 'the scale\'s floor: 0, or below it when a value is negative'},
    max: {type: 'number', default: 100, doc: 'the scale\'s top'},
    step: {type: 'number', default: 20, doc: 'between gridlines'},
    prefix: {type: 'text', default: '', doc: 'before every figure: $'},
    suffix: {type: 'text', default: '', doc: 'after every figure: bn, %'},
    decimals: {type: 'number', default: 0, doc: 'digits after the point'},
    signed: {type: 'boolean', default: false, doc: 'a + before positive figures: for changes'},
    grow: {type: 'progress', default: 1, doc: '0 to 1: the columns grown from zero, first to last'},
    at: {type: 'number', default: -1, doc: 'the column the reading guide stands on; tween it to slide; -1 for no guide'},
    atLabel: {type: 'text', default: '', doc: 'the guide\'s tab'},
    ref: {type: 'object', default: null, doc: '{value, label}: a dashed reference across the chart, labelled at its right end'},
  },
  preview: 17.9,
};

type Ref = {value: number; label: string} | null;

export function Columns({w = 1680, h = 520, categories = [], values = [], min = 0, max = 100, step = 20, prefix = '', suffix = '', decimals = 0, signed = false, grow = 1, at = -1, atLabel = '', ref = null}: {w?: number; h?: number; categories?: string[]; values?: number[]; min?: number; max?: number; step?: number; prefix?: string; suffix?: string; decimals?: number; signed?: boolean; grow?: number; at?: number; atLabel?: string; ref?: Ref}) {
  const n = values.length;
  const label = (v: number, dp = decimals) => `${signed && v > 0 ? '+' : ''}${v < 0 ? '−' : ''}${prefix}${fmt(Math.abs(v), dp)}${suffix}`;
  // the gridlines carry as many decimals as their step needs, the figures as many as the data has
  const tick = (v: number) => label(v, stepDecimals(step)).replace('+', '');
  const tickW = Math.max(...ticks(min, max, step).map((v) => textW(tick(v), 26, true)));
  const pl = tickW + 28, pr = ref ? Math.max(40, textW(ref.label, 26) + 30) : 20, pt = atLabel ? 112 : 64, pb = 64;
  const slot = (w - pl - pr) / Math.max(1, n);
  const bw = Math.round(slot * 0.62);
  const X = (i: number) => Math.round(pl + slot * (i + 0.5));
  const Y = (v: number) => Math.round(pt + (1 - (v - min) / (max - min)) * (h - pt - pb));
  const zero = Y(Math.max(min, Math.min(max, 0)));
  // a figure is set at the tip when the column is wide enough for it, smaller when it is not
  const fitTip = Math.min(30, Math.floor(slot / Math.max(1, ...values.map((v) => textW(label(v), 1, true))) * 0.95));
  // figures are never set under 26 px: where the columns are too narrow, only every k-th tip is written, and the guided one always
  const size = Math.max(26, fitTip);
  const tipEvery = Math.max(1, Math.ceil((Math.max(0, ...values.map((v) => textW(label(v), size, true))) + 10) / slot));
  const every = niceEvery(Math.ceil((Math.max(0, ...categories.map((c) => textW(c, 26, true))) + 20) / slot));
  const guideOn = at >= 0;
  const gx = guideOn ? pl + slot * (at + 0.5) : 0, gw = Math.min(slot, bw + 28);
  const tabW = Math.max(gw, textW(atLabel, 26, true) + 30);
  const tabX = Math.min(Math.round(gx - gw / 2), w - tabW);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display: 'block', overflow: 'visible', fontFamily: 'var(--font-sans)'}}>
      {guideOn && <rect x={Math.round(gx - gw / 2)} y={pt - 6} width={gw} height={h - pb - pt + 6} fill={GUIDE.fill} />}
      {ticks(min, max, step).map((v) => (
        <g key={v}>
          <line x1={pl - 12} x2={w - pr} y1={Y(v)} y2={Y(v)} stroke="var(--color-border)" strokeWidth={1.5} />
          <text x={pl - 20} y={Y(v) + 9} textAnchor="end" fontFamily="var(--font-mono)" fontSize={26} fill="var(--color-muted)">{tick(v)}</text>
        </g>
      ))}
      {(() => {
        // every column first, then every figure over them, so no later column covers a figure
        const cols = values.map((v, i) => {
          const g = clamp(grow * (n + 3) - i * 1.1);
          const e = 1 - Math.pow(1 - g, 3);
          const top = Y(0 + v * e);
          const y0 = Math.min(top, zero), y1 = Math.max(top, zero);
          const lit = guideOn ? under(X(i) - bw / 2, X(i) + bw / 2, gx - gw / 2, gx + gw / 2) : null;
          return {v, i, g, y0, y1, lit, share: lit ? (lit[1] - lit[0]) / bw : 0};
        });
        const tip = (c: (typeof cols)[number]) => {
          const tw = textW(label(c.v), size, true) / 2 + 6;
          const inside = c.v < 0 && c.y1 + size + 6 > h - pb && c.y1 - c.y0 > size + 16;
          // a positive figure rises above any neighbour its width reaches over; a negative one drops below
          const near = cols.filter((o) => Math.abs(X(o.i) - X(c.i)) < tw + bw / 2);
          let y = c.v >= 0 ? Math.min(...near.filter((o) => o.v >= 0).map((o) => o.y0)) - 12 : inside ? c.y1 - 12 : Math.max(...near.filter((o) => o.v < 0).map((o) => o.y1)) + size + 6;
          if (ref && y - size < Y(ref.value) + 12 && y > Y(ref.value) - 12) y = c.v >= 0 ? Y(ref.value) - 12 : Y(ref.value) + size + 12;
          return {y, inside};
        };
        return (
          <>
            {cols.map((c) => (
              <g key={c.i}>
                <rect x={X(c.i) - bw / 2} y={c.y0} width={bw} height={Math.max(0, c.y1 - c.y0)} fill="var(--color-faint)" />
                {c.lit && <rect x={c.lit[0]} y={c.y0} width={c.lit[1] - c.lit[0]} height={Math.max(0, c.y1 - c.y0)} fill="var(--color-data)" />}
              </g>
            ))}
            {cols.map((c) => {
              if (!(c.g > 0.7 && (c.share > 0.5 || c.i % tipEvery === 0))) return null;
              // a figure that would touch the guided one gives way to it
              const lead = cols.find((o) => o.share > 0.5);
              if (lead && lead !== c && Math.abs(X(lead.i) - X(c.i)) < (textW(label(lead.v), size, true) + textW(label(c.v), size, true)) / 2 + 10) return null;
              const {y, inside} = tip(c);
              const lit = c.share > 0.5;
              const half = textW(label(c.v), size, true) / 2;
              return <text key={c.i} x={Math.max(pl - 8 + half, Math.min(w - pr - half, X(c.i)))} y={y} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={size} fontWeight={lit ? 700 : 400} fill={inside ? (lit ? 'var(--color-bg)' : 'var(--color-text)') : lit ? 'var(--color-data)' : 'var(--color-muted)'} opacity={clamp((c.g - 0.7) / 0.3)} stroke={inside ? 'none' : 'var(--color-bg)'} strokeWidth={7} paintOrder="stroke" strokeLinejoin="round">{label(c.v)}</text>;
            })}
          </>
        );
      })()}
      {/* zero is the ink rule; the base carries the periods */}
      <line x1={pl - 12} x2={w - pr} y1={zero} y2={zero} stroke="var(--color-text)" strokeWidth={2.5} />
      {categories.map((c, i) => (
        (i % every === 0 || i === n - 1) && (i === n - 1 || n - 1 - i >= every) ? (
          <text key={i} x={X(i)} y={h - pb + 46} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={26} fill="var(--color-muted)">{c}</text>
        ) : null
      ))}
      {ref && (
        <g>
          <line x1={pl - 12} x2={w - pr + 6} y1={Y(ref.value)} y2={Y(ref.value)} stroke="var(--color-text)" strokeWidth={2.5} strokeDasharray="8 6" />
          <text x={w - pr + 14} y={Y(ref.value) + 9} fontSize={26} fontWeight={600} fill="var(--color-text)">{ref.label}</text>
        </g>
      )}
      {guideOn && (
        <g>
          <line x1={Math.round(gx - gw / 2)} x2={Math.round(gx - gw / 2)} y1={pt - 6} y2={h - pb} stroke={GUIDE.edge} strokeWidth={GUIDE.width} />
          <line x1={Math.round(gx + gw / 2)} x2={Math.round(gx + gw / 2)} y1={pt - 6} y2={h - pb} stroke={GUIDE.edge} strokeWidth={GUIDE.width} />
          {atLabel && <rect x={tabX} y={0} width={tabW} height={44} fill={GUIDE.edge} />}
          {atLabel && <line x1={Math.round(gx - gw / 2)} x2={Math.round(gx - gw / 2)} y1={44} y2={pt - 6} stroke={GUIDE.edge} strokeWidth={GUIDE.width} />}
          {atLabel && <text x={tabX + 15} y={31} fontFamily="var(--font-mono)" fontSize={26} fontWeight={700} fill="var(--color-bg)">{atLabel}</text>}
        </g>
      )}
    </svg>
  );
}
