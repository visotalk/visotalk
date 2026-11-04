import React from 'react';
import {Module, num, spanW, unit} from './sheet.tsx';

export const meta = {
  name: {en: 'Plot', 'zh-CN': '坐标图'},
  purpose: 'data',
  line: 'Lines or dots on ruled axes drawn left to right, a value riding the tip, an axis that rescales.',
  fits: 'values over years, curves, a function, a scatter; 1–4 series',
  params: {
    series: {type: 'list', doc: '[{label, points: [[x, y], …], dash?, dots?}]: each line, named at its end (an empty label names nothing); dots: points only, a scatter'},
    x: {type: 'list', doc: '{min, max, ticks?, labels?, title?}: the horizontal scale, its tick values, their printed labels, and its title'},
    y: {type: 'list', doc: '{min, max, ticks?, labels?, title?}: the vertical scale, the same'},
    refs: {type: 'list', default: [], doc: '[{axis: "x" | "y", value, label}]: a reference line across the plot: a baseline, a target, an axis of symmetry'},
    marks: {type: 'list', default: [], doc: '[{at: [x, y], label, side?}]: a named point: a peak, a vertex, an equilibrium; side "left" sets the label above it, ending at the point (for a point at the right edge)'},
    draw: {type: 'progress', default: 1, doc: '0 to 1: how much of each line is drawn, left to right'},
    ymax: {type: 'number', default: 0, doc: 'tween it to rescale the vertical axis live (0: y.max); ticks above it fade out, lines above it are cut at the top'},
    head: {type: 'text', default: '', doc: 'while a line draws, a tag riding its tip with the value there, "{v}" replaced: "{v} days"; decimals follow the data'},
    values: {type: 'boolean', default: false, doc: 'print each drawn point\'s value above it (the focused series, or the only one)'},
    marked: {type: 'progress', default: 1, doc: '0 to 1: the marks and reference lines appearing'},
    focus: {type: 'number', default: -1, doc: 'the line being spoken about; the others go grey. -1: none'},
    note: {type: 'text', default: '', doc: 'one line under the plot: the unit or the source'},
    label: {type: 'text', default: '', doc: 'the module label'},
    index: {type: 'text', default: '', doc: 'the module index'},
    col: {type: 'number', default: 1, doc: 'the first column'},
    span: {type: 'number', default: 7, doc: 'how many columns'},
    top: {type: 'px', default: 360, doc: 'its top edge'},
    height: {type: 'px', default: 400, doc: 'the plot\'s height, axes and labels included'},
  },
  preview: 25.6,
};

type Axis = {min: number; max: number; ticks?: number[]; labels?: string[]; title?: string};
type Series = {label: string; points: number[][]; dash?: boolean; dots?: boolean};
type Ref = {axis: string; value: number; label: string};
type Mark = {at: number[]; label: string; side?: string};

const L = 92;  // room for the y labels
const B = 52;  // room for the x labels
const R = 24;

export function Plot({series, x, y, refs = [], marks = [], draw = 1, ymax = 0, head = '', values = false, marked = 1, focus = -1, note = '', label = '', index = '', col = 1, span = 7, top = 360, height = 400}: {series: Series[]; x: Axis; y: Axis; refs?: Ref[]; marks?: Mark[]; draw?: number; ymax?: number; head?: string; values?: boolean; marked?: number; focus?: number; note?: string; label?: string; index?: string; col?: number; span?: number; top?: number; height?: number}) {
  const W = spanW(span);
  const pw = W - L - R;
  const ph = height - B - 14;
  const px = (v: number) => L + ((v - x.min) / (x.max - x.min)) * pw;
  const yTop = ymax > y.min ? ymax : y.max;
  const clip = `plot-${col}-${top}-${span}`;
  const py = (v: number) => 14 + (1 - (v - y.min) / (yTop - y.min)) * ph;
  // a tick shows while it is on the scale and not crowded against zero (it fades as the axis rescales past it)
  const seen = (v: number) => Math.min(unit(1 - (v - yTop) / (yTop * 0.08 || 1)), v <= y.min ? 1 : unit(((v - y.min) / ((yTop - y.min) || 1) - 0.09) / 0.03));
  const d = unit(draw);
  const m = unit(marked);
  const xTicks = x.ticks ?? [x.min, x.max];
  const yTicks = (y.ticks ?? [y.min, y.max]).map((t, i) => ({t, i})).filter((k) => k.t <= yTop * 1.0001 && seen(k.t) > 0);
  // the drawn part of a line: every point left of the cut, and the cut itself
  const cut = x.min + (x.max - x.min) * d;
  const path = (pts: number[][]) => {
    const out: number[][] = [];
    for (let i = 0; i < pts.length; i++) {
      if (pts[i][0] <= cut) { out.push(pts[i]); continue; }
      const a = pts[i - 1];
      if (a) { const t = (cut - a[0]) / (pts[i][0] - a[0]); out.push([cut, a[1] + (pts[i][1] - a[1]) * t]); }
      break;
    }
    // cut the line where it leaves the top of the scale (while the axis is rescaling), and start again where it comes back
    let d = '', pen = false;
    for (let i = 0; i < out.length; i++) {
      const [x1, y1] = out[i];
      if (i === 0) { if (y1 <= yTop) { d += `M${px(x1).toFixed(1)} ${py(y1).toFixed(1)}`; pen = true; } continue; }
      const [x0, y0] = out[i - 1];
      const at = (yy: number) => x0 + (x1 - x0) * ((yy - y0) / (y1 - y0));
      if (y0 <= yTop && y1 <= yTop) d += `${pen ? 'L' : 'M'}${px(x1).toFixed(1)} ${py(y1).toFixed(1)}`;
      else if (y0 <= yTop) d += `${pen ? 'L' : 'M'}${px(at(yTop)).toFixed(1)} ${py(yTop).toFixed(1)}`;
      else if (y1 <= yTop) d += `M${px(at(yTop)).toFixed(1)} ${py(yTop).toFixed(1)}L${px(x1).toFixed(1)} ${py(y1).toFixed(1)}`;
      pen = y1 <= yTop;
    }
    return d;
  };
  const order = series.map((_, i) => i).sort((a, b) => (a === focus ? 1 : 0) - (b === focus ? 1 : 0));
  return (
    <Module col={col} span={span} top={top} index={index} label={label}>
      <div style={{position: 'relative', height, marginTop: 18}}>
        <svg width={W} height={height} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          {yTicks.map(({t, i}) => <line key={`y${i}`} x1={L} x2={L + pw} y1={py(t)} y2={py(t)} stroke="var(--color-faint)" strokeWidth={1} opacity={seen(t)} />)}
          <clipPath id={clip}><rect x={L} y={0} width={pw + R} height={14 + ph} /></clipPath>
          {xTicks.map((t, i) => <line key={`x${i}`} x1={px(t)} x2={px(t)} y1={14 + ph} y2={14 + ph + 10} stroke="var(--color-text)" strokeWidth={2} />)}
          {refs.map((r, i) => r.axis === 'x'
            ? <line key={`r${i}`} x1={px(r.value)} x2={px(r.value)} y1={14} y2={14 + ph} stroke="var(--color-text)" strokeWidth={2} strokeDasharray="10 8" opacity={m} />
            : <line key={`r${i}`} x1={L} x2={L + pw} y1={py(r.value)} y2={py(r.value)} stroke="var(--color-text)" strokeWidth={2} strokeDasharray="10 8" opacity={m} />)}
          <g clipPath={`url(#${clip})`}>
          {order.map((i) => {
            const s = series[i];
            const on = i === focus;
            const dim = focus >= 0 && !on;
            if (s.dots) {
              // a scatter: each point a square, set as the cut passes it; the focused series in yellow
              return (
                <g key={i}>
                  {s.points.filter((q) => q[0] <= cut && q[1] <= yTop).map((q, k) => <rect key={k} x={px(q[0]) - 8} y={py(q[1]) - 8} width={16} height={16}
                    fill={on ? 'var(--color-data)' : dim ? 'var(--color-panel)' : 'var(--color-text)'} stroke={dim ? 'var(--color-muted)' : 'var(--color-text)'} strokeWidth={on || dim ? 3 : 0} />)}
                </g>
              );
            }
            const p = path(s.points);
            return (
              <g key={i}>
                {on && <path d={p} fill="none" stroke="var(--color-data)" strokeWidth={18} strokeLinejoin="round" strokeLinecap="square" />}
                <path d={p} fill="none" stroke={dim ? 'var(--color-muted)' : 'var(--color-text)'} strokeWidth={on ? 5 : 3.5} strokeLinejoin="round" strokeDasharray={s.dash ? '12 9' : undefined} opacity={dim ? 0.7 : 1} />
              </g>
            );
          })}
          </g>
          <line x1={L} x2={L + pw} y1={14 + ph} y2={14 + ph} stroke="var(--color-text)" strokeWidth={3} />
          <line x1={L} x2={L} y1={14} y2={14 + ph} stroke="var(--color-text)" strokeWidth={3} />
          {marks.map((k, i) => <rect key={`m${i}`} x={px(k.at[0]) - 9} y={py(k.at[1]) - 9} width={18} height={18} fill={focus >= 0 ? 'var(--color-panel)' : 'var(--color-data)'} stroke="var(--color-text)" strokeWidth={3} opacity={m} />)}
        </svg>
        {yTicks.map(({t, i}) => (
          <div key={`yl${i}`} style={{position: 'absolute', right: W - L + 14, top: py(t), transform: 'translateY(-50%)', opacity: seen(t), fontFamily: 'var(--font-mono)', fontSize: 26, color: 'var(--color-text)', whiteSpace: 'nowrap'}}>{y.labels?.[i] ?? num(t)}</div>
        ))}
        {xTicks.map((t, i) => (
          <div key={`xl${i}`} style={{position: 'absolute', left: px(t), top: 14 + ph + 14, transform: 'translateX(-50%)', fontFamily: 'var(--font-mono)', fontSize: 26, color: 'var(--color-text)', whiteSpace: 'nowrap'}}>{x.labels?.[i] ?? num(t)}</div>
        ))}
        {y.title && <div style={{position: 'absolute', left: L + 14, top: 2, fontFamily: 'var(--font-mono)', fontSize: 26, color: 'var(--color-muted)', background: 'var(--color-bg)', padding: '0 6px'}}>{y.title}</div>}
        {x.title && <div style={{position: 'absolute', right: R, top: 14 + ph - 38, fontFamily: 'var(--font-mono)', fontSize: 26, color: 'var(--color-muted)', background: 'var(--color-bg)', padding: '0 6px'}}>{x.title}</div>}
        {refs.map((r, i) => (
          <div key={`rl${i}`} style={{position: 'absolute', opacity: m, whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)', fontSize: 27, fontWeight: 700, color: 'var(--color-text)', background: 'var(--color-bg)', padding: '0 8px',
            ...(r.axis === 'x' ? {left: px(r.value) + 8, top: 18} : {right: R, top: py(r.value) - 36})}}>{r.label}</div>
        ))}
        {series.map((s, i) => {
          const last = s.points[s.points.length - 1];
          const on = i === focus;
          if (!last || !s.label || d < 0.98) return null;
          return <div key={`sl${i}`} style={{position: 'absolute', right: Math.max(0, W - px(last[0]) - 4), top: py(last[1]) - 50, whiteSpace: 'nowrap',
            fontFamily: 'var(--font-sans)', fontSize: 27, fontWeight: on ? 800 : 600, color: focus >= 0 && !on ? 'var(--color-muted)' : 'var(--color-text)', background: on ? 'var(--color-data)' : 'var(--color-bg)', padding: '0 8px'}}>{s.label}</div>;
        })}
        {values && series.map((s, i) => (focus < 0 ? series.length === 1 : i === focus) && s.points.filter((q) => q[0] <= cut + 1e-9 && q[1] <= yTop).map((q, k) => (
          <div key={`v${i}-${k}`} style={{position: 'absolute', left: px(q[0]), top: py(q[1]) - 50, transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)', fontSize: 30, fontWeight: 760,
            color: 'var(--color-text)', background: 'var(--color-bg)', padding: '0 6px', fontVariantNumeric: 'tabular-nums'}}>{num(q[1])}</div>
        )))}
        {head && d > 0 && d < 1 && (() => {
          const s = series[focus >= 0 ? focus : 0];
          const pts = s.points;
          let v = pts[0][1];
          for (let k = 1; k < pts.length; k++) if (pts[k][0] >= cut) { const a = pts[k - 1]; v = a[1] + (pts[k][1] - a[1]) * ((cut - a[0]) / (pts[k][0] - a[0])); break; } else v = pts[k][1];
          const dec = Math.max(...pts.map((q) => (String(q[1]).split('.')[1] ?? '').length));
          return (
            <>
              <div style={{position: 'absolute', left: px(cut) - 11, top: py(Math.min(v, yTop)) - 11, width: 22, height: 22, background: 'var(--color-data)', boxShadow: 'inset 0 0 0 4px var(--color-text)'}} />
              <div style={{position: 'absolute', ...(px(cut) > W - 300 ? {right: W - px(cut) + 20} : {left: px(cut) + 20}), top: py(Math.min(v, yTop)) < 90 ? py(Math.min(v, yTop)) + 22 : py(Math.min(v, yTop)) - 62, whiteSpace: 'nowrap', fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 800, letterSpacing: '-0.02em',
                color: 'var(--color-text)', background: 'var(--color-bg)', padding: '0 8px', fontVariantNumeric: 'tabular-nums'}}>{head.replace('{v}', v.toFixed(dec))}</div>
            </>
          );
        })()}
        {marks.map((k, i) => (
          <div key={`ml${i}`} style={{position: 'absolute', ...(k.side === 'left' ? {top: py(k.at[1]) - 62, right: W - px(k.at[0]) - 9} : {top: py(k.at[1]) - 18, left: px(k.at[0]) + 20}), opacity: m, whiteSpace: 'nowrap',
            fontFamily: 'var(--font-sans)', fontSize: 28, fontWeight: 760, color: 'var(--color-text)', background: 'var(--color-bg)', boxShadow: 'inset 0 0 0 2px var(--color-text)', padding: '0 10px', lineHeight: '36px'}}>{k.label}</div>
        ))}
      </div>
      {note && <div style={{fontFamily: 'var(--font-mono)', fontSize: 25, color: 'var(--color-muted)', marginTop: 8}}>{note}</div>}
    </Module>
  );
}
