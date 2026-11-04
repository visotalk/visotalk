import React from 'react';
import {Marked, Module, unit} from './sheet.tsx';

export const meta = {
  name: {en: 'Passage', 'zh-CN': '段落'},
  purpose: 'mark',
  line: 'Running text at reading size, the phrase said blocked, a gloss ruled under it.',
  fits: 'a definition, a quote, a poem read closely; up to forty words',
  params: {
    text: {type: 'text', doc: 'the text; a {phrase} in braces is the one marked; a line break starts a new line'},
    mark: {type: 'progress', default: 0, doc: '0 to 1: how much of the {phrase} is blocked'},
    gloss: {type: 'text', default: '', doc: 'what the marked phrase means, ruled under the text once it is marked'},
    source: {type: 'text', default: '', doc: 'a source or attribution in mono under it'},
    label: {type: 'text', default: '', doc: 'the module label'},
    index: {type: 'text', default: '', doc: 'the module index'},
    col: {type: 'number', default: 1, doc: 'the first column'},
    span: {type: 'number', default: 8, doc: 'how many columns'},
    top: {type: 'px', default: 360, doc: 'its top edge'},
    size: {type: 'px', default: 48, doc: 'the text size'},
  },
  preview: 13.9,
};

export function Passage({text, mark = 0, gloss = '', source = '', label = '', index = '', col = 1, span = 8, top = 360, size = 48}: {text: string; mark?: number; gloss?: string; source?: string; label?: string; index?: string; col?: number; span?: number; top?: number; size?: number}) {
  const m = unit(mark);
  const g = unit((m - 0.6) / 0.4);
  return (
    <Module col={col} span={span} top={top} index={index} label={label}>
      <div style={{marginTop: 24, fontFamily: 'var(--font-sans)', fontSize: size, fontWeight: 450, lineHeight: 1.4, letterSpacing: '-0.005em', color: 'var(--color-text)', whiteSpace: 'pre-line'}}><Marked text={text} mark={m} /></div>
      {source && <div style={{marginTop: 18, fontFamily: 'var(--font-mono)', fontSize: 25, color: 'var(--color-muted)'}}>{source}</div>}
      {gloss && (
        <div style={{display: 'flex', gap: 18, alignItems: 'baseline', marginTop: 26, paddingTop: 16, borderTop: '1px solid var(--color-text)', opacity: g, transform: `translateY(${((1 - g) * 12).toFixed(1)}px)`}}>
          <span style={{flex: 'none', width: 22, height: 22, background: 'var(--color-data)', boxShadow: 'inset 0 0 0 2px var(--color-text)'}} />
          <span style={{fontFamily: 'var(--font-sans)', fontSize: Math.round(size * 0.66), lineHeight: 1.4, color: 'var(--color-text)'}}>{gloss}</span>
        </div>
      )}
    </Module>
  );
}
