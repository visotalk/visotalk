import React from 'react';
import {Module, num, spanW, unit} from './sheet.tsx';

export const meta = {
  name: {en: 'Share', 'zh-CN': '占比'},
  purpose: 'data',
  line: 'Parts of a whole as a cut bar, a grid of 100 cells or icons, or a ring.',
  fits: 'market shares, survey answers, one in four people',
  params: {
    items: {type: 'list', doc: '[{label, value, shown?}]: each part, its amount (shares of the total are computed), and the figure as printed ("21.6%")'},
    kind: {type: 'text', default: 'bar', doc: '"bar" (one bar across the module), "grid" (100 cells, each share rounded to whole cells: the printed figures stay exact) or "ring"'},
    icon: {type: 'text', default: 'square', doc: 'a grid: each cell drawn as a "square", a "dot" or a "person" (for people: one in four adults)'},
    focus: {type: 'number', default: -1, doc: 'the part being said; -1: none'},
    fill: {type: 'progress', default: 1, doc: '0 to 1: how much of the whole is filled, part after part'},
    center: {type: 'text', default: '', doc: 'a ring: the figure in its middle'},
    note: {type: 'text', default: '', doc: 'one line under it: the total, the source, the year'},
    label: {type: 'text', default: '', doc: 'the module label'},
    index: {type: 'text', default: '', doc: 'the module index'},
    col: {type: 'number', default: 1, doc: 'the first column'},
    span: {type: 'number', default: 6, doc: 'how many columns'},
    top: {type: 'px', default: 360, doc: 'its top edge'},
    height: {type: 'px', default: 360, doc: 'a grid or a ring: its height'},
  },
  preview: 7.4,
};

type Item = {label: string; value: number; shown?: string};

// fills by part: ink, grey, paper outlined, light grey; the focused part is yellow
const FILL = ['var(--color-text)', 'var(--color-muted)', 'var(--color-panel)', 'var(--color-panel2)'];
const fillOf = (j: number, focus: number) => (j === focus ? 'var(--color-data)' : FILL[j % FILL.length]);
const edge = (j: number, focus: number) => (j === focus || j % FILL.length >= 2 ? 'inset 0 0 0 3px var(--color-text)' : 'none');

/** Whole cells per part out of 100, by largest remainder, so they always sum to 100 */
function cells(shares: number[]) {
  const raw = shares.map((s) => s * 100);
  const out = raw.map(Math.floor);
  const order = raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < 100 - out.reduce((a, b) => a + b, 0); k++) out[order[k % order.length][1]]++;
  return out;
}

export function Share({items, kind = 'bar', icon = 'square', focus = -1, fill = 1, center = '', note = '', label = '', index = '', col = 1, span = 6, top = 360, height = 360}: {items: Item[]; kind?: string; icon?: string; focus?: number; fill?: number; center?: string; note?: string; label?: string; index?: string; col?: number; span?: number; top?: number; height?: number}) {
  const total = items.reduce((a, b) => a + Math.max(0, b.value), 0) || 1;
  const shares = items.map((it) => Math.max(0, it.value) / total);
  const p = unit(fill);
  const text = (it: Item, j: number) => it.shown ?? `${num(Math.round(shares[j] * 1000) / 10)}%`;
  const legend = (column: boolean) => (
    <div style={{display: 'flex', flexDirection: column ? 'column' : 'row', flexWrap: 'wrap', columnGap: 30, rowGap: column ? 14 : 10, marginTop: column ? 0 : 18}}>
      {items.map((it, j) => (
        <div key={j} style={{display: 'flex', alignItems: 'baseline', gap: 10, fontFamily: 'var(--font-sans)', fontSize: 28, fontWeight: j === focus ? 780 : 520, color: 'var(--color-text)'}}>
          <span style={{alignSelf: 'center', width: 22, height: 22, flex: 'none', background: fillOf(j, focus), boxShadow: edge(j, focus)}} />
          <span>{it.label}</span><span style={{fontVariantNumeric: 'tabular-nums', fontWeight: 760}}>{text(it, j)}</span>
        </div>
      ))}
    </div>
  );
  const foot = note && <div style={{marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 26, color: 'var(--color-muted)'}}>{note}</div>;

  if (kind === 'grid') {
    const per = cells(shares);
    const owner: number[] = [];
    per.forEach((c, j) => { for (let k = 0; k < c; k++) owner.push(j); });
    const size = Math.min(height, spanW(span) * 0.6);
    const gap = Math.max(3, Math.round(size / 90));
    const cell = (size - 9 * gap) / 10;
    return (
      <Module col={col} span={span} top={top} index={index} label={label}>
        <div style={{display: 'flex', gap: 36, alignItems: 'flex-start', marginTop: 20}}>
          <div style={{position: 'relative', width: size, height: size, flex: 'none'}}>
            {owner.map((j, k) => {
              const on = k < Math.round(p * 100);
              const box = {position: 'absolute' as const, left: (k % 10) * (cell + gap), top: Math.floor(k / 10) * (cell + gap), width: cell, height: cell};
              if (icon === 'square') return <div key={k} style={{...box, boxSizing: 'border-box', background: on ? fillOf(j, focus) : 'transparent', boxShadow: on ? edge(j, focus) : 'inset 0 0 0 1px var(--color-faint)'}} />;
              const fillC = on ? fillOf(j, focus) : 'none';
              const stroke = on && (j === focus || j % FILL.length >= 2) ? 'var(--color-text)' : on ? 'none' : 'var(--color-faint)';
              return (
                <svg key={k} viewBox="0 0 20 20" style={box}>
                  {icon === 'dot'
                    ? <circle cx={10} cy={10} r={8.5} fill={fillC} stroke={stroke} strokeWidth={1.6} />
                    : <path d="M10 1.5a3.6 3.6 0 1 1 0 7.2a3.6 3.6 0 1 1 0-7.2ZM3.5 19v-4.6c0-2.6 2.2-4.4 6.5-4.4s6.5 1.8 6.5 4.4V19Z" fill={fillC} stroke={stroke} strokeWidth={1.4} />}
                </svg>
              );
            })}
          </div>
          <div style={{flex: 1}}>
            {legend(true)}
            {foot}
          </div>
        </div>
      </Module>
    );
  }

  if (kind === 'ring') {
    const size = Math.min(height, spanW(span) * 0.55);
    const r = size / 2 - 30, c = size / 2, w = 52;
    let acc = 0;
    return (
      <Module col={col} span={span} top={top} index={index} label={label}>
        <div style={{display: 'flex', gap: 36, alignItems: 'center', marginTop: 20}}>
          <div style={{position: 'relative', width: size, height: size, flex: 'none'}}>
            <svg width={size} height={size}>
              <circle cx={c} cy={c} r={r} fill="none" stroke="var(--color-faint)" strokeWidth={1} />
              {shares.map((s, j) => {
                const a0 = acc, a1 = acc + s; acc = a1;
                const shown = Math.max(0, Math.min(a1, p) - a0);
                if (shown <= 0) return null;
                const arc = (t: number) => [c + r * Math.sin(2 * Math.PI * t), c - r * Math.cos(2 * Math.PI * t)];
                const [x0, y0] = arc(a0), [x1, y1] = arc(a0 + shown - (shown >= 0.9999 ? 0.0001 : 0));
                const d = `M${x0} ${y0} A${r} ${r} 0 ${shown > 0.5 ? 1 : 0} 1 ${x1} ${y1}`;
                return (
                  <g key={j}>
                    {(j === focus || j % FILL.length >= 2) && <path d={d} fill="none" stroke="var(--color-text)" strokeWidth={w + 6} />}
                    <path d={d} fill="none" stroke={fillOf(j, focus)} strokeWidth={j === focus || j % FILL.length >= 2 ? w - 2 : w} />
                  </g>
                );
              })}
            </svg>
            {center && <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: Math.round(size * 0.17), fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-text)'}}>{center}</div>}
          </div>
          <div style={{flex: 1}}>
            {legend(true)}
            {foot}
          </div>
        </div>
      </Module>
    );
  }

  // bar: one bar across the module, parts left to right, each figure under its part
  let left = 0;
  return (
    <Module col={col} span={span} top={top} index={index} label={label}>
      <div style={{position: 'relative', height: 84, marginTop: 24, boxShadow: 'inset 0 0 0 1px var(--color-faint)'}}>
        {shares.map((s, j) => {
          const l = left; left += s;
          const w = Math.max(0, Math.min(l + s, p) - l);
          return w > 0 ? <div key={j} style={{position: 'absolute', left: `${(l * 100).toFixed(3)}%`, width: `${(w * 100).toFixed(3)}%`, top: 0, bottom: 0, background: fillOf(j, focus), boxShadow: edge(j, focus)}} /> : null;
        })}
      </div>
      {legend(false)}
      {foot}
    </Module>
  );
}
