import React from 'react';
import {Module, spanW, unit} from './sheet.tsx';

export const meta = {
  name: {en: 'Time rule', 'zh-CN': '时间轴'},
  purpose: 'steps',
  line: 'Dated events on an ink rule, the one opened marked; narrows to make room.',
  fits: 'a history, an incident, milestones; 3–6 events',
  params: {
    events: {type: 'list', doc: '[{date, title, sub?, gap?}]: the date as printed, the event, one line under it, and the time to the next event as printed'},
    shown: {type: 'number', default: 99, doc: 'how many events are set'},
    open: {type: 'number', default: -1, doc: 'the event opened or being said, from 0; -1: none'},
    label: {type: 'text', default: '', doc: 'the module label'},
    index: {type: 'text', default: '', doc: 'the module index'},
    col: {type: 'number', default: 1, doc: 'the first column'},
    span: {type: 'number', default: 12, doc: 'how many columns; tween it to re-flow the rule'},
    top: {type: 'px', default: 360, doc: 'its top edge'},
  },
  preview: 32.6,
};

type Event = {date: string; title: string; sub?: string; gap?: string};

export function Timeline({events, shown = 99, open = -1, label = '', index = '', col = 1, span = 12, top = 360}: {events: Event[]; shown?: number; open?: number; label?: string; index?: string; col?: number; span?: number; top?: number}) {
  const W = spanW(span);
  const n = events.length;
  const pad = 14;
  const step = (W - 2 * pad) / n;
  const x = (i: number) => Math.round(pad + i * step);  // each event owns a slot; its marker at the slot's left
  const axis = 176;
  const dateSize = n > 4 ? 40 : 52;
  const cut = Math.round(unit(Math.min(shown, n) / n) * W);
  return (
    <Module col={col} span={span} top={top} index={index} label={label}>
      <div style={{position: 'relative', height: 420}}>
        {/* the rule */}
        <div style={{position: 'absolute', left: 0, top: axis - 2, width: cut, height: 4, background: 'var(--color-text)'}} />
        {events.map((e, i) => {
          if (i >= shown) return null;
          const on = i === open;
          const w = Math.round(step - 12);
          return (
            <React.Fragment key={i}>
              <div style={{position: 'absolute', left: x(i), top: axis - dateSize - 60, width: w}}>
                <span style={{fontFamily: 'var(--font-display)', fontSize: dateSize, fontWeight: 780, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--color-text)', padding: '0 8px', marginLeft: -8,
                  background: on ? 'var(--color-data)' : 'transparent', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums'}}>{e.date}</span>
              </div>
              <div style={{position: 'absolute', left: x(i), top: axis - (on ? 16 : 12), width: on ? 32 : 24, height: on ? 32 : 24, boxSizing: 'border-box', background: on ? 'var(--color-data)' : 'var(--color-text)', border: on ? '4px solid var(--color-text)' : 'none'}} />
              <div style={{position: 'absolute', left: x(i), top: axis + 44, width: w}}>
                <div style={{fontFamily: 'var(--font-sans)', fontSize: n > 4 ? 31 : 36, fontWeight: 740, lineHeight: 1.2, color: 'var(--color-text)'}}>{e.title}</div>
                {e.sub && <div style={{fontFamily: 'var(--font-sans)', fontSize: 26, lineHeight: 1.35, color: 'var(--color-muted)', marginTop: 8}}>{e.sub}</div>}
              </div>
              {e.gap && i < n - 1 && i + 1 < shown && (
                <div style={{position: 'absolute', left: Math.round(x(i) + step / 2 + 12), top: axis, transform: 'translate(-50%, -50%)', background: 'var(--color-bg)', padding: '2px 12px',
                  fontFamily: 'var(--font-mono)', fontSize: 26, color: 'var(--color-text)', whiteSpace: 'nowrap', border: '1px solid var(--color-text)'}}>{e.gap}</div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </Module>
  );
}
