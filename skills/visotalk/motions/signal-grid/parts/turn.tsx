import React from 'react';
import {COL, FLOOR, RULER, colX, unit} from './sheet.tsx';

export const meta = {
  name: {en: 'Column turn', 'zh-CN': '列翻页'},
  purpose: 'transition',
  line: 'The page turns by columns: twelve ink slabs drop left to right and lift on the next page.',
  fits: 'between pages; swap modules while turn passes 0.5',
  params: {
    turn: {type: 'progress', default: 0, doc: '0 to 1: the slabs drop (to 0.5, the board is covered) and lift (to 1); tween it over 0.9 to 1.2 s'},
    label: {type: 'text', default: '', doc: 'a word set in the yellow on the covered board: the next section, a year'},
  },
  preview: 26.45,
};

/** On top of every module: one ink slab per column, staggered left to right, that drops to the floor and lifts again. */
export function Turn({turn = 0, label = ''}: {turn?: number; label?: string}) {
  const p = unit(turn);
  if (p <= 0 || p >= 1) return null;
  const H = FLOOR - RULER;
  const lag = 0.035; // each column starts this much of the turn after the one on its left
  const span = 1 - 11 * lag;
  const ease = (x: number) => 1 - Math.pow(1 - unit(x), 3);
  const covered = Array.from({length: 12}, (_, i) => {
    const t = (p - i * lag) / span; // 0..1 for this column
    return t < 0.5 ? {top: 0, h: ease(t * 2) * H} : {top: ease((t - 0.5) * 2) * H, h: H - ease((t - 0.5) * 2) * H};
  });
  const full = covered.every((c) => c.top === 0 && c.h >= H - 1);
  const show = unit(1 - Math.abs(p - 0.5) * 8);
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      {covered.map((c, i) => (
        <div key={i} style={{position: 'absolute', left: colX(i + 1) - 12, width: COL + 24, top: RULER + c.top, height: Math.max(0, c.h), background: 'var(--color-text)'}}>
          {c.h > 6 && <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, background: 'var(--color-data)'}} />}
        </div>
      ))}
      {label && show > 0 && (
        <div style={{position: 'absolute', left: colX(1), top: RULER + H / 2 - 70, opacity: full ? show : show * 0.9, fontFamily: 'var(--font-display)', fontSize: 120, fontWeight: 800,
          letterSpacing: '-0.03em', lineHeight: 1, color: 'var(--color-text)', background: 'var(--color-data)', padding: '10px 28px'}}>{label}</div>
      )}
    </div>
  );
}
