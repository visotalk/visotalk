import React from 'react';
import {Marked, Module, unit} from './sheet.tsx';

export const meta = {
  name: {en: 'Working', 'zh-CN': '演算'},
  purpose: 'steps',
  line: 'An equation worked line by line on its equals sign, the changed term blocked.',
  fits: 'a formula with values, a proof, a conversion; 2–5 lines',
  params: {
    steps: {type: 'list', doc: '[{expr, note?}]: each line ("3² + 4² = {25}"), split at its first " = " to align; a {term} in braces is marked; a line starting "= " continues the one above'},
    shown: {type: 'number', default: 99, doc: 'how many lines are set'},
    focus: {type: 'number', default: -1, doc: 'the line being said; its number and {terms} take the signal. -1: none'},
    mark: {type: 'progress', default: 1, doc: '0 to 1: how much of the focused line\'s {terms} is blocked'},
    size: {type: 'px', default: 58, doc: 'the equations\' size'},
    label: {type: 'text', default: '', doc: 'the module label'},
    index: {type: 'text', default: '', doc: 'the module index'},
    col: {type: 'number', default: 1, doc: 'the first column'},
    span: {type: 'number', default: 7, doc: 'how many columns'},
    top: {type: 'px', default: 360, doc: 'its top edge'},
  },
  preview: 25.6,
};

type Step = {expr: string; note?: string};
const s0 = (s: Step) => s.expr.includes('{'); // a line with a {term} blocks the term, not its number

export function Working({steps, shown = 99, focus = -1, mark = 1, size = 58, label = '', index = '', col = 1, span = 7, top = 360}: {steps: Step[]; shown?: number; focus?: number; mark?: number; size?: number; label?: string; index?: string; col?: number; span?: number; top?: number}) {
  const rows = steps.map((s) => {
    const t = s.expr.trim();
    if (t.startsWith('= ')) return {left: '', right: t.slice(2), note: s.note};
    const k = t.indexOf(' = ');
    return k < 0 ? {left: t, right: null as string | null, note: s.note} : {left: t.slice(0, k), right: t.slice(k + 3), note: s.note};
  });
  return (
    <Module col={col} span={span} top={top} index={index} label={label}>
      <div style={{display: 'grid', gridTemplateColumns: '64px max-content max-content 1fr', columnGap: 22, alignItems: 'baseline', marginTop: 20}}>
        {rows.map((r, i) => {
          if (i >= shown) return null;
          const on = i === focus;
          const m = on ? unit(mark) : 0;
          const eq = {fontFamily: 'var(--font-display)', fontSize: size, fontWeight: on ? 700 : 520, lineHeight: 1.45, color: 'var(--color-text)', whiteSpace: 'nowrap' as const, fontVariantNumeric: 'tabular-nums'};
          return (
            <React.Fragment key={i}>
              <div style={{fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, justifySelf: 'start', padding: '2px 8px', background: on && !s0(steps[i]) ? 'var(--color-data)' : 'transparent', boxShadow: on ? 'inset 0 0 0 2px var(--color-text)' : 'none', color: 'var(--color-text)'}}>({i + 1})</div>
              <div style={{...eq, justifySelf: 'end'}}><Marked text={r.left} mark={m} /></div>
              <div style={eq}>{r.right !== null && <><span style={{padding: '0 0.3em 0 0'}}>=</span><Marked text={r.right} mark={m} /></>}</div>
              <div style={{fontFamily: 'var(--font-mono)', fontSize: 26, color: on ? 'var(--color-text)' : 'var(--color-muted)', paddingLeft: 12, whiteSpace: 'nowrap'}}>{r.note ?? ''}</div>
            </React.Fragment>
          );
        })}
      </div>
    </Module>
  );
}
