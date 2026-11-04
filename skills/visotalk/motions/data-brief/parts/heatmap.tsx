import {clamp, fmt, textW, fitSize, GUIDE} from './brief.ts';

export const meta = {
  name: {en: 'Heatmap', 'zh-CN': '热力表'},
  purpose: 'data',
  line: 'A grid shaded in one ink ramp with its key; the guide on the column said, a cell framed.',
  fits: 'hours by days; regions or months by years',
  params: {
    w: {type: 'px', default: 1680, doc: 'the width'},
    h: {type: 'px', default: 540, doc: 'the height it may use, the key included'},
    rows: {type: 'list', doc: 'the row labels, top to bottom'},
    columns: {type: 'list', doc: 'the column labels, left to right'},
    values: {type: 'list', doc: 'one list per row, one figure per column'},
    min: {type: 'number', default: 0, doc: 'the value at the ramp\'s lightest'},
    max: {type: 'number', default: 100, doc: 'the value at its darkest'},
    decimals: {type: 'number', default: 0, doc: 'digits after the point'},
    unit: {type: 'text', default: '', doc: 'what the shade measures, beside the key: years, %, °C'},
    figures: {type: 'boolean', default: true, doc: 'figures in the cells; they are left out by themselves when cells are too small'},
    axis: {type: 'text', default: 'column', doc: 'what the guide lies across: column or row'},
    at: {type: 'number', default: -1, doc: 'the column (or row) under the guide; tween it to slide; -1 for none'},
    atLabel: {type: 'text', default: '', doc: 'the guide\'s tab, over a column guide (a row is named by its label)'},
    cell: {type: 'number', default: -1, doc: 'within the guided line, the index of the cell framed in cobalt; -1 for none'},
    shown: {type: 'progress', default: 1, doc: '0 to 1: the cells shaded in, left to right'},
  },
  preview: 28.0,
};

export function Heatmap({w = 1680, h = 540, rows = [], columns = [], values = [], min = 0, max = 100, decimals = 0, unit = '', figures = true, axis = 'column', at = -1, atLabel = '', cell = -1, shown = 1}: {w?: number; h?: number; rows?: string[]; columns?: string[]; values?: number[][]; min?: number; max?: number; decimals?: number; unit?: string; figures?: boolean; axis?: string; at?: number; atLabel?: string; cell?: number; shown?: number}) {
  const nr = rows.length, nc = columns.length;
  const labelW = Math.min(Math.round(w * 0.28), Math.max(120, ...rows.map((r) => textW(r, 30) + 28)));
  const top = 96, keyH = 78;
  const cw = Math.floor((w - labelW) / Math.max(1, nc));
  const ch = Math.max(24, Math.min(140, Math.floor((h - top - keyH) / Math.max(1, nr))));
  const gridH = ch * nr;
  const size = Math.min(34, Math.max(22, Math.round(Math.min(ch * 0.4, cw / Math.max(1, ...values.flat().map((v) => textW(fmt(v, decimals), 1, true))) * 0.8))));
  const write = figures && size >= 24 && ch >= 40;
  const p = (v: number) => clamp((v - min) / (max - min));
  // one ink ramp on the field: light is low, dark is high; cobalt never shades, it only frames
  const shade = (v: number) => `color-mix(in srgb, var(--color-text) ${Math.round(8 + p(v) * 74)}%, var(--color-panel))`;
  const col = axis !== 'row';
  const on = at >= 0;
  const gx = labelW + at * cw, gy = top + at * ch;
  const ri = Math.round(at);
  const tabW = textW(atLabel, 26, true) + 30;
  const colSize = fitSize(columns.reduce((a, b) => (textW(b, 1) > textW(a, 1) ? b : a), ''), 28, cw - 12, 20);
  return (
    <svg width={w} height={top + gridH + keyH} viewBox={`0 0 ${w} ${top + gridH + keyH}`} style={{display: 'block', overflow: 'visible', fontFamily: 'var(--font-sans)'}}>
      {columns.map((c, j) => <text key={c} x={labelW + j * cw + cw / 2} y={top - 18} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={colSize} fontWeight={on && col && ri === j ? 700 : 400} fill={on && col && ri === j ? 'var(--color-text)' : 'var(--color-muted)'}>{c}</text>)}
      {rows.map((r, i) => <text key={r} x={labelW - 22} y={top + i * ch + ch / 2 + 10} textAnchor="end" fontSize={fitSize(r, 30, labelW - 28, 22)} fontWeight={on && !col && ri === i ? 700 : 500} fill="var(--color-text)">{r}</text>)}
      {values.map((row, i) => row.map((v, j) => {
        const k = clamp(shown * (nc + 2) - j);
        const dark = p(v) > 0.5;
        return (
          <g key={`${i}-${j}`} opacity={k}>
            <rect x={labelW + j * cw + 2} y={top + i * ch + 2} width={cw - 4} height={ch - 4} fill={shade(v)} />
            {write && <text x={labelW + j * cw + cw / 2} y={top + i * ch + ch / 2 + size * 0.35} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={size} fill={dark ? 'var(--color-bg)' : 'var(--color-text)'}>{fmt(v, decimals)}</text>}
          </g>
        );
      }))}
      {on && (
        <g>
          {/* the guide: a tint across the line said, ruled on both edges, its tab above the columns */}
          {col ? <rect x={gx} y={top - 52} width={cw} height={gridH + 60} fill={GUIDE.fill} /> : <rect x={0} y={gy} width={w} height={ch} fill={GUIDE.fill} />}
          {col ? (
            <>
              <line x1={gx} x2={gx} y1={top - 52} y2={top + gridH + 8} stroke={GUIDE.edge} strokeWidth={GUIDE.width} />
              <line x1={gx + cw} x2={gx + cw} y1={top - 52} y2={top + gridH + 8} stroke={GUIDE.edge} strokeWidth={GUIDE.width} />
              {atLabel && <rect x={Math.min(gx, w - tabW)} y={top - 96} width={tabW} height={40} fill={GUIDE.edge} />}
              {atLabel && <text x={Math.min(gx, w - tabW) + 15} y={top - 68} fontFamily="var(--font-mono)" fontSize={26} fontWeight={700} fill="var(--color-bg)">{atLabel}</text>}
            </>
          ) : (
            <>
              <line x1={0} x2={w} y1={gy} y2={gy} stroke={GUIDE.edge} strokeWidth={GUIDE.width} />
              <line x1={0} x2={w} y1={gy + ch} y2={gy + ch} stroke={GUIDE.edge} strokeWidth={GUIDE.width} />
            </>
          )}
          {cell >= 0 && (() => {
            const x = col ? labelW + ri * cw : labelW + cell * cw, y = col ? top + cell * ch : top + ri * ch;
            return <rect x={x + 3} y={y + 3} width={cw - 6} height={ch - 6} fill="none" stroke="var(--color-data)" strokeWidth={6} />;
          })()}
        </g>
      )}
      {/* the key: the ramp from min to max, with the unit */}
      <g transform={`translate(${labelW} ${top + gridH + 28})`}>
        {Array.from({length: 24}, (_, k) => <rect key={k} x={k * 16} y={0} width={16} height={14} fill={shade(min + ((k + 0.5) / 24) * (max - min))} />)}
        <text x={0} y={46} fontFamily="var(--font-mono)" fontSize={28} fill="var(--color-muted)">{fmt(min, decimals)}</text>
        <text x={384} y={46} textAnchor="end" fontFamily="var(--font-mono)" fontSize={28} fill="var(--color-muted)">{fmt(max, decimals)}</text>
        {unit && <text x={404} y={14} fontSize={28} fill="var(--color-muted)">{unit}</text>}
      </g>
    </svg>
  );
}
