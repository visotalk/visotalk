import React from 'react';
import {Module, unit} from './sheet.tsx';

export const meta = {
  name: {en: 'Listing', 'zh-CN': '代码清单'},
  purpose: 'quote',
  line: 'Code in mono, lines numbered, the line read blocked in yellow.',
  fits: 'a function, a query, a command; up to twelve lines',
  params: {
    lines: {type: 'list', doc: 'the code, one string per line, indentation kept'},
    marked: {type: 'number', default: -1, doc: 'the line being read, from 0; -1: none'},
    mark: {type: 'progress', default: 1, doc: '0 to 1: how far the block has wiped across the marked line'},
    note: {type: 'text', default: '', doc: 'a short note set at the right end of the marked line: two or three words, so it clears the code'},
    foot: {type: 'text', default: '', doc: 'one line under the listing: what the marked line costs, returns or means'},
    label: {type: 'text', default: '', doc: 'the module label: a file name, a language'},
    index: {type: 'text', default: '', doc: 'the module index'},
    col: {type: 'number', default: 1, doc: 'the first column'},
    span: {type: 'number', default: 7, doc: 'how many columns'},
    top: {type: 'px', default: 360, doc: 'its top edge'},
    size: {type: 'px', default: 30, doc: 'the code size'},
  },
  preview: 39.6,
};

const KEYWORDS = /\b(?:def|for|in|if|else|elif|return|while|function|const|let|var|import|from|class|True|False|None|null|true|false|SELECT|FROM|WHERE|JOIN)\b/;

// keywords in bold, comments in grey, everything else plain ink: no rainbow
function Tokens({line}: {line: string}) {
  const hash = line.indexOf('#');
  const code = hash >= 0 ? line.slice(0, hash) : line;
  const parts = code.split(new RegExp(`(${KEYWORDS.source})`)).filter((s) => s !== undefined && s !== '');
  return (
    <>
      {parts.map((p, i) => KEYWORDS.test(p) && new RegExp(`^${KEYWORDS.source}$`).test(p) ? <b key={i} style={{fontWeight: 700}}>{p}</b> : <span key={i}>{p}</span>)}
      {hash >= 0 && <span style={{color: 'var(--color-muted)'}}>{line.slice(hash)}</span>}
    </>
  );
}

export function Listing({lines, marked = -1, mark = 1, note = '', foot = '', label = '', index = '', col = 1, span = 7, top = 360, size = 30}: {lines: string[]; marked?: number; mark?: number; note?: string; foot?: string; label?: string; index?: string; col?: number; span?: number; top?: number; size?: number}) {
  const lh = Math.round(size * 1.75);
  const m = unit(mark);
  return (
    <Module col={col} span={span} top={top} index={index} label={label}>
      <div style={{marginTop: 26, fontFamily: 'var(--font-mono)', fontSize: size, color: 'var(--color-text)', fontVariantLigatures: 'none'}}>
        {lines.map((l, i) => {
          const on = i === marked;
          return (
            <div key={i} style={{position: 'relative', display: 'flex', height: lh, alignItems: 'center', whiteSpace: 'pre'}}>
              {on && <div style={{position: 'absolute', left: 0, top: 4, bottom: 4, width: `${(m * 100).toFixed(1)}%`, background: 'var(--color-data)'}} />}
              <span style={{position: 'relative', width: 64, flex: 'none', fontSize: size * 0.72, color: on ? 'var(--color-text)' : 'var(--color-muted)', paddingLeft: 10, fontWeight: on ? 700 : 400}}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{position: 'relative'}}><Tokens line={l} /></span>
              {on && note && <span style={{position: 'relative', marginLeft: 'auto', paddingLeft: 24, paddingRight: 16, fontSize: size * 0.8, fontWeight: 700, opacity: m, whiteSpace: 'nowrap'}}>{note}</span>}
            </div>
          );
        })}
      </div>
      {foot && <div style={{marginTop: 30, paddingTop: 16, borderTop: '1px solid var(--color-faint)', fontFamily: 'var(--font-mono)', fontSize: 26, color: 'var(--color-text)', fontVariantLigatures: 'none'}}>{foot}</div>}
    </Module>
  );
}
