import React from 'react';
import {Module, STEP, spanW, unit} from './sheet.tsx';

export const meta = {
  name: {en: 'Process row', 'zh-CN': '流程行'},
  purpose: 'steps',
  line: 'Numbered blocks on whole columns joined by arrows; a return arrow closes a cycle.',
  fits: 'causes and effects, a pipeline, a cycle; 2–6 steps',
  params: {
    steps: {type: 'list', doc: '[{label, sub?}]: each block\'s name and one short line under it'},
    shown: {type: 'number', default: 99, doc: 'how many blocks are built; the rest wait as empty slots'},
    focus: {type: 'number', default: -1, doc: 'the block being said, from 0; -1: none'},
    loop: {type: 'list', default: null, doc: '{from, to, label}: a return arrow from block `from` back to block `to`, named'},
    looped: {type: 'progress', default: 1, doc: '0 to 1: how much of the return arrow is drawn'},
    label: {type: 'text', default: '', doc: 'the module label'},
    index: {type: 'text', default: '', doc: 'the module index'},
    col: {type: 'number', default: 1, doc: 'the first column'},
    span: {type: 'number', default: 12, doc: 'how many columns'},
    top: {type: 'px', default: 340, doc: 'its top edge'},
    height: {type: 'px', default: 190, doc: 'each block\'s height'},
  },
  preview: 13.9,
};

type Step = {label: string; sub?: string};
type Loop = {from: number; to: number; label: string};

const ARROW = 56; // taken from each block's right end for the arrow to the next

export function Flow({steps, shown = 99, focus = -1, loop = null, looped = 1, label = '', index = '', col = 1, span = 12, top = 340, height = 190}: {steps: Step[]; shown?: number; focus?: number; loop?: Loop | null; looped?: number; label?: string; index?: string; col?: number; span?: number; top?: number; height?: number}) {
  const n = steps.length;
  const per = Math.max(1, Math.floor(span / n));
  const bw = spanW(per) - (n > 1 ? ARROW : 0);
  const bx = (i: number) => i * per * STEP;
  const W = spanW(per * n);
  const y0 = 40; // under the module's rule and label
  const loopY = y0 + height + 64;
  const l = unit(looped);
  const big = bw >= 300 ? 40 : bw >= 200 ? 32 : 28;
  let loopPath = '';
  let loopLen = 0;
  if (loop) {
    const xa = bx(loop.from) + bw / 2;
    const xb = bx(loop.to) + bw / 2;
    loopPath = `M${xa} ${y0 + height} V${loopY} H${xb} V${y0 + height + 16}`;
    loopLen = (loopY - y0 - height) + Math.abs(xa - xb) + (loopY - y0 - height - 16);
  }
  const H = loop ? loopY + 44 : y0 + height;
  return (
    <Module col={col} span={per * n} top={top} index={index} label={label}>
      <div style={{position: 'relative', height: H}}>
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          {steps.slice(0, -1).map((_, i) => {
            if (i + 1 >= shown) return null;
            const x0 = bx(i) + bw + 8;
            const x1 = bx(i + 1) - 8;
            const y = y0 + height / 2;
            return <path key={i} d={`M${x0} ${y - 2}H${x1 - 18}V${y - 10}L${x1} ${y}L${x1 - 18} ${y + 10}V${y + 2}H${x0}Z`} fill="var(--color-text)" />;
          })}
          {loop && shown >= n && (
            <>
              <path d={loopPath} fill="none" stroke="var(--color-text)" strokeWidth={4} strokeDasharray={loopLen} strokeDashoffset={loopLen * (1 - l)} />
              {l > 0.98 && <path d={`M${bx(loop.to) + bw / 2 - 11} ${y0 + height + 22}L${bx(loop.to) + bw / 2} ${y0 + height + 2}L${bx(loop.to) + bw / 2 + 11} ${y0 + height + 22}Z`} fill="var(--color-text)" />}
            </>
          )}
        </svg>
        {loop && shown >= n && l > 0.4 && (
          <div style={{position: 'absolute', left: Math.round((bx(loop.to) + bx(loop.from)) / 2 + bw / 2), top: loopY, transform: 'translate(-50%, -50%)', background: 'var(--color-bg)', padding: '0 22px',
            fontFamily: 'var(--font-sans)', fontSize: 32, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap'}}>{loop.label}</div>
        )}
        {steps.map((s, i) => {
          const built = i < shown;
          const on = i === focus;
          return (
            <div key={i} style={{position: 'absolute', left: bx(i), top: y0, width: bw, minHeight: height, boxSizing: 'border-box', padding: '14px 18px',
              border: built ? '3px solid var(--color-text)' : '2px dashed var(--color-faint)', background: on ? 'var(--color-data)' : built ? 'var(--color-panel)' : 'transparent',
              display: 'flex', flexDirection: 'column'}}>
              <div style={{fontFamily: 'var(--font-mono)', fontSize: 25, fontWeight: 700, color: built ? 'var(--color-text)' : 'var(--color-faint)'}}>{String(i + 1).padStart(2, '0')}</div>
              {built && <div style={{marginTop: 'auto', fontFamily: 'var(--font-sans)', fontSize: big, fontWeight: 760, lineHeight: 1.12, color: 'var(--color-text)'}}>{s.label}</div>}
              {built && s.sub && <div style={{marginTop: 6, fontFamily: 'var(--font-sans)', fontSize: 27, lineHeight: 1.25, color: on ? 'var(--color-text)' : 'var(--color-muted)'}}>{s.sub}</div>}
            </div>
          );
        })}
      </div>
    </Module>
  );
}
