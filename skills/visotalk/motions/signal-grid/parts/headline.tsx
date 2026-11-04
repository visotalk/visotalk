import React from 'react';
import {Marked, TOP, colX, spanW} from './sheet.tsx';

export const meta = {
  name: {en: 'Headline', 'zh-CN': '标题'},
  purpose: 'title',
  line: 'A flush-left heavy headline, its section and kicker in mono above.',
  fits: 'the question a page answers',
  params: {
    title: {type: 'text', doc: 'the headline, one or two lines; a {phrase} in braces is the one that can be marked'},
    mark: {type: 'progress', default: 0, doc: '0 to 1: how much of the {phrase} is blocked; keep 0 while something else is yellow'},
    kicker: {type: 'text', default: '', doc: 'the section above it: "§3 · Tenses"'},
    col: {type: 'number', default: 1, doc: 'the first column'},
    span: {type: 'number', default: 12, doc: 'how many columns it may use'},
    top: {type: 'px', default: 168, doc: 'its top edge'},
    size: {type: 'px', default: 84, doc: 'the headline size'},
  },
  preview: 6.2,
};

export function Headline({title, kicker = '', mark = 0, col = 1, span = 12, top = TOP, size = 84}: {title: string; kicker?: string; mark?: number; col?: number; span?: number; top?: number; size?: number}) {
  return (
    <div style={{position: 'absolute', left: colX(col), top, width: spanW(span)}}>
      {kicker && <div style={{fontFamily: 'var(--font-mono)', fontSize: 26, letterSpacing: '0.03em', color: 'var(--color-muted)', marginBottom: 12}}>{kicker}</div>}
      <div style={{fontFamily: 'var(--font-display)', fontSize: size, fontWeight: 760, lineHeight: 1.06, letterSpacing: '-0.025em', color: 'var(--color-text)'}}><Marked text={title} mark={mark} /></div>
    </div>
  );
}
