import React from 'react';
import {GUTTER, Marked, Module, unit} from './sheet.tsx';

export const meta = {
  name: {en: 'Columns', 'zh-CN': '对照栏'},
  purpose: 'compare',
  line: 'Two or three ruled columns: a name, a rule, examples, the deciding phrase blocked.',
  fits: 'two tenses, two methods, two terms; two numbers go in Bars',
  params: {
    columns: {type: 'list', doc: '[{label, rule, examples, key?}]: the name, the rule or definition in one line, examples (a {phrase} in braces is the deciding one), and a closing line under them'},
    keyLabel: {type: 'text', default: '', doc: 'the small label before each closing line: "Signals", "Error"'},
    mark: {type: 'progress', default: 0, doc: '0 to 1: how much of the {phrases} of the focused column (of all, without focus) are blocked'},
    focus: {type: 'number', default: -1, doc: 'the column being spoken about; the others go grey. -1: none'},
    size: {type: 'px', default: 46, doc: 'the examples\' size'},
    col: {type: 'number', default: 1, doc: 'the first column of the grid'},
    span: {type: 'number', default: 12, doc: 'how many grid columns it uses; each side takes span ÷ sides, rounded down'},
    top: {type: 'px', default: 360, doc: 'its top edge'},
  },
  preview: 51.4,
};

type Column = {label: string; rule: string; examples: string[]; key?: string};

export function Compare({columns, keyLabel = '', mark = 0, focus = -1, size = 46, col = 1, span = 12, top = 360}: {columns: Column[]; keyLabel?: string; mark?: number; focus?: number; size?: number; col?: number; span?: number; top?: number}) {
  const each = Math.max(1, Math.floor(span / columns.length)); // whole columns, so each side's rule starts on a column line
  return (
    <>
      {columns.map((c, i) => {
        const dim = focus >= 0 && i !== Math.round(focus);
        return (
          <div key={i} style={{opacity: dim ? 0.38 : 1}}>
            <Module col={col + i * each} span={each} top={top} index={String.fromCharCode(65 + i)} label={c.label}>
              <div style={{fontFamily: 'var(--font-mono)', fontSize: 26, lineHeight: 1.4, color: 'var(--color-text)', marginTop: 22, paddingBottom: 18, borderBottom: '1px solid var(--color-faint)', paddingRight: GUTTER}}>{c.rule}</div>
              <div style={{display: 'grid', gridTemplateColumns: '60px 1fr', rowGap: 24, marginTop: 26, paddingRight: GUTTER}}>
                {c.examples.map((e, j) => (
                  <React.Fragment key={j}>
                    <div style={{fontFamily: 'var(--font-mono)', fontSize: 26, color: 'var(--color-muted)', paddingTop: size * 0.3}}>{`${i + 1}.${j + 1}`}</div>
                    <div style={{fontFamily: 'var(--font-sans)', fontSize: size, lineHeight: 1.28, fontWeight: 450, color: 'var(--color-text)'}}><Marked text={e} mark={focus < 0 || i === Math.round(focus) ? unit(mark) : 0} /></div>
                  </React.Fragment>
                ))}
              </div>
              {c.key && (
                <div style={{display: 'flex', gap: 18, alignItems: 'baseline', marginTop: 32, paddingTop: 14, borderTop: '1px solid var(--color-faint)', paddingRight: GUTTER, fontFamily: 'var(--font-mono)', fontSize: 26, color: 'var(--color-text)'}}>
                  {keyLabel && <span style={{fontSize: 26, color: 'var(--color-muted)', whiteSpace: 'nowrap'}}>{keyLabel}</span>}{c.key}
                </div>
              )}
            </Module>
          </div>
        );
      })}
    </>
  );
}
