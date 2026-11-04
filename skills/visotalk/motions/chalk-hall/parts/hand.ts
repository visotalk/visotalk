// The chalk hand: text laid out from the single-line strokes of hand-font.ts and written stroke by stroke, the way chalk
// writes, with the pen lifted between strokes and each letter a little off true. Every component that puts words on the
// board draws them with `Chalked`, so the whole board is written by one hand.
import React from 'react';
import {seededRandom} from '@motionhub/runtime';
import {HAND} from './hand-font.ts';
import {CHALK, strokeGrain, unit, type Chalk, type Pt} from './chalk.ts';

/**
 * Glyphs a board needs that the font draws too small, too plain or not at all, in its units (y down, baseline 790, x-height
 * 350, cap height 120): a 1 with its flag and a capital I with its bars, so neither reads as l; a full stop with room
 * round it, so 0.5 never reads as 05; a bar tall enough to tell |a| from lal; the signs of a formula and science.
 */
const EXTRA: Record<string, [number, string]> = {
  '1': [330, '92 262 178 124 160 788'],
  '.': [230, '100 774 116 770'],
  ':': [230, '104 452 120 448|104 772 120 768'],
  '|': [240, '120 40 122 900'],
  '±': [540, '270 330 276 610|100 470 440 464|100 720 440 714'],
  '≈': [560, '90 480 160 440 250 470 330 500 420 460 470 440|90 610 160 570 250 600 330 630 420 590 470 570'],
  'Δ': [600, '300 130 70 786 540 786 304 136'],
  'θ': [440, '220 120 110 200 70 450 110 700 220 790 330 700 370 450 330 200 220 120|90 450 350 450'],
  'Ω': [640, '80 786 230 786 120 600 110 400 190 210 320 130 450 210 530 400 520 600 410 786 560 786'],
  'I': [280, '62 128 214 126|138 128 134 786|60 788 218 782'],
  '=': [540, '92 468 452 460|96 600 456 592'],
  '−': [540, '92 532 452 526'],
  '×': [540, '132 376 418 690|418 376 132 690'],
  '÷': [560, '84 532 474 526|272 392 282 404|270 668 280 680'],
  '≤': [560, '452 296 104 438 452 578|104 690 452 682'],
  '≥': [560, '108 296 456 438 108 578|108 690 456 682'],
  '√': [600, '40 520 112 478 196 792 290 78 580 78'],
  '→': [620, '80 532 528 526|432 446 530 528 432 614'],
  '←': [620, '540 532 92 526|188 446 88 528 188 614'],
};
const glyph = (ch: string) => EXTRA[ch] ?? HAND[ch];

/**
 * A Chinese character's strokes in writing order, when the engine embedded them: `visotalk build` fetches the stroke order of the
 * document's own characters on demand (Make Me a Hanzi's medians) and sets `__VISOTALK_STROKES__` before the film plays. Without
 * it (offline, a character the data lacks, another engine) the character is drawn whole.
 */
const strokesOf = (ch: string) => (globalThis as {__VISOTALK_STROKES__?: Record<string, number[][][]>}).__VISOTALK_STROKES__?.[ch];

/** px per font unit at `size` px: a capital is 0.62 of the size, close to a print face's at the same size */
const unitPx = (size: number) => size / 1080;
const BASELINE = 0.92, LINE = 1.32;
/** Characters written as whole glyphs of the display face (Chinese, and what the hand has no strokes for), with their width in ems */
const isWide = (ch: string) => /[\u2e80-\u9fff\u3000-\u303f\uff00-\uffef\uac00-\ud7af]/.test(ch);

export type Piece = {text: string; x?: number; y?: number; size: number; chalk?: Chalk};
type Item = {color: string; len: number} & ({pts: Pt[]; weight: number} | {ch: string; at: Pt; size: number});

/** `[3]` is chalked pink (what is given or substituted), `{5}` yellow (the result); the rest in the piece's own chalk */
function runs(text: string, base: Chalk): {text: string; chalk: Chalk}[] {
  return text.split(/(\[[^\]]*\]|\{[^}]*\})/).filter(Boolean).map((p) => p[0] === '[' ? {text: p.slice(1, -1), chalk: 'pink' as Chalk}
    : p[0] === '{' ? {text: p.slice(1, -1), chalk: 'yellow' as Chalk} : {text: p, chalk: base});
}

/** Lays one line of text out at (x0, y0), the top of its line box; returns its items in writing order and its width */
function line(text: string, x0: number, y0: number, size: number, base: Chalk, seed: string, out: Item[]) {
  const r = seededRandom(`chalk-hall/hand/${seed}`);
  let x = x0;
  for (const run of runs(text, base)) {
    const color = CHALK[run.chalk];
    for (const ch of run.text) {
      // ² ³ are written small and raised, ₀ to ₉ small and lowered (CO₂, H₂O)
      const sub = ch >= '₀' && ch <= '₉', sup = ch === '²' || ch === '³' || sub, k = unitPx(size) * (sup ? 0.62 : 1), lift = sub ? -size * 0.14 : sup ? size * 0.42 : 0;
      const g = sub ? glyph(String(ch.charCodeAt(0) - 0x2080)) : sup ? glyph(ch === '²' ? '2' : '3') : glyph(ch);
      if (ch === ' ') { x += 300 * unitPx(size); continue; }
      const hz = !g ? strokesOf(ch) : undefined;
      if (hz) {
        // a Chinese character written stroke by stroke from its medians, in standard stroke order (1024 box, y up)
        const gs = 0.9 * size, kz = gs / 1024, top = y0 + BASELINE * size - 0.8 * size;
        const rot = (r() - 0.5) * 0.05, sc = 0.97 + r() * 0.06, cx = x + gs / 2, cy = top + gs / 2, c = Math.cos(rot), sn = Math.sin(rot);
        for (const m of hz) {
          const pts: Pt[] = m.map(([mx, my]) => {
            const px = (x + mx * kz - cx) * sc, py = (top + (900 - my) * kz - cy) * sc;
            return [cx + px * c - py * sn, cy + px * sn + py * c] as Pt;
          });
          const l = pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
          out.push({pts, color, weight: Math.max(2.4, size / 14.5), len: Math.max(l, size * 0.05)});
        }
        x += gs + size * 0.08; continue;
      }
      if (!g) {
        // a sign the hand lacks, or a Chinese character with no strokes embedded: the display face's glyph, written as one
        // a Chinese character is set at 0.86 of the size: as tall as the hand's capitals with its own ascent, and inside the line box
        const gs = (isWide(ch) ? 0.86 : 1) * size, w = (isWide(ch) ? 1.0 : 0.56) * gs;
        out.push({ch, at: [x, y0 + BASELINE * size], size: gs, color, len: size * (isWide(ch) ? 2.4 : 1.2)});
        x += w + (isWide(ch) ? size * 0.06 : 0); continue;
      }
      // each letter a little off true: turned, raised or lowered, wider or narrower, as no hand writes the same letter twice
      const w = g[0] * k, cx = x + w / 2, cy = y0 + BASELINE * size - lift - 0.33 * size;
      const rot = (r() - 0.5) * 0.07, sc = 0.96 + r() * 0.08, dy = (r() - 0.5) * 0.035 * size, dx = (r() - 0.5) * 0.025 * size;
      const c = Math.cos(rot), s = Math.sin(rot);
      for (const st of g[1].split('|')) {
        const v = st.split(' ').map(Number), pts: Pt[] = [];
        for (let i = 0; i < v.length; i += 2) {
          const px = (x + v[i] * k - cx) * sc, py = (y0 + BASELINE * size - lift + (v[i + 1] - 790) * k - cy) * sc;
          pts.push([cx + dx + px * c - py * s, cy + dy + px * s + py * c]);
        }
        const weight = Math.max(2.4, size / 13) * (sup ? 0.8 : 1);
        let l = pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
        // a dot (a full stop, the dot of an i) is a stroke with no length: chalk leaves a short dab there
        if (l < weight * 0.6) { pts.splice(1, pts.length, [pts[0][0] + weight * 0.45, pts[0][1] + weight * 0.15]); l = weight * 0.48; }
        out.push({pts, color, weight, len: l});
      }
      x += w * (0.98 + r() * 0.05);
    }
  }
  return x - x0;
}

/** Text broken into lines no wider than `width` (at spaces, or between Chinese characters) */
function wrap(text: string, size: number, width: number) {
  const words = text.split(/(?<=\s)|(?=[\u2e80-\u9fff])|(?<=[\u2e80-\u9fff])/), lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur + w;
    if (cur && measure(next.trimEnd(), size).width > width) { lines.push(cur.trimEnd()); cur = w.trimStart(); } else cur = next;
  }
  if (cur.trim()) lines.push(cur.trimEnd());
  return lines;
}

/** The pieces laid out: every item in the order the hand writes them, and the box they fill */
export function layout(pieces: Piece[], seed: string, width = 0) {
  const items: Item[] = []; let w = 0, h = 0;
  pieces.forEach((p, i) => {
    const lines = width ? wrap(p.text, p.size, width) : [p.text];
    lines.forEach((t, j) => {
      const y = (p.y ?? 0) + j * p.size * 1.22;
      w = Math.max(w, (p.x ?? 0) + line(t, p.x ?? 0, y, p.size, p.chalk ?? 'white', `${seed}/${i}/${j}/${t}`, items));
      h = Math.max(h, y + p.size * LINE);
    });
  });
  return {items, width: w, height: h};
}

/** The width and height one line of text takes at `size` */
export function measure(text: string, size: number) {
  const {width, height} = layout([{text, size}], 'measure');
  return {width, height: height || size * LINE};
}

/** For each item, how much of it is written at `write` (0 to 1 of the whole), a pen lift between items taking time with no chalk */
function written(items: Item[], write: number, air: number) {
  const total = items.reduce((a, it) => a + it.len + air, 0);
  let t = unit(write) * total;
  return items.map((it) => {
    if (t <= air) { t = 0; return 0; }
    t -= air; const d = Math.min(it.len, t); t -= d; return d / it.len;
  });
}

/** A dot's grain: the specks and the ragged rim of chalk, without the pressure that thins a stroke, which would take a dot whole */
function dotGrain(id: string) {
  const h = React.createElement;
  return h('filter', {id, x: '-60%', y: '-60%', width: '220%', height: '220%', colorInterpolationFilters: 'sRGB'},
    h('feTurbulence', {type: 'fractalNoise', baseFrequency: '0.8', numOctaves: 2, seed: 17, result: 'speck'}),
    h('feColorMatrix', {in: 'speck', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -3 0 0 0 2.25', result: 'holes'}),
    h('feComposite', {in: 'SourceGraphic', in2: 'holes', operator: 'in', result: 'grained'}),
    h('feTurbulence', {type: 'fractalNoise', baseFrequency: '0.12', numOctaves: 2, seed: 5, result: 'warp'}),
    h('feDisplacementMap', {in: 'grained', in2: 'warp', scale: 2.6, xChannelSelector: 'R', yChannelSelector: 'G'}));
}

/** A stroke cut at `f` of its length */
function cut(pts: Pt[], f: number, len: number) {
  let left = f * len, d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length && left > 0; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]), t = Math.min(1, left / seg);
    d += ` L${(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t).toFixed(1)} ${(pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t).toFixed(1)}`;
    left -= seg;
  }
  return d;
}

/**
 * Pieces of text written on the board by the chalk hand: `write` 0 to 1 is how much is written, stroke by stroke in order. A
 * box the size of the writing (or `width` wide, wrapping), drawn from its top left.
 */
export function Chalked({pieces, write = 1, seed = '', width = 0, style}: {pieces: Piece[]; write?: number; seed?: string; width?: number; style?: React.CSSProperties}) {
  const h = React.createElement;
  const key = seed || pieces.map((p) => p.text).join('·');
  const {items, width: w, height} = layout(pieces, key, width);
  const size = Math.max(...pieces.map((p) => p.size));
  const done = written(items, write, size * 0.3);
  const box: Pt[] = [[0, 0], [w || 1, height || 1]];
  const g = strokeGrain([box], size * 0.4, `hand-${Math.round(size)}`);
  const paths: React.ReactNode[] = [], dots: React.ReactNode[] = [], glyphs: React.ReactNode[] = [];
  items.forEach((it, i) => {
    const f = done[i];
    if (f <= 0) return;
    if ('pts' in it) {
      // a dot is too small for the tooth's erosion, which would take it whole: it gets a grain of its own
      (it.len < it.weight ? dots : paths).push(h('path', {key: i, d: cut(it.pts, f, it.len), fill: 'none', stroke: it.color, strokeWidth: it.len < it.weight ? it.weight * 1.3 : it.weight, strokeLinecap: 'round', strokeLinejoin: 'round'}));
    } else {
      // a whole glyph is written from its top left to its bottom right, its edge soft as chalk's
      const id = `hand-glyph-${key.length}-${i}-${Math.round(it.at[0])}`.replace(/[^a-z0-9-]/gi, '_');
      glyphs.push(h('g', {key: i},
        h('defs', null, h('linearGradient', {id, x1: 0, y1: 0, x2: 1, y2: 1},
          h('stop', {offset: Math.max(0, f * 1.2 - 0.2), stopColor: '#fff'}), h('stop', {offset: f * 1.2, stopColor: '#fff', stopOpacity: 0}))),
        h('mask', {id: `${id}-m`}, h('rect', {x: it.at[0] - it.size * 0.1, y: it.at[1] - it.size, width: it.size * 1.2, height: it.size * 1.25, fill: `url(#${id})`})),
        h('text', {x: it.at[0], y: it.at[1], fill: it.color, mask: f < 1 ? `url(#${id}-m)` : undefined,
          style: {fontFamily: 'var(--font-display)', fontSize: it.size, stroke: it.color, strokeWidth: it.size / 70}}, it.ch)));
    }
  });
  return h('div', {style: {position: 'relative', width: w, height, ...style}},
    h('svg', {width: w || 1, height: height || 1, style: {position: 'absolute', left: 0, top: 0, overflow: 'visible'}},
      g.el, h('g', {filter: `url(#${g.id})`}, ...glyphs, ...paths),
      dots.length ? h('defs', null, dotGrain(`${g.id}-dot`)) : null,
      h('g', {filter: `url(#${g.id}-dot)`}, ...dots)));
}
