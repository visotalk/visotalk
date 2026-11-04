import {clamp, GUIDE} from './brief.ts';

export const meta = {
  name: {en: 'Excerpt', 'zh-CN': '原文摘录'},
  purpose: 'mark',
  line: 'Lines quoted exactly, numbered; the guide on the line read, key words in cobalt.',
  fits: "a report's own words; a clause; a quote; code; a poem",
  params: {
    w: {type: 'px', default: 1680, doc: 'the width'},
    lines: {type: 'list', doc: 'the text, one line each, quoted exactly'},
    mono: {type: 'boolean', default: false, doc: 'set in mono, for code'},
    numbered: {type: 'boolean', default: true, doc: 'line numbers in the margin'},
    by: {type: 'text', default: '', doc: 'who said or wrote it, beneath'},
    size: {type: 'px', default: 50, doc: 'the text\'s size'},
    at: {type: 'number', default: -1, doc: 'the line the guide lies across; tween it to slide; -1 for none'},
    mark: {type: 'text', default: '', doc: 'the words in the guided line that take the highlight'},
    marked: {type: 'progress', default: 1, doc: '0 to 1: the highlight drawn along those words'},
    shown: {type: 'number', default: 99, doc: 'how many lines are set; fractional while one sets in'},
  },
  preview: 52.0,
};

export function Excerpt({w = 1680, lines = [], mono = false, numbered = true, by = '', size = 50, at = -1, mark = '', marked = 1, shown = 99}: {w?: number; lines?: string[]; mono?: boolean; numbered?: boolean; by?: string; size?: number; at?: number; mark?: string; marked?: number; shown?: number}) {
  const lh = Math.round(size * (mono ? 1.6 : 1.5));
  const margin = numbered ? 96 : 32;
  const guideOn = at >= 0;
  const ri = Math.round(at);
  const m = clamp(marked);
  return (
    <div style={{position: 'relative', width: w, fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)', fontVariantLigatures: mono ? 'none' : undefined, color: 'var(--color-text)'}}>
      {/* the margin rule of a quotation; the guide is laid across it */}
      <div style={{position: 'absolute', left: margin - 28, top: 0, width: 3, height: lines.length * lh, background: 'var(--color-text)'}} />
      {guideOn && <div style={{position: 'absolute', left: 0, top: Math.round(at * lh), width: w, height: lh, background: GUIDE.fill}} />}
      {lines.map((t, i) => {
        const on = clamp(shown - i);
        const lit = guideOn && ri === i;
        const k = lit && mark ? t.indexOf(mark) : -1;
        return (
          <div key={i} style={{position: 'relative', display: 'flex', height: lh, alignItems: 'center', opacity: on}}>
            {numbered && <div style={{width: margin - 28, paddingLeft: 20, boxSizing: 'border-box', fontFamily: 'var(--font-mono)', fontSize: 26, color: lit ? 'var(--color-data)' : 'var(--color-muted)', fontWeight: lit ? 700 : 400}}>{String(i + 1).padStart(2, '0')}</div>}
            <div style={{paddingLeft: numbered ? 28 : margin, fontSize: size, whiteSpace: 'pre', color: guideOn && !lit ? 'var(--color-muted)' : 'var(--color-text)', fontWeight: mono ? 400 : 500}}>
              {k < 0 ? t : (
                <>
                  {t.slice(0, k)}
                  <span style={{backgroundImage: `linear-gradient(var(--color-data), var(--color-data))`, backgroundSize: `${(m * 100).toFixed(1)}% 100%`, backgroundRepeat: 'no-repeat', color: m > 0.5 ? 'var(--color-bg)' : 'inherit', fontWeight: 700, padding: '0 6px', margin: '0 -6px'}}>{mark}</span>
                  {t.slice(k + mark.length)}
                </>
              )}
            </div>
          </div>
        );
      })}
      {guideOn && (
        <>
          <div style={{position: 'absolute', left: 0, top: Math.round(at * lh) - 1, width: w, height: GUIDE.width, background: GUIDE.edge}} />
          <div style={{position: 'absolute', left: 0, top: Math.round(at * lh + lh) - 2, width: w, height: GUIDE.width, background: GUIDE.edge}} />
        </>
      )}
      {by && <div style={{opacity: clamp(shown - lines.length + 1), marginTop: 26, paddingLeft: margin, fontFamily: 'var(--font-sans)', fontSize: 30, color: 'var(--color-muted)'}}>— {by}</div>}
    </div>
  );
}
