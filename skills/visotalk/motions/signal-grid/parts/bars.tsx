import React from 'react';
import {Module, num, unit} from './sheet.tsx';

export const meta = {
  name: {en: 'Bar table', 'zh-CN': '条形表'},
  purpose: 'data',
  line: 'Bars across or up, single, grouped, stacked or racing, a dashed target; the one said in yellow.',
  fits: 'rankings, years, parts of a total, actual against target, a ranking over time',
  params: {
    rows: {type: 'list', doc: '[{label, value, shown?, from?} or {label, values: [..], shown?}]: the bar\'s name, its number (or one per series), and the figure as printed ("18.2%"); without shown the value is printed with every decimal it has'},
    series: {type: 'list', default: [], doc: 'the names of the values when rows carry several: ["2023", "2024"]; set as a key under the bars'},
    stack: {type: 'boolean', default: false, doc: 'several values: stacked into one bar (parts of a total) instead of side by side'},
    lit: {type: 'number', default: -1, doc: 'several values: which one of the focused bar takes the yellow; -1: the last'},
    target: {type: 'list', default: null, doc: '{value, label}: a dashed line at a target or a threshold, named'},
    morph: {type: 'progress', default: 1, doc: 'rows with `from`: 0 to 1, each bar runs from its from value to its value and the rows re-rank as they pass each other (a ranking over time)'},
    orient: {type: 'text', default: 'rows', doc: '"rows" (bars across, for names) or "columns" (bars up, for time)'},
    focus: {type: 'number', default: -1, doc: 'the bar being spoken about; -1: none'},
    grow: {type: 'progress', default: 1, doc: '0 to 1: how far the bars have grown'},
    scale: {type: 'text', default: 'linear', doc: '"linear" from zero, or "log" when the values span orders of magnitude (say so in the note); single values only'},
    note: {type: 'text', default: '', doc: 'one line under the bars: the unit, the source, "log scale"'},
    label: {type: 'text', default: '', doc: 'the module label'},
    index: {type: 'text', default: '', doc: 'the module index'},
    col: {type: 'number', default: 8, doc: 'the first column'},
    span: {type: 'number', default: 5, doc: 'how many columns'},
    top: {type: 'px', default: 360, doc: 'its top edge'},
    height: {type: 'px', default: 380, doc: 'the bars\' height, for columns'},
  },
  preview: 56.6,
};

type Row = {label: string; value?: number; values?: number[]; shown?: string; from?: number};
type Target = {value: number; label: string};

// series fills: ink, grey, then paper outlined; the lit one is yellow
const FILL = ['var(--color-text)', 'var(--color-muted)', 'var(--color-panel)'];

export function Bars({rows, series = [], stack = false, lit = -1, target = null, morph = 1, orient = 'rows', focus = -1, grow = 1, scale = 'linear', note = '', label = '', index = '', col = 8, span = 5, top = 360, height = 380}: {rows: Row[]; series?: string[]; stack?: boolean; lit?: number; target?: Target | null; morph?: number; orient?: string; focus?: number; grow?: number; scale?: string; note?: string; label?: string; index?: string; col?: number; span?: number; top?: number; height?: number}) {
  const g = unit(grow);
  const vals = (r: Row) => r.values ?? [r.value ?? 0];
  const multi = rows.some((r) => (r.values?.length ?? 0) > 1);
  const log = scale === 'log' && !multi;
  const f = (v: number) => (log ? Math.log10(Math.max(1, v)) + 0.35 : Math.max(0, v));
  const extent = (r: Row) => (stack ? vals(r).reduce((a, b) => a + Math.max(0, b), 0) : Math.max(...vals(r).map(f)));
  const max = Math.max(...rows.map(extent), target ? f(target.value) : 0) || 1;
  const text = (r: Row) => r.shown ?? (stack ? num(vals(r).reduce((a, b) => a + b, 0)) : vals(r).map(num).join(' · '));
  const n = rows.length;
  const k = Math.max(...rows.map((r) => vals(r).length));
  const litK = (lit < 0 ? k - 1 : lit);
  const segStyle = (i: number, j: number): React.CSSProperties => {
    const on = i === focus && (!multi || j === litK);
    return {background: on ? 'var(--color-data)' : FILL[j % FILL.length], opacity: on || multi ? 1 : 0.86,
      boxShadow: on || j % FILL.length === 2 ? 'inset 0 0 0 3px var(--color-text)' : 'none'};
  };
  const key = series.length > 0 && (
    <div style={{display: 'flex', gap: 28, marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 26, color: 'var(--color-text)'}}>
      {series.map((s, j) => <span key={j} style={{display: 'flex', alignItems: 'center', gap: 10}}><span style={{width: 22, height: 22, ...segStyle(-1, j)}} />{s}</span>)}
    </div>
  );
  const foot = note && <div style={{fontFamily: 'var(--font-mono)', fontSize: 26, color: 'var(--color-muted)', marginTop: 12}}>{note}</div>;
  const targetLabel = target && <span style={{fontFamily: 'var(--font-sans)', fontSize: 26, fontWeight: 700, background: 'var(--color-bg)', padding: '0 8px', whiteSpace: 'nowrap', opacity: g}}>{target.label}</span>;

  if (rows.some((r) => r.from !== undefined)) {
    // a race: values run from `from` to `value`, and each row slides from its old rank to its new one
    const mp = unit(morph);
    const ease = mp * mp * (3 - 2 * mp);
    const now = rows.map((r) => (r.from ?? r.value ?? 0) + ((r.value ?? 0) - (r.from ?? r.value ?? 0)) * ease);
    const rank = (xs: number[]) => { const o = xs.map((_, i) => i).sort((a, b) => xs[b] - xs[a]); const out: number[] = []; o.forEach((i, k) => { out[i] = k; }); return out; };
    const r0 = rank(rows.map((r) => r.from ?? r.value ?? 0)), r1 = rank(rows.map((r) => r.value ?? 0));
    const top3 = Math.max(...rows.map((r) => Math.max(r.from ?? 0, r.value ?? 0))) || 1;
    const rh = Math.min(74, Math.floor(440 / n));
    const dec = (r: Row) => (String(r.value ?? 0).split('.')[1] ?? '').length;
    return (
      <Module col={col} span={span} top={top} index={index} label={label}>
        <div style={{position: 'relative', height: rh * n, marginTop: 18}}>
          {rows.map((r, i) => {
            const on = i === focus;
            const y = (r0[i] + (r1[i] - r0[i]) * ease) * rh;
            const w = ((Math.max(0, now[i]) / top3) * 100 * g * 0.62).toFixed(2);
            return (
              <div key={i} style={{position: 'absolute', left: 0, right: 0, top: y, height: rh, display: 'grid', gridTemplateColumns: '220px 1fr', columnGap: 20, alignItems: 'center', borderBottom: '1px solid var(--color-faint)'}}>
                <div style={{fontFamily: 'var(--font-mono)', fontSize: 27, fontWeight: on ? 700 : 400, color: 'var(--color-text)', lineHeight: 1.1}}>{r.label}</div>
                <div style={{position: 'relative', height: rh, borderLeft: '3px solid var(--color-text)'}}>
                  <div style={{position: 'absolute', left: 0, top: rh * 0.25, height: rh * 0.5, width: `calc(${w}% + 3px)`, ...segStyle(i, 0)}} />
                  <div style={{position: 'absolute', left: `calc(${w}% + 18px)`, top: 0, height: rh, display: 'flex', alignItems: 'center', fontFamily: 'var(--font-sans)', fontSize: 29, fontWeight: on ? 800 : 500,
                    whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', opacity: g}}>{mp >= 1 ? text(r) : num(Number(now[i].toFixed(dec(r))))}</div>
                </div>
              </div>
            );
          })}
        </div>
        {foot}
      </Module>
    );
  }

  if (orient === 'columns') {
    const small = n > 8;
    const ph = height - 56;
    return (
      <Module col={col} span={span} top={top} index={index} label={label}>
        <div style={{position: 'relative', display: 'flex', alignItems: 'flex-end', gap: small ? 10 : 18, height, marginTop: 20, borderBottom: '3px solid var(--color-text)'}}>
          {target && (
            <div style={{position: 'absolute', left: 0, right: 0, bottom: (f(target.value) / max) * ph, borderTop: '3px dashed var(--color-text)', zIndex: 1}}>
              <div style={{position: 'absolute', right: 0, bottom: 4}}>{targetLabel}</div>
            </div>
          )}
          {rows.map((r, i) => {
            const on = i === focus;
            const v = vals(r);
            return (
              <div key={i} style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%'}}>
                <div style={{fontFamily: 'var(--font-sans)', fontSize: small ? 24 : 28, fontWeight: on ? 800 : 500, whiteSpace: 'nowrap', marginBottom: 8, opacity: g, fontVariantNumeric: 'tabular-nums',
                  padding: on && !multi ? '0 6px' : 0, background: on && !multi ? 'var(--color-data)' : 'transparent'}}>{text(r)}</div>
                <div style={{width: '100%', display: 'flex', flexDirection: stack ? 'column-reverse' : 'row', alignItems: 'flex-end', gap: stack ? 0 : 4}}>
                  {v.map((x, j) => <div key={j} style={{flex: stack ? 'none' : 1, width: stack ? '100%' : undefined, height: (f(x) / max) * ph * g, ...segStyle(i, j)}} />)}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{display: 'flex', gap: small ? 10 : 18, marginTop: 10}}>
          {rows.map((r, i) => <div key={i} style={{flex: 1, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: small ? 23 : 26, fontWeight: i === focus ? 700 : 400, color: 'var(--color-text)', lineHeight: 1.2}}>{r.label}</div>)}
        </div>
        {key}
        {foot}
      </Module>
    );
  }

  const rh = Math.min(multi && !stack ? 96 : 74, Math.floor(440 / n));
  const pct = (x: number) => ((f(x) / max) * 100 * g * 0.66).toFixed(2);
  return (
    <Module col={col} span={span} top={top} index={index} label={label}>
      <div style={{position: 'relative', display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 28, marginTop: target ? 46 : 18}}>
        {rows.map((r, i) => {
          const on = i === focus;
          const v = vals(r);
          const end = stack ? v.reduce((a, b) => a + f(b), 0) : Math.max(...v.map(f));
          const endPct = ((end / max) * 100 * g * 0.66).toFixed(2);
          const bh = stack || v.length === 1 ? rh * 0.5 : (rh * 0.7) / v.length;
          return (
            <React.Fragment key={i}>
              <div style={{display: 'flex', alignItems: 'center', height: rh, borderBottom: '1px solid var(--color-faint)', fontFamily: 'var(--font-mono)', fontSize: 27, fontWeight: on ? 700 : 400, color: 'var(--color-text)', whiteSpace: 'nowrap'}}>{r.label}</div>
              <div style={{position: 'relative', height: rh, borderBottom: '1px solid var(--color-faint)', borderLeft: '3px solid var(--color-text)'}}>
                {stack ? (
                  <div style={{position: 'absolute', left: 0, top: (rh - bh) / 2, height: bh, width: `${endPct}%`, display: 'flex'}}>
                    {v.map((x, j) => <div key={j} style={{width: `${((f(x) / (end || 1)) * 100).toFixed(2)}%`, height: '100%', ...segStyle(i, j)}} />)}
                  </div>
                ) : v.map((x, j) => (
                  <div key={j} style={{position: 'absolute', left: 0, top: (rh - bh * v.length) / 2 + j * bh, height: bh - (v.length > 1 ? 3 : 0), width: `calc(${pct(x)}% + 3px)`, ...segStyle(i, j)}} />
                ))}
                {target && (
                  <div style={{position: 'absolute', left: `${((f(target.value) / max) * 100 * 0.66).toFixed(2)}%`, top: 0, bottom: -1, borderLeft: '3px dashed var(--color-text)', opacity: g}}>
                    {i === 0 && <div style={{position: 'absolute', left: 8, top: -34}}>{targetLabel}</div>}
                  </div>
                )}
                <div style={{position: 'absolute', left: `calc(${endPct}% + 18px)`, top: 0, height: rh, display: 'flex', alignItems: 'center', fontFamily: 'var(--font-sans)', fontSize: 29, fontWeight: on ? 800 : 500,
                  color: 'var(--color-text)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', opacity: g}}>{text(r)}</div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
      {key}
      {foot}
    </Module>
  );
}
