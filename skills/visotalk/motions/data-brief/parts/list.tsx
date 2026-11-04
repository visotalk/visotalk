import {clamp, fitSize, GUIDE} from './brief.ts';

export const meta = {
  name: {en: 'Register', 'zh-CN': '条目清单'},
  purpose: 'steps',
  line: 'A register that fills in: stamp, text, figure or status; the guide on the entry said.',
  fits: 'findings that accumulate; milestones; an incident timeline',
  params: {
    w: {type: 'px', default: 1680, doc: 'the width'},
    h: {type: 'px', default: 560, doc: 'the height it may use: entries shrink to fit it'},
    items: {type: 'list', doc: '{stamp, text, sub, value, state}: stamp, sub (a second line), value and state are optional; state is done, risk, late or open'},
    states: {type: 'object', default: {done: 'Done', risk: 'At risk', late: 'Late', open: 'Open'}, doc: 'the words for each state: 已完成 for Chinese'},
    stampW: {type: 'px', default: 0, doc: 'the stamp column\'s width; 0 for a numbered list\'s'},
    shown: {type: 'number', default: 99, doc: 'how many entries are set; fractional while one sets in'},
    at: {type: 'number', default: -1, doc: 'the entry the guide lies on; tween it to slide; -1 for none'},
  },
  preview: 58.0,
};

type Item = {stamp?: string; text: string; sub?: string; value?: string; state?: string};
const MARK: Record<string, string> = {done: 'var(--color-good)', risk: 'var(--color-warn)', late: 'var(--color-bad)', open: 'var(--color-muted)'};

function State({kind, word}: {kind: string; word: string}) {
  const c = MARK[kind] ?? 'var(--color-muted)';
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 12, fontSize: 28, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap'}}>
      <svg width={26} height={26} style={{display: 'block'}}>
        {kind === 'done' && <><rect x={1} y={1} width={24} height={24} fill={c} /><path d="M6 13l5 5 9-10" fill="none" stroke="var(--color-bg)" strokeWidth={3} /></>}
        {kind === 'risk' && <><rect x={2} y={2} width={22} height={22} fill="none" stroke={c} strokeWidth={3} /><rect x={2} y={13} width={22} height={11} fill={c} /></>}
        {kind === 'late' && <><rect x={1} y={1} width={24} height={24} fill={c} /><path d="M7 7l12 12M19 7L7 19" stroke="var(--color-bg)" strokeWidth={3} /></>}
        {kind === 'open' && <rect x={2} y={2} width={22} height={22} fill="none" stroke={c} strokeWidth={3} />}
      </svg>
      {word}
    </div>
  );
}

export function List({w = 1680, h = 560, items = [], states = {done: 'Done', risk: 'At risk', late: 'Late', open: 'Open'}, stampW = 0, shown = 99, at = -1}: {w?: number; h?: number; items?: Item[]; states?: Record<string, string>; stampW?: number; shown?: number; at?: number}) {
  const subs = items.some((it) => it.sub);
  const rowH = Math.max(64, Math.min(subs ? 132 : 104, Math.floor(h / Math.max(1, items.length))));
  const size = Math.min(40, Math.max(28, Math.round(rowH * (subs ? 0.3 : 0.38))));
  const sw = stampW || (items.some((it) => it.stamp) ? 200 : 110);
  const rightW = items.some((it) => it.state) ? 240 : items.some((it) => it.value) ? 260 : 0;
  const textW = w - sw - rightW - 48;
  const guideOn = at >= 0;
  const gy = at * rowH;
  return (
    <div style={{position: 'relative', width: w, fontFamily: 'var(--font-sans)', color: 'var(--color-text)', borderTop: shown > 0 ? '3px solid var(--color-text)' : '3px solid transparent'}}>
      {guideOn && <div style={{position: 'absolute', left: 0, top: Math.round(gy), width: w, height: rowH, background: GUIDE.fill}} />}
      {items.map((it, i) => {
        const on = clamp(shown - i);
        const lit = guideOn ? clamp(1 - Math.abs(at - i)) : 0;
        const read = i < Math.round(at);
        return (
          <div key={i} style={{position: 'relative', display: 'flex', alignItems: 'center', height: rowH, borderBottom: '1.5px solid var(--color-border)', boxSizing: 'border-box', opacity: on, transform: `translateY(${Math.round((1 - on) * 12)}px)`}}>
            <div style={{width: sw, paddingLeft: 24, boxSizing: 'border-box', fontFamily: 'var(--font-mono)', fontSize: Math.min(30, size), fontWeight: 700, color: lit > 0.5 ? 'var(--color-data)' : 'var(--color-muted)', whiteSpace: 'nowrap'}}>{it.stamp ?? String(i + 1).padStart(2, '0')}</div>
            <div style={{width: textW, paddingRight: 24, boxSizing: 'border-box'}}>
              <div style={{fontSize: fitSize(it.text, size, textW - 24, 28), fontWeight: lit > 0.5 ? 700 : 500, color: read && lit < 0.5 ? 'var(--color-muted)' : 'var(--color-text)', lineHeight: 1.2}}>{it.text}</div>
              {it.sub && <div style={{fontSize: 28, color: 'var(--color-muted)', marginTop: 6, lineHeight: 1.2}}>{it.sub}</div>}
            </div>
            {rightW > 0 && (
              <div style={{width: rightW, display: 'flex', justifyContent: 'flex-end', paddingRight: 24, boxSizing: 'border-box'}}>
                {it.state ? <State kind={it.state} word={states[it.state] ?? it.state} />
                  : it.value ? <span style={{fontFamily: 'var(--font-mono)', fontSize: size, fontWeight: lit > 0.5 ? 700 : 400, color: lit > 0.5 ? 'var(--color-data)' : 'var(--color-text)', whiteSpace: 'nowrap'}}>{it.value}</span> : null}
              </div>
            )}
          </div>
        );
      })}
      {guideOn && (
        <>
          <div style={{position: 'absolute', left: 0, top: Math.round(gy) - 1, width: w, height: GUIDE.width, background: GUIDE.edge}} />
          <div style={{position: 'absolute', left: 0, top: Math.round(gy + rowH) - 2, width: w, height: GUIDE.width, background: GUIDE.edge}} />
          <div style={{position: 'absolute', left: 0, top: Math.round(gy), width: 10, height: rowH, background: GUIDE.edge}} />
        </>
      )}
    </div>
  );
}
