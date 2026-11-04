import {clamp, fmt, ticks, under, textW, fitSize, GUIDE} from './brief.ts';

export const meta = {
  name: {en: 'Ranking', 'zh-CN': '排行条形图'},
  purpose: 'data',
  line: 'Ranked bars, named at the root, valued at the tip; the guide slides to one.',
  fits: 'survey answers; causes in order; up to twelve rows',
  params: {
    w: {type: 'px', default: 1680, doc: 'the chart\'s width'},
    rows: {type: 'list', doc: '{label, value} in rank order'},
    max: {type: 'number', default: 100, doc: 'the scale\'s top'},
    step: {type: 'number', default: 20, doc: 'between gridlines'},
    suffix: {type: 'text', default: '', doc: 'after every figure: %'},
    decimals: {type: 'number', default: 0, doc: 'digits after the point'},
    h: {type: 'px', default: 560, doc: 'the height it may use: rows shrink to fit it, ten rows and more'},
    rowH: {type: 'px', default: 84, doc: 'each row\'s height, at most'},
    grow: {type: 'progress', default: 1, doc: '0 to 1: the bars grown from the base, top bar first'},
    at: {type: 'number', default: 0, doc: 'the row the guide rests on; tween it to slide the guide (between two rows it lies across both); -1 for no guide'},
    note: {type: 'list', default: [], doc: 'the note in the guide\'s tab, one line each, shown while the guide rests on a row'},
    noteAt: {type: 'number', default: -1, doc: 'the row the note belongs to: shown only while the guide rests there; -1 for any row'},
  },
  preview: 36.6,
};

type Row = {label: string; value: number};
const HALO = {stroke: 'var(--color-bg)', strokeWidth: 7, paintOrder: 'stroke', strokeLinejoin: 'round'} as const;

export function Ranking({w = 1680, rows = [], max = 100, step = 20, suffix = '', decimals = 0, h: hMax = 560, rowH: rowMax = 84, grow = 1, at = 0, note = [], noteAt = -1}: {w?: number; rows?: Row[]; max?: number; step?: number; suffix?: string; decimals?: number; h?: number; rowH?: number; grow?: number; at?: number; note?: string[]; noteAt?: number}) {
  const top = 56, tabW = note.length ? 400 : 16, pad = 24;
  const rowH = Math.max(34, Math.min(rowMax, Math.floor((hMax - top - 10) / Math.max(1, rows.length))));
  const size = Math.min(32, Math.max(24, Math.round(rowH * 0.62)));
  // the label column is as wide as its longest name needs, the tip as wide as its widest figure
  const labelW = Math.min(Math.round(w * 0.38), Math.max(200, ...rows.map((r) => textW(r.label, size) + 28 + pad)));
  const labelSize = (t: string) => fitSize(t, size, labelW - 28 - pad, 24);
  const tipW = Math.max(100, ...rows.map((r) => textW(`${fmt(r.value, decimals)}${suffix}`, size, true) + 36));
  const plotW = w - labelW - tipW - tabW - 30;
  const X = (v: number) => Math.round((v / max) * plotW);
  const h = top + rows.length * rowH + 10;
  const guideOn = at >= 0;
  const g0 = top + at * rowH, g1 = g0 + rowH;
  const gRight = labelW + plotW + tipW;
  const resting = guideOn && (noteAt < 0 || Math.round(at) === noteAt) ? clamp(1 - Math.abs(at - Math.round(at)) * 5) : 0;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display: 'block', overflow: 'visible', fontFamily: 'var(--font-sans)'}}>
      <g transform={`translate(${labelW} 0)`}>
        {ticks(0, max, step).map((v) => (
          <g key={v}>
            <line x1={X(v)} x2={X(v)} y1={top - 8} y2={h - 10} stroke={v === 0 ? 'var(--color-text)' : 'var(--color-border)'} strokeWidth={v === 0 ? 2.5 : 1.5} />
            <text x={X(v)} y={top - 22} textAnchor={v === 0 ? 'start' : 'middle'} fontFamily="var(--font-mono)" fontSize={26} fill="var(--color-muted)">{fmt(v)}{suffix}</text>
          </g>
        ))}
      </g>
      {guideOn && (
        <g>
          <rect x={0} y={Math.round(g0)} width={gRight} height={rowH} fill={GUIDE.fill} />
          {/* the ruled edges lie under the marks, so a word the guide crosses is never struck through */}
          <line x1={0} x2={gRight} y1={Math.round(g0)} y2={Math.round(g0)} stroke={GUIDE.edge} strokeWidth={GUIDE.width} />
          <line x1={0} x2={gRight} y1={Math.round(g1)} y2={Math.round(g1)} stroke={GUIDE.edge} strokeWidth={GUIDE.width} />
        </g>
      )}
      {rows.map((r, i) => {
        const y = top + i * rowH, inset = Math.round(rowH * 0.17), b0 = y + inset, b1 = y + rowH - inset;
        const g = clamp(grow * (rows.length + 2) - i * 1.2, 0, 1);
        const bw = Math.round(X(r.value) * (1 - Math.pow(1 - g, 3)));
        const lit = guideOn ? under(b0, b1, g0, g1) : null;
        const share = lit ? (lit[1] - lit[0]) / (b1 - b0) : 0;
        const strong = share > 0.5;
        return (
          <g key={r.label}>
            <text x={labelW - 28} y={y + rowH / 2 + size * 0.35} textAnchor="end" fontSize={labelSize(r.label)} fontWeight={strong ? 700 : 500} fill={strong ? 'var(--color-text)' : 'var(--color-muted)'} {...HALO}>{r.label}</text>
            <rect x={labelW} y={b0} width={bw} height={b1 - b0} fill="var(--color-faint)" />
            {/* the part of the bar under the guide, in the highlight */}
            {lit && bw > 0 && <rect x={labelW} y={Math.round(lit[0])} width={bw} height={Math.round(lit[1] - lit[0])} fill="var(--color-data)" />}
            {/* the tip figure on a backing of the field, so a gridline never runs through it */}
            {g > 0.6 && <rect x={labelW + bw + 8} y={y + rowH / 2 - size * 0.62} width={textW(`${fmt(r.value, decimals)}${suffix}`, size, true) + 16} height={size * 1.24} fill={strong ? 'none' : 'var(--color-bg)'} />}
            {g > 0.6 && <text x={labelW + bw + 16} y={y + rowH / 2 + size * 0.35} fontFamily="var(--font-mono)" fontSize={size} fontWeight={strong ? 700 : 400} fill={strong ? 'var(--color-data)' : 'var(--color-muted)'} {...HALO}>{fmt(r.value, decimals)}{suffix}</text>}
          </g>
        );
      })}
      {guideOn && (
        <g>
          {/* the tab: the guide's own note, at its right end */}
          <rect x={gRight} y={Math.round(g0)} width={10} height={rowH} fill={GUIDE.edge} />
          {note.length > 0 && (
            <g opacity={resting}>
              {note.map((t, k) => <text key={k} x={gRight + 34} y={Math.round(g0 + rowH / 2 + 10 + (k - (note.length - 1) / 2) * 36)} fontSize={fitSize(t, k ? 26 : 30, tabW - 40, 22)} fontWeight={k ? 400 : 700} fill={k ? 'var(--color-muted)' : 'var(--color-text)'}>{t}</text>)}
            </g>
          )}
        </g>
      )}
    </svg>
  );
}
