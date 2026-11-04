import React from 'react';
import {colX, spanW} from './sheet.tsx';

export const meta = {
  name: {en: 'Detail module', 'zh-CN': '详情模块'},
  purpose: 'term',
  line: 'A white module set into freed columns: a tab, a title, text, one figure.',
  fits: 'an event from a timeline, a term, a case, a figure with its source',
  params: {
    title: {type: 'text', doc: 'what it is about'},
    tab: {type: 'text', default: '', doc: 'the tab over it: a date, a number, what it opens'},
    lit: {type: 'boolean', default: false, doc: 'the tab in yellow, when nothing else is'},
    body: {type: 'text', default: '', doc: 'two or three short lines'},
    figure: {type: 'text', default: '', doc: 'one figure set large'},
    figureLabel: {type: 'text', default: '', doc: 'what the figure counts'},
    col: {type: 'number', default: 8, doc: 'the first column; at rest col + span stays within 13, inside the margins'},
    span: {type: 'number', default: 5, doc: 'how many columns'},
    top: {type: 'px', default: 340, doc: 'its top edge'},
    height: {type: 'px', default: 500, doc: 'its height'},
  },
  preview: 32.6,
};

export function Card({title, tab = '', lit = false, body = '', figure = '', figureLabel = '', col = 8, span = 5, top = 340, height = 500}: {title: string; tab?: string; lit?: boolean; body?: string; figure?: string; figureLabel?: string; col?: number; span?: number; top?: number; height?: number}) {
  const left = colX(col);
  const W = spanW(span);
  return (
    <div style={{position: 'absolute', left, top, width: W, height}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: W, minHeight: height, boxSizing: 'border-box', background: 'var(--color-panel)', borderTop: '3px solid var(--color-text)', padding: '0 40px 36px', display: 'flex', flexDirection: 'column'}}>
        {tab && <div style={{alignSelf: 'flex-start', background: lit ? 'var(--color-data)' : 'transparent', boxShadow: lit ? 'none' : 'inset 0 0 0 2px var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, padding: '8px 16px', color: 'var(--color-text)'}}>{tab}</div>}
        <div style={{marginTop: 28, fontFamily: 'var(--font-display)', fontSize: 60, fontWeight: 780, letterSpacing: '-0.02em', lineHeight: 1.05, color: 'var(--color-text)'}}>{title}</div>
        {body && <div style={{marginTop: 22, fontFamily: 'var(--font-sans)', fontSize: 30, lineHeight: 1.5, color: 'var(--color-text)'}}>{body}</div>}
        {figure && (
          <div style={{marginTop: 'auto', display: 'flex', alignItems: 'baseline', gap: 20, borderTop: '1px solid var(--color-faint)', paddingTop: 18}}>
            <div style={{fontFamily: 'var(--font-display)', fontSize: 112, fontWeight: 800, lineHeight: 0.9, letterSpacing: '-0.04em', color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums'}}>{figure}</div>
            <div style={{fontFamily: 'var(--font-sans)', fontSize: 28, lineHeight: 1.3, color: 'var(--color-muted)'}}>{figureLabel}</div>
          </div>
        )}
      </div>
    </div>
  );
}
