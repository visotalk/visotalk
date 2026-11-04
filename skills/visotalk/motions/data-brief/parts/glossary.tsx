import {clamp, textW, GUIDE} from './brief.ts';

export const meta = {
  name: {en: 'Definition', 'zh-CN': '术语定义'},
  purpose: 'term',
  line: 'A term defined, its key phrase under the guide, its formula in mono.',
  fits: 'a measure before its chart; two terms told apart',
  params: {
    w: {type: 'px', default: 1680, doc: 'the width'},
    heading: {type: 'text', default: 'Definition', doc: 'the word over the rule: 定义 for Chinese'},
    terms: {type: 'list', doc: '{term, kind, text, mark, formula}: one or two; mark is the phrase of text under the guide, formula a line in mono'},
    focus: {type: 'number', default: -1, doc: 'with two terms, the one in the highlight; -1 for both alike'},
    h: {type: 'px', default: 520, doc: 'the height it may use: the text is set smaller before it passes it'},
    reveal: {type: 'progress', default: 1, doc: '0 to 1: the term set, then its definition'},
    marked: {type: 'progress', default: 0, doc: '0 to 1: the guide laid along the marked phrase'},
  },
  preview: 7.1,
};

type Term = {term: string; kind?: string; text: string; mark?: string; formula?: string};

export function Glossary({w = 1680, h = 520, heading = 'Definition', terms = [], focus = -1, reveal = 1, marked = 0}: {w?: number; h?: number; heading?: string; terms?: Term[]; focus?: number; reveal?: number; marked?: number}) {
  const n = Math.max(1, terms.length);
  const gap = 80;
  const colW = Math.floor((w - gap * (n - 1)) / n);
  const one = n === 1;
  const a = clamp(reveal * 2), b = clamp(reveal * 2 - 1);
  const m = clamp(marked);
  // the tallest column, estimated from its lines, decides one scale for all the text
  const need = Math.max(...terms.map((t) => {
    const ts = one ? 76 : 60, ds = one ? 44 : 36, width = one ? Math.min(1440, colW) : colW;
    const lines = Math.ceil(textW(t.text, ds) / width) + 0.5;
    return 62 + 34 + ts * 1.1 * Math.ceil(textW(t.term, ts) / colW) + (t.kind ? 46 : 0) + 34 + lines * ds * 1.5 + (t.formula ? 30 + 18 + (one ? 34 : 30) * 1.4 : 0);
  }), 1);
  const k = Math.max(0.6, Math.min(1, h / need));
  return (
    <div style={{display: 'flex', gap, width: w, fontFamily: 'var(--font-sans)', color: 'var(--color-text)'}}>
      {terms.map((t, i) => {
        const dim = focus >= 0 && Math.round(focus) !== i;
        const mk = dim ? 0 : m;
        const [pre, post] = t.mark && t.text.includes(t.mark) ? [t.text.slice(0, t.text.indexOf(t.mark)), t.text.slice(t.text.indexOf(t.mark) + t.mark.length)] : [t.text, ''];
        return (
          <div key={t.term} style={{width: colW, opacity: dim ? 0.45 : 1}}>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 18, borderBottom: '3px solid var(--color-text)', paddingBottom: 14}}>
              <div style={{width: 18, height: 18, background: dim ? 'var(--color-faint)' : 'var(--color-data)', alignSelf: 'center'}} />
              <div style={{fontSize: 28, fontWeight: 600, color: 'var(--color-muted)', letterSpacing: '0.04em'}}>{heading}</div>
            </div>
            <div style={{opacity: a, transform: `translateY(${Math.round((1 - a) * 12)}px)`}}>
              <div style={{fontSize: Math.round((one ? 76 : 60) * k), fontWeight: 700, letterSpacing: '-0.015em', marginTop: 34, lineHeight: 1.08}}>{t.term}</div>
              {t.kind && <div style={{fontFamily: 'var(--font-mono)', fontSize: 28, color: 'var(--color-muted)', marginTop: 14}}>{t.kind}</div>}
            </div>
            <div style={{opacity: b, transform: `translateY(${Math.round((1 - b) * 12)}px)`, fontSize: Math.round((one ? 44 : 36) * k), lineHeight: 1.5, marginTop: 34, maxWidth: one ? 1440 : colW}}>
              {pre}
              {t.mark && post !== undefined && t.text.includes(t.mark) && (
                // the phrase under the guide: tinted, ruled above and below, drawn along as it is said
                <span style={{backgroundImage: `linear-gradient(${GUIDE.fill}, ${GUIDE.fill}), linear-gradient(${GUIDE.edge}, ${GUIDE.edge}), linear-gradient(${GUIDE.edge}, ${GUIDE.edge})`, backgroundSize: `${(mk * 100).toFixed(1)}% 100%, ${(mk * 100).toFixed(1)}% ${GUIDE.width}px, ${(mk * 100).toFixed(1)}% ${GUIDE.width}px`, backgroundPosition: 'left center, left top, left bottom', backgroundRepeat: 'no-repeat', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone', padding: '2px 4px', margin: '0 -4px', fontWeight: mk > 0.5 ? 700 : 400, color: mk > 0.5 ? 'var(--color-data)' : 'inherit'}}>{t.mark}</span>
              )}
              {post}
            </div>
            {t.formula && <div style={{opacity: b, fontFamily: 'var(--font-mono)', fontSize: Math.round((one ? 34 : 30) * k), marginTop: 30, paddingTop: 18, borderTop: '1.5px solid var(--color-border)', color: 'var(--color-text)'}}>{t.formula}</div>}
          </div>
        );
      })}
    </div>
  );
}
