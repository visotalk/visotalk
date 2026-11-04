import React from 'react';
import {Marked, Module, unit} from './sheet.tsx';

export const meta = {
  name: {en: 'Table', 'zh-CN': '表格'},
  purpose: 'compare',
  line: 'A ruled table, rows set one by one, the row said ruled in ink, its {cell} in yellow.',
  fits: 'products against features, cases against a rule; up to 6 rows',
  params: {
    head: {type: 'list', doc: 'the column names'},
    rows: {type: 'list', doc: 'the rows, each a list of cells as printed; a {phrase} in braces is marked'},
    shown: {type: 'number', default: 99, doc: 'how many rows are set'},
    focus: {type: 'number', default: -1, doc: 'the row being said, from 0; -1: none'},
    mark: {type: 'progress', default: 1, doc: '0 to 1: how much of the focused row\'s {phrase} is blocked (a focused row with none is filled instead)'},
    align: {type: 'list', default: [], doc: 'per column "left" or "right" (figures); the default is left'},
    size: {type: 'px', default: 32, doc: 'the cells\' size'},
    label: {type: 'text', default: '', doc: 'the module label'},
    index: {type: 'text', default: '', doc: 'the module index'},
    col: {type: 'number', default: 1, doc: 'the first column'},
    span: {type: 'number', default: 12, doc: 'how many columns'},
    top: {type: 'px', default: 360, doc: 'its top edge'},
  },
  preview: 45.0,
};

export function Table({head, rows, shown = 99, focus = -1, mark = 1, align = [], size = 32, label = '', index = '', col = 1, span = 12, top = 360}: {head: string[]; rows: string[][]; shown?: number; focus?: number; mark?: number; align?: string[]; size?: number; label?: string; index?: string; col?: number; span?: number; top?: number}) {
  const pad = rows.length > 4 ? 12 : 18;
  return (
    <Module col={col} span={span} top={top} index={index} label={label}>
      <table style={{width: '100%', marginTop: 14, borderCollapse: 'collapse', tableLayout: 'auto'}}>
        <thead>
          <tr>
            {head.map((h, j) => (
              <th key={j} style={{textAlign: (align[j] ?? 'left') as 'left' | 'right', fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 400, color: 'var(--color-muted)', padding: `10px 0 12px ${j ? 24 : 12}px`,
                borderBottom: '2px solid var(--color-text)', whiteSpace: 'nowrap'}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const set = i < shown;
            const on = i === focus;
            return (
              <tr key={i} style={{boxShadow: on ? 'inset 0 3px 0 var(--color-text), inset 0 -3px 0 var(--color-text)' : 'none', background: on && !r.some((c) => c.includes('{')) ? 'var(--color-data)' : 'transparent'}}>
                {r.map((c, j) => (
                  <td key={j} style={{textAlign: (align[j] ?? 'left') as 'left' | 'right', padding: `${pad}px ${j === r.length - 1 ? 12 : 0}px ${pad}px ${j ? 24 : 12}px`, borderBottom: '1px solid var(--color-faint)',
                    fontFamily: 'var(--font-sans)', fontSize: size, lineHeight: 1.25, fontWeight: j === 0 || on ? 720 : 450, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums',
                    opacity: set ? 1 : 0}}><Marked text={c} mark={on ? unit(mark) : 0} /></td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </Module>
  );
}
