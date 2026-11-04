import {clamp, fitSize} from './brief.ts';

export const meta = {
  name: {en: 'Exhibit', 'zh-CN': '图表页'},
  purpose: 'ground',
  line: "Every scene's ground: FIG number, the finding as headline, unit and source lines.",
  fits: 'every scene',
  params: {
    fig: {type: 'text', default: '01', doc: 'the exhibit number'},
    figLabel: {type: 'text', default: 'FIG', doc: 'the word before the number: 图 for Chinese'},
    kicker: {type: 'text', default: '', doc: 'the section, beside the number, set as written'},
    headline: {type: 'text', default: '', doc: 'the finding, one sentence'},
    unit: {type: 'text', default: '', doc: 'what is measured, and in what'},
    source: {type: 'text', default: '', doc: 'who measured it, and when'},
    note: {type: 'text', default: '', doc: 'a caveat after the source: illustrative data, a break in a series'},
    sourceLabel: {type: 'text', default: 'Source', doc: 'the word before the source: 来源 for Chinese'},
    noteLabel: {type: 'text', default: 'Note', doc: 'the word before the note: 注 for Chinese'},
    reveal: {type: 'progress', default: 1, doc: '0 to 1: the headline and unit line set in, the rule drawn under them'},
  },
  preview: 53.0,
};

export function Exhibit({fig = '01', figLabel = 'FIG', kicker = '', headline = '', unit = '', source = '', note = '', sourceLabel = 'Source', noteLabel = 'Note', reveal = 1}: {fig?: string; figLabel?: string; kicker?: string; headline?: string; unit?: string; source?: string; note?: string; sourceLabel?: string; noteLabel?: string; reveal?: number}) {
  const head = clamp(reveal * 2);
  const rule = clamp(reveal * 2 - 0.6);
  // one finding, one line: a long headline is set smaller before it is allowed to wrap
  const size = fitSize(headline, 62, 1640, 48);
  return (
    <div style={{position: 'absolute', inset: 0, background: 'var(--color-bg)', overflow: 'hidden', fontFamily: 'var(--font-sans)', color: 'var(--color-text)'}}>
      {/* the margin of record: a hairline down the left, the exhibit number on it */}
      <div style={{position: 'absolute', left: 96, top: 64, width: 2, height: 820, background: 'var(--color-border)'}} />
      <div style={{position: 'absolute', left: 120, top: 58, display: 'flex', alignItems: 'center', gap: 18}}>
        <div style={{width: 22, height: 22, background: 'var(--color-data)'}} />
        <div style={{fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, letterSpacing: '0.06em'}}>{figLabel} {fig}</div>
        {kicker && <div style={{fontSize: 26, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--color-muted)'}}>{kicker}</div>}
      </div>
      <div style={{position: 'absolute', left: 120, top: 108, width: 1680, opacity: head, transform: `translateY(${Math.round((1 - head) * 14)}px)`}}>
        <div style={{fontSize: size, fontWeight: 700, lineHeight: 1.12, letterSpacing: '-0.015em'}}>{headline}</div>
        {unit && <div style={{fontSize: 30, fontWeight: 400, color: 'var(--color-muted)', marginTop: 14}}>{unit}</div>}
      </div>
      {/* the source line: a short ink rule, then who measured it; never omitted */}
      <div style={{position: 'absolute', left: 120, top: 838, width: 1680, height: 2, background: 'var(--color-faint)', transformOrigin: 'left', transform: `scaleX(${rule.toFixed(4)})`}} />
      <div style={{position: 'absolute', left: 120, top: 852, width: 1680, display: 'flex', gap: 36, fontSize: 26, color: 'var(--color-muted)', whiteSpace: 'nowrap'}}>
        {source && <div><span style={{fontWeight: 700, color: 'var(--color-text)'}}>{sourceLabel}</span>&ensp;{source}</div>}
        {note && <div><span style={{fontWeight: 700, color: 'var(--color-text)'}}>{noteLabel}</span>&ensp;{note}</div>}
      </div>
    </div>
  );
}
