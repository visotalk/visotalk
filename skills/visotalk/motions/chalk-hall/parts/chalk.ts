// The board's chalks by what they mean, the filters that give a line and a letter chalk's grain, and the geometry every drawn stroke shares.
import React from 'react';
import {seededRandom} from '@motionhub/runtime';

/** white states and draws, yellow is the result, pink is what is given or substituted (and the deciding word), blue is construction: axes, helpers, rules */
export type Chalk = 'white' | 'yellow' | 'pink' | 'blue' | 'faded';
export const CHALK: Record<Chalk, string> = {
  white: 'var(--color-text)',
  yellow: 'var(--color-grad)',
  pink: 'var(--color-op)',
  blue: 'var(--color-data)',
  faded: 'var(--color-muted)',
};

/** 0 to 1, whatever is passed */
export const unit = (v: number) => Math.max(0, Math.min(1, v));

export type Pt = [number, number];
export type Stroke = Pt[];

/**
 * The filters, rendered once by every component that uses them (identical ids, so a duplicate is harmless):
 * `chalk-grain` breaks a line or a letter into the specks chalk leaves on slate and roughens its edge;
 * `chalk-haze` is the soft dust a stroke leaves beside itself; `chalk-smear` is an eraser's streaked residue.
 */
export function ChalkDefs() {
  const h = React.createElement;
  return h('svg', {width: 0, height: 0, style: {position: 'absolute'}, 'aria-hidden': true},
    h('defs', null,
      grain('chalk-grain', {x: '-8%', y: '-30%', width: '116%', height: '160%', filterUnits: 'objectBoundingBox'}),
      // for marks drawn in fractions of what they mark: the region is the mark's own svg, with room round it
      grain('chalk-grain-mark', {x: '-10%', y: '-120%', width: '120%', height: '340%', filterUnits: 'userSpaceOnUse'}),
      h('filter', {id: 'chalk-haze', filterUnits: 'userSpaceOnUse', x: -300, y: -300, width: 2600, height: 1700},
        h('feGaussianBlur', {stdDeviation: 5}),
      ),
      h('filter', {id: 'chalk-smear', x: 0, y: 0, width: '100%', height: '100%', colorInterpolationFilters: 'sRGB'},
        h('feTurbulence', {type: 'fractalNoise', baseFrequency: '0.09 0.004', numOctaves: 3, seed: 21, result: 'streak'}),
        h('feColorMatrix', {in: 'streak', type: 'matrix', values: '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1.6 0 0 0 -0.62', result: 'dust'}),
        h('feComposite', {in: 'dust', in2: 'SourceGraphic', operator: 'in'}),
      ),
    ),
  );
}

const len = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/**
 * Chalk's grain as a filter over `region`, as chalk takes to slate: the board's tooth catches the stick only on its raised
 * grains, so the edge of a stroke (where the pressure is light) breaks up and the core stays solid with a few pits; the
 * pressure swells and thins along the stroke; a faint powder lies beside it. The tooth is in board space, so every stroke
 * on the same patch of board breaks the same way.
 */
export function grain(id: string, region: Record<string, string | number>) {
  const h = React.createElement;
  return h('filter', {key: id, id, ...region, colorInterpolationFilters: 'sRGB'},
    h('feGaussianBlur', {in: 'SourceAlpha', stdDeviation: 1.1, result: 'soft'}),
    h('feTurbulence', {type: 'fractalNoise', baseFrequency: '0.62', numOctaves: 3, seed: 11, result: 'tooth'}),
    h('feColorMatrix', {in: 'tooth', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.6 0 0 0 -1.3', result: 'toothA'}),
    // what the tooth leaves of the stroke: solid where the stroke is full, broken where it thins
    h('feComposite', {in: 'soft', in2: 'toothA', operator: 'arithmetic', k1: 0, k2: 1, k3: 0.95, k4: -0.8, result: 'caught'}),
    h('feComponentTransfer', {in: 'caught', result: 'mask'}, h('feFuncA', {type: 'linear', slope: 2.3, intercept: 0})),
    h('feTurbulence', {type: 'fractalNoise', baseFrequency: '0.016', numOctaves: 2, seed: 4, result: 'press'}),
    h('feColorMatrix', {in: 'press', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.8 0 0 0 -0.08', result: 'pressA'}),
    h('feComposite', {in: 'mask', in2: 'pressA', operator: 'arithmetic', k1: 1, k2: 0, k3: 0, k4: 0, result: 'pressed'}),
    h('feComposite', {in: 'SourceGraphic', in2: 'pressed', operator: 'in', result: 'chalk'}),
    h('feTurbulence', {type: 'fractalNoise', baseFrequency: '0.09', numOctaves: 2, seed: 5, result: 'warp'}),
    h('feDisplacementMap', {in: 'chalk', in2: 'warp', scale: 2.4, xChannelSelector: 'R', yChannelSelector: 'G', result: 'edge'}),
    // the powder beside the stroke
    h('feGaussianBlur', {in: 'SourceGraphic', stdDeviation: 2.6, result: 'blur'}),
    h('feColorMatrix', {in: 'blur', type: 'matrix', values: '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.16 0', result: 'powder'}),
    h('feMerge', null, h('feMergeNode', {in: 'powder'}), h('feMergeNode', {in: 'edge'})),
  );
}

/** A grain filter fitted to these strokes (in user space, so a straight line, whose box has no height, still gets one), and its id */
export function strokeGrain(strokes: Stroke[], margin: number, key: string) {
  const xs = strokes.flat().map((p) => p[0]), ys = strokes.flat().map((p) => p[1]);
  const x = Math.floor(Math.min(...xs) - margin), y = Math.floor(Math.min(...ys) - margin);
  const w = Math.ceil(Math.max(...xs) + margin) - x, hh = Math.ceil(Math.max(...ys) + margin) - y;
  const id = `chalk-grain-${key}-${x}-${y}-${w}-${hh}`.replace(/[^a-z0-9-]/gi, '_');
  return {id, el: React.createElement('defs', null, grain(id, {x, y, width: w, height: hh, filterUnits: 'userSpaceOnUse'}))};
}

/** The strokes drawn so far at `draw` (0 to 1 of their whole length, in order), as path data, and where the chalk is now */
export function partial(strokes: Stroke[], draw: number): {d: string; head: Pt | null; angle: number} {
  const total = strokes.reduce((s, st) => s + st.slice(1).reduce((a, p, i) => a + len(st[i], p), 0), 0);
  let left = unit(draw) * total, d = '', head: Pt | null = null, angle = 0;
  for (const st of strokes) {
    if (left <= 0 || st.length < 2) break;
    d += `M${st[0][0].toFixed(1)} ${st[0][1].toFixed(1)}`;
    for (let i = 1; i < st.length; i++) {
      const seg = len(st[i - 1], st[i]);
      if (seg >= left) {
        const t = left / seg, p: Pt = [st[i - 1][0] + (st[i][0] - st[i - 1][0]) * t, st[i - 1][1] + (st[i][1] - st[i - 1][1]) * t];
        d += ` L${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
        head = p; angle = Math.atan2(st[i][1] - st[i - 1][1], st[i][0] - st[i - 1][0]); left = 0;
        break;
      }
      d += ` L${st[i][0].toFixed(1)} ${st[i][1].toFixed(1)}`;
      left -= seg;
    }
  }
  return {d, head: draw > 0 && draw < 0.999 ? head : null, angle};
}

/** A hand's line between two points: a few points along it, bowed a little and wavering, so no chalk line is ruler-true */
export function handLine(a: Pt, b: Pt, key: string, bow = 0.012): Stroke {
  const r = seededRandom(`chalk-hall/line/${key}`), n = Math.max(3, Math.round(len(a, b) / 40));
  const nx = -(b[1] - a[1]), ny = b[0] - a[0], k = bow * (r() - 0.35);
  return Array.from({length: n + 1}, (_, i) => {
    const t = i / n, s = Math.sin(Math.PI * t) * k + (i > 0 && i < n ? (r() - 0.5) * 0.0025 : 0);
    return [a[0] + (b[0] - a[0]) * t + nx * s, a[1] + (b[1] - a[1]) * t + ny * s] as Pt;
  });
}

/** A polygon as one stroke of hand lines, closed with a small overshoot past its first corner, as chalk goes round a shape */
export function handShape(corners: Pt[], key: string): Stroke {
  const out: Stroke = [];
  corners.forEach((c, i) => out.push(...handLine(c, corners[(i + 1) % corners.length], `${key}/${i}`).slice(i ? 1 : 0)));
  const [a, b] = [corners[0], corners[1]];
  out.push([a[0] + (b[0] - a[0]) * 0.06, a[1] + (b[1] - a[1]) * 0.06]);
  return out;
}

/** A circle as a stroke that starts at `from` radians and closes a little past where it began */
export function handCircle(c: Pt, r: number, from = -2.2, over = 0.25): Stroke {
  const n = Math.max(24, Math.round(r / 3));
  return Array.from({length: n + 1}, (_, i) => {
    const a = from + ((Math.PI * 2 + over) * i) / n, w = 1 + 0.025 * Math.sin(a * 3 + 1);
    return [c[0] + Math.cos(a) * r * w, c[1] + Math.sin(a) * r * w] as Pt;
  });
}

/** An arc as a stroke from `from` to `to` radians (clockwise when `to` is larger): a cycle's arrows, an angle's mark */
export function handArc(c: Pt, r: number, from: number, to: number): Stroke {
  const n = Math.max(8, Math.round((Math.abs(to - from) * r) / 12));
  return Array.from({length: n + 1}, (_, i) => {
    const a = from + ((to - from) * i) / n, w = 1 + 0.02 * Math.sin(a * 3 + 1);
    return [c[0] + Math.cos(a) * r * w, c[1] + Math.sin(a) * r * w] as Pt;
  });
}
