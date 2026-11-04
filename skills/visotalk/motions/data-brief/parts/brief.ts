// Shared by Data Brief's components: the one-highlight rule, the reading guide, number formatting and the scale.

export const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

/** How much of the highlight item i holds when the focus is at f (a fractional focus is the highlight passing between two items) */
export const held = (i: number, f: number) => clamp(1 - Math.abs(i - f));

/** The highlight colour mixed into an item's own grey by w (0 grey, 1 highlight) */
export const ink = (w: number, base = 'var(--color-faint)') =>
  w <= 0 ? base : w >= 1 ? 'var(--color-data)' : `color-mix(in srgb, var(--color-data) ${Math.round(w * 100)}%, ${base})`;

/** A figure as a report sets it: grouped thousands, a fixed number of decimals */
export const fmt = (v: number, decimals = 0) =>
  v.toLocaleString('en-US', {minimumFractionDigits: decimals, maximumFractionDigits: decimals});

/** How many decimals a step needs: 0.5 needs one, 25 none */
export const stepDecimals = (step: number) => { const t = String(step); return t.includes('.') ? t.split('.')[1].length : 0; };

/** The ticks from min to max every step (min, max and step are the film's: a scale is a decision, not a default) */
export const ticks = (min: number, max: number, step: number) => {
  const out: number[] = [];
  for (let v = min; v <= max + step * 1e-6; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
};

/** The part of the span [a0, a1] that lies under [b0, b1], or null */
export const under = (a0: number, a1: number, b0: number, b1: number): [number, number] | null => {
  const lo = Math.max(a0, b0), hi = Math.min(a1, b1);
  return hi > lo ? [lo, hi] : null;
};

/** The reading guide's tint and its ruled edges: one look in every component */
export const GUIDE = {fill: 'color-mix(in srgb, var(--color-data) 11%, transparent)', edge: 'var(--color-data)', width: 3};

/** A rough width of a string set at size px, for boxes drawn in SVG: wide (CJK, full-width) characters count a whole em, Latin about half (mono 0.6) */
export const textW = (s: string, size: number, mono = false) => {
  let em = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    if (c >= 0x2e80 && c <= 0xffef && !(c >= 0xff61 && c <= 0xff9f)) em += 1;
    else if (mono) em += 0.6;
    else if (ch === ' ') em += 0.27;
    else if (/[A-Z0-9%$€£¥]/.test(ch)) em += 0.64;
    else if (/[mwMW@]/.test(ch)) em += 0.82;
    else if (/[iljt.,:;'!|·]/.test(ch)) em += 0.3;
    else em += 0.54;
  }
  return Math.ceil(em * size);
};

/** The size a one-line text is set at so it fits width w: its wanted size, never under min */
export const fitSize = (s: string, size: number, w: number, min: number, mono = false) => {
  const need = textW(s, size, mono);
  return need <= w ? size : Math.max(min, Math.floor(size * (w / need)));
};

/** Does the box [x0, y0, x1, y1] touch any segment of these polylines (pad px of air around the box)? */
export const hits = (box: [number, number, number, number], lines: [number, number][][], pad = 6) => {
  const [x0, y0, x1, y1] = [box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad];
  const inside = (p: [number, number]) => p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1;
  const cross = (a: [number, number], b: [number, number], c: [number, number], d: [number, number]) => {
    const o = (p: number[], q: number[], r: number[]) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
    return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
  };
  const edges: [[number, number], [number, number]][] = [[[x0, y0], [x1, y0]], [[x1, y0], [x1, y1]], [[x1, y1], [x0, y1]], [[x0, y1], [x0, y0]]];
  for (const pts of lines) for (let k = 0; k < pts.length; k++) {
    if (inside(pts[k])) return true;
    if (k && edges.some(([c, d]) => cross(pts[k - 1], pts[k], c, d))) return true;
  }
  return false;
};

/** The smallest round stride (1, 2, 5, 10, 20, 25, 50, 100…) at least k, so thinned labels fall on round periods */
export const niceEvery = (k: number) => {
  if (k <= 1) return 1;
  for (let m = 1; ; m *= 10) for (const b of [1, 2, 2.5, 5]) if (b * m >= k && Number.isInteger(b * m)) return b * m;
};

/** Labels stacked at their wanted y, pushed apart to at least gap px, kept inside [lo, hi] */
export const spread = (want: number[], gap: number, lo: number, hi: number) => {
  const order = want.map((y, i) => ({y, i})).sort((a, b) => a.y - b.y);
  for (let k = 1; k < order.length; k++) order[k].y = Math.max(order[k].y, order[k - 1].y + gap);
  const over = order.length ? order[order.length - 1].y - hi : 0;
  if (over > 0) for (const o of order) o.y -= over;
  for (let k = 0; k < order.length; k++) order[k].y = Math.max(order[k].y, k ? order[k - 1].y + gap : lo);
  const out = new Array<number>(want.length);
  for (const o of order) out[o.i] = o.y;
  return out;
};
