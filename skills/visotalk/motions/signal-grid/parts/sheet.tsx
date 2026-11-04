import React from 'react';
import type {ReactNode} from 'react';

export const meta = {
  name: {en: 'Grid sheet', 'zh-CN': '栅格底版'},
  purpose: 'ground',
  line: 'Cool paper, a running head, a numbered column ruler, twelve hairline columns that fill while modules move.',
  fits: 'every scene; litCol, litSpan on the module being said',
  params: {
    head: {type: 'text', default: '', doc: 'the running head: course, report or series, short'},
    folio: {type: 'text', default: '', doc: 'the folio on the right: "03 / 08"'},
    reveal: {type: 'progress', default: 0, doc: '0 at rest (hairline columns), 1 while the board re-flows (columns filled)'},
    litCol: {type: 'number', default: 1, doc: 'the first column the ruler\'s signal covers: the same col as the module it points at; fractional while it moves'},
    litSpan: {type: 'number', default: 0, doc: 'how many columns the signal covers: the module\'s span; 0 hides it'},
    slot: {type: 'list', default: null, doc: '{col, span, top, height}: where a moving module will land, outlined while reveal is up'},
  },
  preview: 6.2,
};

// The one grid every module is set on: 12 columns of 122 px with 24 px gutters inside 96 px margins.
// A module is placed by column and span, never by pixels, so a tweened `col` or `span` re-flows it,
// and the ruler's signal, given the same col and span, covers exactly the module's width.
export const MARGIN = 96;
export const GUTTER = 24;
export const COL = 122;
export const STEP = COL + GUTTER;
export const RULER = 92;    // the ruler band's top edge, under the running head
export const TOP = 168;     // where the board starts
export const FLOOR = 872;   // nothing is set below this: the captions live under it

export const colX = (col: number) => Math.round(MARGIN + (col - 1) * STEP);
export const spanW = (span: number) => Math.round(span * STEP - GUTTER);
export const unit = (v: number) => Math.max(0, Math.min(1, v));

/** A number as printed: grouped from 10,000 up (so 1582 and 2025 stay years), every decimal it was given kept. */
export const num = (v: number) => v.toLocaleString('en-US', {maximumFractionDigits: 20, useGrouping: Math.abs(v) >= 10000});

/** "+18.5%" counted up to `p` of its value, keeping its decimals, grouping and the text around it. */
export function countTo(text: string, p: number) {
  const m = /-?\d[\d,]*(?:\.\d+)?/.exec(text);
  if (!m || p >= 1) return text;
  const raw = m[0];
  const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
  const v = Number(raw.replace(/,/g, '')) * unit(p);
  const shown = raw.includes(',') ? v.toLocaleString('en-US', {minimumFractionDigits: decimals, maximumFractionDigits: decimals}) : v.toFixed(decimals);
  return text.slice(0, m.index) + shown + text.slice(m.index + raw.length);
}

/** Splits "I lost my keys {yesterday}." into plain and marked runs. */
export const runs = (text: string) => text.split(/(\{[^}]*\})/).filter(Boolean).map((s) => (s.startsWith('{') ? {mark: true, s: s.slice(1, -1)} : {mark: false, s}));

/** A run of text with its {marked} phrases blocked in the signal colour, the block wiping in left to right as `mark` goes 0 to 1. */
export function Marked({text, mark = 1}: {text: string; mark?: number}) {
  const m = unit(mark);
  return (
    <>
      {runs(text).map((r, i) => r.mark ? (
        <span key={i} style={{backgroundImage: 'linear-gradient(var(--color-data), var(--color-data))', backgroundRepeat: 'no-repeat', backgroundSize: `${(m * 100).toFixed(1)}% 100%`,
          padding: '0 0.14em', margin: '0 -0.04em', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone', fontWeight: m > 0.5 ? 700 : 'inherit'}}>{r.s}</span>
      ) : <span key={i}>{r.s}</span>)}
    </>
  );
}

/** A module: set on the grid by column, its top edge a heavy ink rule with an index and a label in mono. No box, no radius, no shadow. */
export function Module({col, span, top, height, index = '', label = '', rule = 3, children}: {col: number; span: number; top: number; height?: number; index?: string; label?: string; rule?: number; children?: ReactNode}) {
  return (
    <div style={{position: 'absolute', left: colX(col), top, width: spanW(span), ...(height ? {height} : {}), boxSizing: 'border-box', borderTop: rule ? `${rule}px solid var(--color-text)` : 'none'}}>
      {(index || label) && (
        <div style={{display: 'flex', gap: 18, alignItems: 'baseline', paddingTop: 12, fontFamily: 'var(--font-mono)', fontSize: 25, letterSpacing: '0.03em', color: 'var(--color-text)'}}>
          {index && <span style={{fontWeight: 700}}>{index}</span>}
          {label && <span style={{color: 'var(--color-muted)'}}>{label}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

const COLS = Array.from({length: 12}, (_, i) => i + 1);

type Slot = {col: number; span: number; top: number; height: number};

export function Sheet({head = '', folio = '', reveal = 0, litCol = 1, litSpan = 0, slot = null}: {head?: string; folio?: string; reveal?: number; litCol?: number; litSpan?: number; slot?: Slot | null}) {
  const r = unit(reveal);
  const line = `color-mix(in srgb, var(--color-faint) ${Math.round(55 + 45 * r)}%, transparent)`;
  const litL = colX(litCol);
  const litR = litL + spanW(litSpan);
  return (
    <div style={{position: 'absolute', inset: 0, background: 'var(--color-bg)', overflow: 'hidden'}}>
      {/* the columns: hairlines at rest, filled fields while the board re-flows */}
      {COLS.map((c) => (
        <div key={c} style={{position: 'absolute', left: colX(c), top: RULER + 48, width: COL, height: FLOOR - RULER - 48, boxSizing: 'border-box',
          borderLeft: `1px solid ${line}`, borderRight: `1px solid ${line}`,
          background: `color-mix(in srgb, var(--color-faint) ${Math.round(22 * r)}%, transparent)`}} />
      ))}
      {/* where the moving module lands, outlined while the board re-flows */}
      {slot && r > 0.01 && (
        <div style={{position: 'absolute', left: colX(slot.col), top: slot.top, width: spanW(slot.span), height: slot.height, boxSizing: 'border-box', border: '2px dashed var(--color-text)', opacity: r}}>
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([h, v], i) => <div key={i} style={{position: 'absolute', [h < 0 ? 'left' : 'right']: -2, [v < 0 ? 'top' : 'bottom']: -2, width: 14, height: 14, background: 'var(--color-text)'}} />)}
        </div>
      )}
      {/* the running head */}
      <div style={{position: 'absolute', left: MARGIN, right: MARGIN, top: 36, height: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        fontFamily: 'var(--font-mono)', fontSize: 26, letterSpacing: '0.04em', color: 'var(--color-text)'}}>
        <span>{head}</span>
        <span style={{fontWeight: 700}}>{folio}</span>
      </div>
      <div style={{position: 'absolute', left: MARGIN, right: MARGIN, top: 82, height: 3, background: 'var(--color-text)'}} />
      {/* the ruler: column numbers, and the signal on the columns being spoken about, edge to edge with them */}
      {litSpan > 0.01 && <div style={{position: 'absolute', left: litL, top: RULER, width: litR - litL, height: 40, background: 'var(--color-data)'}} />}
      {COLS.map((c) => {
        const lit = litSpan > 0.01 && colX(c) + COL / 2 > litL && colX(c) + COL / 2 < litR;
        return (
          <div key={c} style={{position: 'absolute', left: colX(c), top: RULER, width: COL, height: 40, display: 'flex', alignItems: 'center', paddingLeft: 10, boxSizing: 'border-box',
            borderLeft: '2px solid var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, color: lit ? 'var(--color-text)' : 'var(--color-muted)'}}>{String(c).padStart(2, '0')}</div>
        );
      })}
      <div style={{position: 'absolute', left: MARGIN, right: MARGIN, top: RULER + 46, height: 2, background: 'var(--color-text)'}} />
      {/* the floor rule, above the caption band */}
      <div style={{position: 'absolute', left: MARGIN, right: MARGIN, top: FLOOR, height: 1, background: line}} />
    </div>
  );
}
