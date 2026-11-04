import React from 'react';
import {Module, spanW, unit} from './sheet.tsx';

export const meta = {
  name: {en: 'Labelled figure', 'zh-CN': '标注图'},
  purpose: 'term',
  line: 'A flat ink-line figure from simple shapes, drawn stroke by stroke, parts on numbered leaders.',
  fits: 'a triangle, a circuit, a cell, an orbit, a machine',
  params: {
    shapes: {type: 'list', doc: '[{type, …, fill?, dash?, part?}]: type "circle" {cx, cy, r}, "ellipse" {cx, cy, rx, ry}, "rect" {x, y, w, h}, "line" {x1, y1, x2, y2}, "path" {d}, "polygon" / "polyline" {points: "x,y x,y"}, "arrow" {x1, y1, x2, y2}, or "text" {x, y, text}; fill "none", "paper", "ink", "faint" or "signal"; part: the label it belongs to, filled in the signal when that label is the focus'},
    labels: {type: 'list', default: [], doc: '[{text, at: [x, y], pos: [x, y]}]: a part\'s name set at pos, its leader running to at, numbered in order'},
    box: {type: 'list', default: [100, 60], doc: '[width, height]: the units the shapes are drawn in; the figure is scaled to fit the module'},
    draw: {type: 'progress', default: 1, doc: '0 to 1: how much of the figure is drawn, shape after shape'},
    shown: {type: 'number', default: 99, doc: 'how many labels are set'},
    focus: {type: 'number', default: -1, doc: 'the label being said, from 0; its parts fill with the signal. -1: none'},
    label: {type: 'text', default: '', doc: 'the module label'},
    index: {type: 'text', default: '', doc: 'the module index'},
    col: {type: 'number', default: 1, doc: 'the first column'},
    span: {type: 'number', default: 6, doc: 'how many columns'},
    top: {type: 'px', default: 360, doc: 'its top edge'},
    height: {type: 'px', default: 440, doc: 'the figure\'s height'},
  },
  preview: 6.2,
};

type Shape = {type: string; fill?: string; dash?: boolean; part?: number; [k: string]: unknown};
type Label = {text: string; at: number[]; pos: number[]};

const FILLS: Record<string, string> = {none: 'none', paper: 'var(--color-panel)', ink: 'var(--color-text)', faint: 'var(--color-panel2)', signal: 'var(--color-data)'};

export function Diagram({shapes, labels = [], box = [100, 60], draw = 1, shown = 99, focus = -1, label = '', index = '', col = 1, span = 6, top = 360, height = 440}: {shapes: Shape[]; labels?: Label[]; box?: number[]; draw?: number; shown?: number; focus?: number; label?: string; index?: string; col?: number; span?: number; top?: number; height?: number}) {
  const W = spanW(span);
  const s = Math.min(W / box[0], height / box[1]);
  const ox = (W - box[0] * s) / 2;
  const oy = (height - box[1] * s) / 2;
  const X = (v: number) => ox + v * s;
  const Y = (v: number) => oy + v * s;
  const d = unit(draw);
  const n = shapes.length;
  const g = (k: string, sh: Shape) => Number(sh[k] ?? 0);
  return (
    <Module col={col} span={span} top={top} index={index} label={label}>
      <div style={{position: 'relative', height, marginTop: 18}}>
        <svg width={W} height={height} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <g transform={`translate(${ox.toFixed(2)} ${oy.toFixed(2)}) scale(${s.toFixed(4)})`}>
            {shapes.map((sh, i) => {
              // each shape is drawn in its own slice of `draw`, then filled
              const p = unit(d * n - i);
              if (p <= 0 || sh.type === 'text') return null;
              const on = sh.part !== undefined && sh.part === focus;
              const fill = on ? FILLS.signal : FILLS[sh.fill ?? 'none'] ?? 'none';
              const common = {pathLength: 1, fill, fillOpacity: unit(p * 2 - 1), stroke: 'var(--color-text)', strokeWidth: 3.5 / s,
                strokeDasharray: sh.dash || p >= 1 ? undefined : '1 1', strokeDashoffset: sh.dash || p >= 1 ? undefined : 1 - p, strokeLinejoin: 'round' as const};
              const dashed = sh.dash ? {strokeDasharray: `${(10 / s).toFixed(2)} ${(8 / s).toFixed(2)}`, opacity: p} : {};
              if (sh.type === 'circle') return <circle key={i} cx={g('cx', sh)} cy={g('cy', sh)} r={g('r', sh)} {...common} {...dashed} />;
              if (sh.type === 'ellipse') return <ellipse key={i} cx={g('cx', sh)} cy={g('cy', sh)} rx={g('rx', sh)} ry={g('ry', sh)} {...common} {...dashed} />;
              if (sh.type === 'rect') return <rect key={i} x={g('x', sh)} y={g('y', sh)} width={g('w', sh)} height={g('h', sh)} {...common} {...dashed} />;
              if (sh.type === 'line') return <line key={i} x1={g('x1', sh)} y1={g('y1', sh)} x2={g('x2', sh)} y2={g('y2', sh)} {...common} {...dashed} />;
              if (sh.type === 'polygon') return <polygon key={i} points={String(sh.points)} {...common} {...dashed} />;
              if (sh.type === 'polyline') return <polyline key={i} points={String(sh.points)} {...common} fill="none" {...dashed} />;
              if (sh.type === 'arrow') {
                const [x1, y1, x2, y2] = [g('x1', sh), g('y1', sh), g('x2', sh), g('y2', sh)];
                const a = Math.atan2(y2 - y1, x2 - x1);
                const h = 16 / s;
                const head = `${x2},${y2} ${x2 - h * Math.cos(a - 0.45)},${y2 - h * Math.sin(a - 0.45)} ${x2 - h * Math.cos(a + 0.45)},${y2 - h * Math.sin(a + 0.45)}`;
                return <g key={i}><line x1={x1} y1={y1} x2={x2} y2={y2} {...common} />{p > 0.95 && <polygon points={head} fill="var(--color-text)" />}</g>;
              }
              return <path key={i} d={String(sh.d)} {...common} {...dashed} />;
            })}
          </g>
          {labels.map((l, i) => i < shown && d > 0.6 && (
            <g key={`l${i}`}>
              <line x1={X(l.at[0])} y1={Y(l.at[1])} x2={X(l.pos[0])} y2={Y(l.pos[1])} stroke="var(--color-text)" strokeWidth={1.5} />
              <rect x={X(l.at[0]) - 5} y={Y(l.at[1]) - 5} width={10} height={10} fill="var(--color-text)" />
            </g>
          ))}
        </svg>
        {shapes.map((sh, i) => sh.type === 'text' && unit(d * n - i) > 0.5 && (
          <div key={`t${i}`} style={{position: 'absolute', left: X(g('x', sh)), top: Y(g('y', sh)), transform: 'translate(-50%, -50%)', whiteSpace: 'nowrap',
            fontFamily: 'var(--font-sans)', fontSize: Number(sh.size ?? 30), fontWeight: 700, color: 'var(--color-text)'}}>{String(sh.text)}</div>
        ))}
        {labels.map((l, i) => {
          if (i >= shown || d <= 0.6) return null;
          const left = l.pos[0] < l.at[0];
          const on = i === focus;
          return (
            <div key={`n${i}`} style={{position: 'absolute', top: Y(l.pos[1]), ...(left ? {right: W - X(l.pos[0]) + 6} : {left: X(l.pos[0]) + 6}), transform: 'translateY(-50%)',
              display: 'flex', alignItems: 'baseline', gap: 10, flexDirection: left ? 'row-reverse' : 'row', maxWidth: Math.max(160, left ? X(l.pos[0]) - 6 : W - X(l.pos[0]) - 6), boxSizing: 'border-box', padding: '2px 10px', background: on ? 'var(--color-data)' : 'var(--color-bg)'}}>
              <span style={{fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, color: 'var(--color-text)'}}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{fontFamily: 'var(--font-sans)', fontSize: 30, fontWeight: on ? 780 : 620, color: 'var(--color-text)'}}>{l.text}</span>
            </div>
          );
        })}
      </div>
    </Module>
  );
}
