import React from 'react';
import {Module, countTo} from './sheet.tsx';

export const meta = {
  name: {en: 'Figures', 'zh-CN': '数字栏'},
  purpose: 'data',
  line: 'One to four big figures on whole columns, counted up, named and sourced.',
  fits: 'a headline number, key numbers, peak against latest',
  params: {
    items: {type: 'list', doc: '[{value, label, note?}]: the figure as printed ("+18%", "1,883", "365.2425"), what it counts, and a source or comparison in mono'},
    count: {type: 'progress', default: 1, doc: '0 to 1: how far the figures have counted up; decimals, grouping and signs are kept'},
    shown: {type: 'number', default: 99, doc: 'how many figures are set'},
    focus: {type: 'number', default: -1, doc: 'the figure being said; -1: none'},
    size: {type: 'px', default: 132, doc: 'the figures\' size'},
    col: {type: 'number', default: 1, doc: 'the first column'},
    span: {type: 'number', default: 12, doc: 'how many columns; each figure takes span ÷ figures, rounded down'},
    top: {type: 'px', default: 380, doc: 'its top edge'},
  },
  preview: 6.2,
};

type Item = {value: string; label: string; note?: string};

export function Figures({items, count = 1, shown = 99, focus = -1, size = 132, col = 1, span = 12, top = 380}: {items: Item[]; count?: number; shown?: number; focus?: number; size?: number; col?: number; span?: number; top?: number}) {
  const each = Math.max(1, Math.floor(span / items.length));
  return (
    <>
      {items.map((it, i) => {
        if (i >= shown) return null;
        const on = i === focus;
        return (
          <Module key={i} col={col + i * each} span={each} top={top} index={String(i + 1).padStart(2, '0')}>
            <div style={{marginTop: 18, display: 'inline-block', fontFamily: 'var(--font-display)', fontSize: size, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.04em', color: 'var(--color-text)',
              fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', padding: '6px 14px 2px', marginLeft: -14, background: on ? 'var(--color-data)' : 'transparent'}}>{countTo(it.value, count)}</div>
            <div style={{marginTop: 16, fontFamily: 'var(--font-sans)', fontSize: 32, fontWeight: 650, lineHeight: 1.25, color: 'var(--color-text)', paddingRight: 24}}>{it.label}</div>
            {it.note && <div style={{marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--color-faint)', fontFamily: 'var(--font-mono)', fontSize: 25, lineHeight: 1.35, color: 'var(--color-muted)', paddingRight: 24}}>{it.note}</div>}
          </Module>
        );
      })}
    </>
  );
}
