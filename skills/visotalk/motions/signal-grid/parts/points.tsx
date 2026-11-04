import React from 'react';
import {Marked, Module} from './sheet.tsx';

export const meta = {
  name: {en: 'Points', 'zh-CN': '要点'},
  purpose: 'steps',
  line: 'Numbered points built into ruled slots, each with an optional tag.',
  fits: 'causes, findings, rules with amounts, milestones with states; 2–6',
  params: {
    items: {type: 'list', doc: '[{title, body?, tag?, tone?}]: each point, one line under it, a tag on the right (an amount, a state, an owner), and the tag\'s tone ("good", "bad" or none); a {phrase} in braces takes the signal'},
    shown: {type: 'number', default: 99, doc: 'how many points are set; the rest wait as ruled, numbered slots'},
    focus: {type: 'number', default: -1, doc: 'the point being said, from 0; -1: none'},
    label: {type: 'text', default: '', doc: 'the module label'},
    index: {type: 'text', default: '', doc: 'the module index'},
    col: {type: 'number', default: 1, doc: 'the first column'},
    span: {type: 'number', default: 6, doc: 'how many columns'},
    top: {type: 'px', default: 360, doc: 'its top edge'},
  },
  preview: 45.0,
};

type Item = {title: string; body?: string; tag?: string; tone?: string};

export function Points({items, shown = 99, focus = -1, label = '', index = '', col = 1, span = 6, top = 360}: {items: Item[]; shown?: number; focus?: number; label?: string; index?: string; col?: number; span?: number; top?: number}) {
  const dense = items.length > 4;
  const t = dense ? 31 : 36;
  const b = dense ? 25 : 27;
  return (
    <Module col={col} span={span} top={top} index={index} label={label}>
      <div style={{marginTop: 8}}>
        {items.map((it, i) => {
          const set = i < shown;
          const on = i === focus;
          const tone = it.tone === 'good' ? 'var(--color-good)' : it.tone === 'bad' ? 'var(--color-bad)' : 'var(--color-text)';
          return (
            <div key={i} style={{display: 'grid', gridTemplateColumns: '72px 1fr auto', columnGap: 12, alignItems: 'baseline', padding: dense ? '11px 0 13px' : '16px 0 18px',
              borderBottom: `1px solid ${set ? 'var(--color-faint)' : 'color-mix(in srgb, var(--color-faint) 60%, transparent)'}`}}>
              <div style={{justifySelf: 'start', fontFamily: 'var(--font-mono)', fontSize: 25, fontWeight: 700, padding: '2px 8px', background: on && !it.title.includes('{') ? 'var(--color-data)' : 'transparent', boxShadow: on ? 'inset 0 0 0 2px var(--color-text)' : 'none', color: set ? 'var(--color-text)' : 'var(--color-faint)'}}>{String(i + 1).padStart(2, '0')}</div>
              {set ? (
                <div>
                  <div style={{fontFamily: 'var(--font-sans)', fontSize: t, fontWeight: 720, lineHeight: 1.22, color: 'var(--color-text)'}}><Marked text={it.title} mark={on ? 1 : 0} /></div>
                  {it.body && <div style={{fontFamily: 'var(--font-sans)', fontSize: b, lineHeight: 1.35, color: 'var(--color-muted)', marginTop: 4}}>{it.body}</div>}
                </div>
              ) : <div style={{height: t * 1.22}} />}
              {set && it.tag ? (
                <div style={{fontFamily: 'var(--font-mono)', fontSize: 25, fontWeight: 700, whiteSpace: 'nowrap', padding: '3px 12px', color: tone, border: `2px solid ${tone}`,
                  background: 'transparent'}}>{it.tag}</div>
              ) : <div />}
            </div>
          );
        })}
      </div>
    </Module>
  );
}
