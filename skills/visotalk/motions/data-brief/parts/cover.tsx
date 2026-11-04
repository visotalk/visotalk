import {clamp, fitSize} from './brief.ts';

export const meta = {
  name: {en: 'Cover', 'zh-CN': '简报封面'},
  purpose: 'title',
  line: "The brief's cover: series and date, title over an ink rule, its question, its contents.",
  fits: 'the opening; a chapter divider',
  params: {
    series: {type: 'text', default: '', doc: 'the series or the issuer, small, over the title: Data brief · No. 3'},
    date: {type: 'text', default: '', doc: 'the date or period, at the right of the series line'},
    title: {type: 'text', doc: 'the title; two lines at most'},
    dek: {type: 'text', default: '', doc: 'the question it answers, one or two lines'},
    contents: {type: 'list', default: [], doc: 'the exhibits to come, one short line each: a string, or {fig, text} when the numbers skip'},
    contentsLabel: {type: 'text', default: 'In this brief', doc: 'the heading over the contents: 本期内容 for Chinese'},
    figLabel: {type: 'text', default: 'FIG', doc: 'the word before each number: 图 for Chinese'},
    reveal: {type: 'progress', default: 1, doc: '0 to 1: the title set, the rule drawn, the dek, then the contents one by one'},
  },
  preview: 2.0,
};

export function Cover({series = '', date = '', title, dek = '', contents = [], contentsLabel = 'In this brief', figLabel = 'FIG', reveal = 1}: {series?: string; date?: string; title: string; dek?: string; contents?: (string | {fig: string; text: string})[]; contentsLabel?: string; figLabel?: string; reveal?: number}) {
  const r = clamp(reveal);
  const t = clamp(r * 3), rule = clamp(r * 3 - 0.6), d = clamp(r * 3 - 1.2);
  const withContents = contents.length > 0;
  const titleW = withContents ? 1040 : 1600;
  // the longest of the title's lines decides its size, so two lines of Chinese fit as well as two of English
  const size = Math.min(...title.split('\n').map((s) => fitSize(s, 112, titleW, 72)));
  return (
    <div style={{position: 'absolute', inset: 0, background: 'var(--color-bg)', overflow: 'hidden', fontFamily: 'var(--font-sans)', color: 'var(--color-text)'}}>
      <div style={{position: 'absolute', left: 96, top: 64, width: 2, height: 820, background: 'var(--color-border)'}} />
      <div style={{position: 'absolute', left: 120, right: 120, top: 58, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, letterSpacing: '0.04em'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 18}}><div style={{width: 22, height: 22, background: 'var(--color-data)'}} />{series}</div>
        <div style={{color: 'var(--color-muted)', fontWeight: 400}}>{date}</div>
      </div>
      <div style={{position: 'absolute', left: 120, top: 250, width: titleW}}>
        <div style={{fontSize: size, fontWeight: 700, lineHeight: 1.02, letterSpacing: '-0.025em', whiteSpace: 'pre-line', opacity: t, transform: `translateY(${Math.round((1 - t) * 18)}px)`}}>{title}</div>
        <div style={{height: 4, width: titleW, marginTop: 44, background: 'var(--color-text)', transformOrigin: 'left', transform: `scaleX(${rule.toFixed(4)})`}} />
        {dek && <div style={{fontSize: 40, lineHeight: 1.35, color: 'var(--color-muted)', marginTop: 34, maxWidth: titleW, opacity: d}}>{dek}</div>}
      </div>
      {withContents && (
        <div style={{position: 'absolute', left: 1290, top: 262, width: 510}}>
          <div style={{fontSize: 28, fontWeight: 600, color: 'var(--color-muted)', paddingBottom: 14, borderBottom: '3px solid var(--color-text)', opacity: d}}>{contentsLabel}</div>
          {contents.map((c, i) => {
            const on = clamp(r * (contents.length + 4) - 4 - i);
            return (
              <div key={i} style={{display: 'flex', gap: 22, alignItems: 'baseline', padding: '18px 0', borderBottom: '1.5px solid var(--color-border)', opacity: on, transform: `translateY(${Math.round((1 - on) * 10)}px)`}}>
                <div style={{fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, color: 'var(--color-data)', whiteSpace: 'nowrap'}}>{figLabel} {typeof c === 'string' ? String(i + 1).padStart(2, '0') : c.fig}</div>
                <div style={{fontSize: 30, lineHeight: 1.25}}>{typeof c === 'string' ? c : c.text}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
