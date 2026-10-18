/**
 * Frame QA on measured layout (window.__visotalk.inspect, packages/runtime/src/inspect.ts):
 *   overflow   what an object draws extends past its box
 *   clipped    text or content cut off inside an object (overflow hidden)
 *   offscreen  drawn outside the canvas
 *   caption    drawn under the visible caption
 *   text-overlap  two pieces of text draw over each other, wherever they are
 *   text-crossed  a shape cuts through text: the edge of the card it rests on, a shape drawn over it, a line across it
 * Shapes layering over shapes is not checked: a grid under a curve, a ring round a planet and a glow behind a card are the picture, and a clash between
 * them shows on the still. Text is what has to stay legible.
 */
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface ObjectInspection {
  id: string;
  /** the nearest registered element around it: what a part holds is inside it, which is not an overlap */
  parent: string | null;
  box: Rect;
  ink: Rect | null;
  opacity: number;
  reach?: {side: 'left' | 'right' | 'top' | 'bottom'; px: number; what: string};
  clipped: Array<{what: string; overflowX: number; overflowY: number; box: {w: number; h: number}; content: {w: number; h: number}}>;
}
export interface FrameInspection {
  width: number;
  height: number;
  objects: ObjectInspection[];
  /** every visible piece of text (a line of a text node) and the registered element it is in */
  texts: Array<{text: string; rect: Rect; of: string | null}>;
  /** text that a shape is drawn across */
  crossings: Array<{text: string; rect: Rect; by: string; byOf: string | null; of: string | null; kind: 'edge' | 'covered' | 'line'; covered: number}>;
  /** the ids of every registered element, visible or not, once per element */
  registered: string[];
  registeredGlobal?: string[];
  caption: Rect | null;
}
export interface FrameIssue {
  code: 'overflow' | 'clipped' | 'offscreen' | 'caption' | 'text-overlap' | 'text-crossed';
  at: string;
  frame: number;
  objects: string[];
  message: string;
  fix: string;
}

const FIX: Record<FrameIssue['code'], string> = {
  overflow: 'shorten the text, or give the part or element more room (w, h)',
  clipped: 'give that element at least the size its content needs (width and height below), or shorten what is in it or lower its font size, or remove its `overflow` clipping; a reveal that is meant to cut (typing, a scroller) is drawn by tweening a number that slices the content, not by clipping',
  offscreen: 'move it into the canvas, or shorten the content',
  caption: 'keep it above the two-line caption band (y 900 and below is the caption)',
  'text-overlap': 'move one of the two texts apart, make them smaller, or show them one after the other',
  'text-crossed': 'move the text clear of the shape, or put it fully on the shape (a label on a card sits inside the card), or draw the line behind a gap in the text',
};

const TOL = 6;
const area = (r: Rect) => r.w * r.h;
const intersect = (a: Rect, b: Rect): Rect | null => {
  const x0 = Math.max(a.x, b.x), y0 = Math.max(a.y, b.y), x1 = Math.min(a.x + a.w, b.x + b.w), y1 = Math.min(a.y + a.h, b.y + b.h);
  return x1 > x0 && y1 > y0 ? {x: x0, y: y0, w: x1 - x0, h: y1 - y0} : null;
};
const past = (ink: Rect, box: Rect) => Math.max(box.x - ink.x, box.y - ink.y, ink.x + ink.w - (box.x + box.w), ink.y + ink.h - (box.y + box.h));

export function frameIssues(f: FrameInspection, frame: number, at: string): FrameIssue[] {
  const out: FrameIssue[] = [];
  const add = (code: FrameIssue['code'], objects: string[], message: string) => out.push({code, at, frame, objects, message, fix: FIX[code]});
  const shown = f.objects.filter((o) => o.ink && o.opacity >= 0.5);
  for (const o of shown) {
    const ink = o.ink!;
    if (o.box.w >= 1 && o.box.h >= 1 && past(ink, o.box) > TOL) add('overflow', [o.id], `"${o.id}" draws ${Math.round(past(ink, o.box))}px past its box${o.reach ? `: ${o.reach.px}px past the ${o.reach.side} of it, by ${o.reach.what}` : ''}`);
    for (const c of o.clipped) add('clipped', [o.id], `"${o.id}": ${c.what} is cut off (${c.overflowX}px × ${c.overflowY}px): it is ${c.box.w}×${c.box.h}px and its content needs ${c.content.w}×${c.content.h}px`);
    if (past(ink, {x: 0, y: 0, w: f.width, h: f.height}) > 2) add('offscreen', [o.id], `"${o.id}" draws outside the canvas`);
    if (f.caption) {
      const hit = intersect(ink, f.caption);
      if (hit && hit.h > 2) add('caption', [o.id], `"${o.id}" is under the caption (${Math.round(hit.h)}px)`);
    }
  }
  const texts = (f.texts ?? []).filter((t) => t.rect.w > 1 && t.rect.h > 1);
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i], b = texts[j];
      const hit = intersect(a.rect, b.rect);
      if (hit && area(hit) > 60 && area(hit) > 0.1 * Math.min(area(a.rect), area(b.rect))) {
        add('text-overlap', [...new Set([a.of, b.of].filter((x): x is string => !!x))], `"${a.text.slice(0, 30)}" and "${b.text.slice(0, 30)}" draw over each other (${Math.round(hit.w)}×${Math.round(hit.h)}px)`);
      }
    }
  }
  for (const c of f.crossings ?? []) {
    const of = `${c.by}${c.byOf ? ` ("${c.byOf}")` : ''}`;
    const what = c.kind === 'edge' ? `the edge of a ${of} cuts through it (${Math.round(c.covered * 100)}% of the text is on it)` : c.kind === 'covered' ? `a ${of} is drawn over ${Math.round(c.covered * 100)}% of it` : `a ${of} is drawn across it`;
    add('text-crossed', [...new Set([c.of, c.byOf].filter((x): x is string => !!x))], `"${c.text.slice(0, 30)}": ${what}`);
  }
  return out;
}

/** Stable identity of an issue for baselines: code, objects and where */
export const issueKey = (i: {code: string; objects: string[]; at: string}) => `${i.code}:${i.objects.join('+')}@${i.at}`;

/** Where the ink is above the caption band, or null when there is none to measure (nothing drawn) */
function inkExtent(f: FrameInspection) {
  const top = f.caption ? Math.min(f.caption.y, f.height) : f.height;
  const shown = f.objects.filter((o) => o.ink && o.opacity >= 0.5);
  if (!shown.length) return null;
  const inside = shown.map((o) => intersect(o.ink!, {x: 0, y: 0, w: f.width, h: top})).filter((r): r is Rect => r !== null);
  if (!inside.length) return null;
  const x0 = Math.min(...inside.map((r) => r.x)), y0 = Math.min(...inside.map((r) => r.y));
  const x1 = Math.max(...inside.map((r) => r.x + r.w)), y1 = Math.max(...inside.map((r) => r.y + r.h));
  return {top, shown, inside, x0, y0, x1, y1};
}

/**
 * What a frame measures, in numbers: where the ink is and how much room is left on each side above the caption band, so "is it empty?" and
 * "is it small?" have an answer that does not depend on who is looking.
 */
export function frameFacts(f: FrameInspection): string | null {
  const e = inkExtent(f);
  if (!e) return null;
  const {top, shown, inside, x0, y0, x1, y1} = e;
  const COLS = 48, ROWS = 27;
  const cw = f.width / COLS, rh = top / ROWS;
  let touched = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (inside.some((k) => k.x < (c + 1) * cw && k.x + k.w > c * cw && k.y < (r + 1) * rh && k.y + k.h > r * rh)) touched++;
  }
  const pct = (n: number, of: number) => Math.round((100 * n) / of);
  return `the ink spans x ${Math.round(x0)}–${Math.round(x1)} of ${f.width} and y ${Math.round(y0)}–${Math.round(y1)} of ${Math.round(top)} (above the captions); `
    + `empty margins: left ${Math.round(x0)} px (${pct(x0, f.width)}%), right ${Math.round(f.width - x1)} px (${pct(f.width - x1, f.width)}%), top ${Math.round(y0)} px, bottom ${Math.round(top - y1)} px (${pct(top - y1, top)}%); `
    + `${shown.length} object${shown.length === 1 ? '' : 's'} touch ${pct(touched, COLS * ROWS)}% of the area above the captions`;
}

/** What the engine itself finds wrong on a frame, under the names of the audit's questions: the author cannot answer `ok` to these */
export interface FrameMeasured {
  empty: string[];
  crossing: string[];
  edges: string[];
}

/**
 * `empty`: more than a third of the width or height is bare on one side while the opposite side has less than a sixth (content pushed to one
 * edge; a centred title is bare on both and passes). `crossing`: text drawn over text, or cut by a shape. `edges`: past the canvas, under the captions,
 * past their own box or cut off.
 */
export function frameMeasured(f: FrameInspection): FrameMeasured {
  const issues = frameIssues(f, 0, '');
  const out: FrameMeasured = {empty: [], crossing: issues.filter((i) => i.code === 'text-overlap' || i.code === 'text-crossed').map((i) => i.message), edges: issues.filter((i) => i.code !== 'text-overlap' && i.code !== 'text-crossed').map((i) => i.message)};
  const e = inkExtent(f);
  if (e) {
    const sides = [{w: 'left', a: e.x0, b: f.width - e.x1, of: f.width}, {w: 'top', a: e.y0, b: e.top - e.y1, of: e.top}];
    for (const {w, a, b, of} of sides) {
      const [bare, full, name] = a >= b ? [a, b, w] : [b, a, w === 'left' ? 'right' : 'bottom'];
      if (bare > of / 3 && full < of / 6) out.empty.push(`the ${name} ${Math.round((100 * bare) / of)}% is bare while the opposite side is ${Math.round((100 * full) / of)}% (${Math.round(bare)} px against ${Math.round(full)} px)`);
    }
  }
  return out;
}
