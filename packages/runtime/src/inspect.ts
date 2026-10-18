/**
 * Frame inspection for QA: what each object actually draws in the current frame, measured in the DOM.
 * The drawn area ("ink") of an object is the union of its text runs and its painted elements (backgrounds, borders,
 * images, SVG, canvas, video), each clipped by the ancestors that clip overflow. Elements hidden by visibility or a
 * near-zero opacity (their own or an ancestor's) do not count.
 *
 * What must not collide is text: a viewer reads a picture through its words, and shapes layer on purpose (a grid under a curve, a ring round a planet).
 * So `crossings` asks, of every piece of text, what else is drawn over its glyph area: a shape's real geometry is hit-tested (fill and stroke, not its
 * bounding box), so a diagonal line or a ring only counts where it actually passes through the text.
 */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ObjectInspection {
  /** the id the document names it by (`data-vt`: a part, or an element a part registers) */
  id: string;
  /** the nearest registered element around it, if any: a part holds the targets inside it, which is not an overlap */
  parent: string | null;
  /** its box in the canvas */
  box: Rect;
  /** union of what it draws, clipped; null when nothing is visible */
  ink: Rect | null;
  /** effective opacity: its own times that of everything around it */
  opacity: number;
  /** where it draws furthest past its box, and what draws it: the side, how far, and the element or text */
  reach?: {side: 'left' | 'right' | 'top' | 'bottom'; px: number; what: string};
  /** descendants whose content is cut off by their own overflow clipping */
  clipped: Array<{what: string; overflowX: number; overflowY: number; box: {w: number; h: number}; content: {w: number; h: number}}>;
}

export interface FrameInspection {
  width: number;
  height: number;
  objects: ObjectInspection[];
  /** every visible piece of text (a line of a text node) and the registered element it is in */
  texts: Array<{text: string; rect: Rect; of: string | null}>;
  /** text that something else cuts through: a shape that covers part of it (a card edge, a bar), or a line drawn across it */
  crossings: Array<{text: string; rect: Rect; by: string; byOf: string | null; of: string | null; kind: 'edge' | 'covered' | 'line'; covered: number}>;
  /** the ids of every registered element in the page, visible or not, once per element: a document's target that is not here is a typo, one that is here twice is a clash */
  registered: string[];
  /** of those, the ones inside a part of the document (global): invisible until an appear shows them, so one nothing appears never shows */
  registeredGlobal: string[];
  caption: Rect | null;
}

const toRect = (r: DOMRect | Rect): Rect => ('w' in r ? r : {x: r.x, y: r.y, w: r.width, h: r.height});
const intersect = (a: Rect, b: Rect): Rect | null => {
  const x0 = Math.max(a.x, b.x), y0 = Math.max(a.y, b.y), x1 = Math.min(a.x + a.w, b.x + b.w), y1 = Math.min(a.y + a.h, b.y + b.h);
  return x1 > x0 && y1 > y0 ? {x: x0, y: y0, w: x1 - x0, h: y1 - y0} : null;
};
const union = (a: Rect | null, b: Rect): Rect => {
  if (!a) return b;
  const x0 = Math.min(a.x, b.x), y0 = Math.min(a.y, b.y);
  return {x: x0, y: y0, w: Math.max(a.x + a.w, b.x + b.w) - x0, h: Math.max(a.y + a.h, b.y + b.h) - y0};
};

const clips = (cs: CSSStyleDeclaration) => cs.overflowX !== 'visible' || cs.overflowY !== 'visible' || cs.clipPath !== 'none';

/** Clip a rect by `from` and every clipping ancestor of it up to (and including) `stop` */
function clipUp(r: Rect, from: Element | null, stop: Element): Rect | null {
  let cur: Rect | null = r;
  for (let a = from; a && cur; a = a.parentElement) {
    if (clips(getComputedStyle(a))) cur = intersect(cur, toRect(a.getBoundingClientRect()));
    if (a === stop) break;
  }
  return cur;
}

function painted(el: Element, cs: CSSStyleDeclaration): boolean {
  if (/^(IMG|VIDEO|CANVAS|svg)$/i.test(el.tagName)) return true;
  if (el instanceof SVGElement) return false; // the svg root stands for its content
  const bg = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent';
  const border = ['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(cs.getPropertyValue(`border-${s.toLowerCase()}-width`)) > 0);
  return bg || border || cs.backgroundImage !== 'none' || cs.boxShadow !== 'none';
}

/** A painted element this large is the backdrop of the picture, not something drawn on it: it is no ink (its text is) */
const BACKDROP = 0.9;

function inkOf(frame: HTMLElement, canvas: {width: number; height: number}): {ink: Rect | null; clipped: ObjectInspection['clipped']; pieces: Array<{r: Rect; what: string}>} {
  let ink: Rect | null = null;
  const pieces: Array<{r: Rect; what: string}> = [];
  const add = (r: Rect, what: string) => {
    ink = union(ink, r);
    pieces.push({r, what});
  };
  const label = (el: Element) => `<${el.tagName.toLowerCase()}${el.closest('[data-vt]')?.getAttribute('data-vt') ? ` in "${el.closest('[data-vt]')!.getAttribute('data-vt')}"` : ''}>`;
  const clipped: ObjectInspection['clipped'] = [];
  const walk = (el: Element) => {
    if (!el.checkVisibility({opacityProperty: true, visibilityProperty: true})) return;
    const cs = getComputedStyle(el);
    if (parseFloat(cs.opacity) < 0.05) return;
    // an svg is a box: its ink is what is drawn in it, not the box
    if (el instanceof SVGSVGElement) {
      for (const leaf of el.querySelectorAll('path,rect,ellipse,circle,line,polyline,polygon,text')) {
        if (!leaf.checkVisibility({opacityProperty: true, visibilityProperty: true}) || parseFloat(getComputedStyle(leaf).opacity) < 0.05) continue;
        const r = toRect(leaf.getBoundingClientRect());
        if (r.w > 0 || r.h > 0) add(r, label(leaf));
      }
      return;
    }
    if (el !== frame && painted(el, cs)) {
      const r = clipUp(toRect(el.getBoundingClientRect()), el.parentElement, frame);
      if (r && r.w * r.h < BACKDROP * canvas.width * canvas.height) add(r, label(el));
    }
    if (el instanceof HTMLElement && clips(cs) && !el.querySelector('img,video') && el !== frame) {
      const ox = el.scrollWidth - el.clientWidth, oy = el.scrollHeight - el.clientHeight;
      // which element it is: its tag and first class (a model that cannot tell which of its boxes is meant cannot fix it), what it holds, how large it is and how large its content is
      const klass = el.classList[0] ? `.${el.classList[0]}` : '';
      if (ox > 2 || oy > 2) clipped.push({what: (el.getAttribute('data-path') ?? `${el.tagName.toLowerCase()}${klass}`) + (el.textContent ? `: "${el.textContent.slice(0, 40)}"` : ''), overflowX: Math.max(0, ox), overflowY: Math.max(0, oy), box: {w: el.clientWidth, h: el.clientHeight}, content: {w: el.scrollWidth, h: el.scrollHeight}});
    }
    if (el instanceof SVGElement) return;
    for (const n of el.childNodes) {
      if (n.nodeType === Node.TEXT_NODE && n.textContent!.trim()) {
        const range = document.createRange();
        range.selectNodeContents(n);
        // a text rect spans the font's content area; with a tight line-height that is taller than the line box,
        // so trim it to the line height (glyphs sit inside the line box)
        const lh = parseFloat(cs.lineHeight);
        for (const rr of range.getClientRects()) {
          const t = toRect(rr);
          const trim = Number.isFinite(lh) && t.h > lh ? (t.h - lh) / 2 : 0;
          const r = clipUp({x: t.x, y: t.y + trim, w: t.w, h: t.h - 2 * trim}, el, frame);
          if (r) add(r, `text "${n.textContent!.trim().slice(0, 24)}"`);
        }
      } else if (n.nodeType === Node.ELEMENT_NODE) walk(n as Element);
    }
  };
  // a registered svg group has no box of its own: what is drawn in it is its ink
  if (frame instanceof SVGElement && !(frame instanceof SVGSVGElement)) {
    for (const leaf of frame.querySelectorAll('path,rect,ellipse,circle,line,polyline,polygon,text')) {
      if (!leaf.checkVisibility({opacityProperty: true, visibilityProperty: true}) || parseFloat(getComputedStyle(leaf).opacity) < 0.05) continue;
      const r = toRect(leaf.getBoundingClientRect());
      if (r.w > 0 || r.h > 0) add(r, label(leaf));
    }
  } else walk(frame);
  // the frame's own paint (rare) and its clip
  if (ink && clips(getComputedStyle(frame))) ink = intersect(ink, toRect(frame.getBoundingClientRect()));
  return {ink, clipped, pieces};
}

interface Mark {
  el: Element;
  kind: 'fill' | 'stroke';
  /** position in document order: later paints over earlier (parts and svg shapes do not use z-index) */
  order: number;
  box: Rect;
  hit: (x: number, y: number) => boolean;
}

const opacityOf = (el: Element, root: Element): number => {
  let o = 1;
  for (let e: Element | null = el; e && e !== root.parentElement; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity);
  return o;
};

/**
 * What is drawn on the page as a shape, in document order, with a hit test on its real geometry: SVG fills and strokes (not the bounding box of a ring or a
 * diagonal), and painted HTML boxes. A fill counts when it is opaque enough to hide what is under it, a stroke when it is clearly visible.
 */
function marksOf(all: Element[], root: HTMLElement, canvas: {width: number; height: number}): Mark[] {
  const marks: Mark[] = [];
  const big = BACKDROP * canvas.width * canvas.height;
  all.forEach((el, order) => {
    if (el instanceof SVGGeometryElement) {
      if (!el.checkVisibility({opacityProperty: true, visibilityProperty: true})) return;
      const cs = getComputedStyle(el);
      const ctm = el.getScreenCTM();
      if (!ctm) return;
      const inv = ctm.inverse();
      const box = toRect(el.getBoundingClientRect());
      if (box.w * box.h >= big) return;
      const to = (x: number, y: number) => new DOMPoint(x, y).matrixTransform(inv);
      const op = opacityOf(el, root);
      if (cs.fill !== 'none' && op * parseFloat(cs.fillOpacity) >= 0.9) marks.push({el, kind: 'fill', order, box, hit: (x, y) => el.isPointInFill(to(x, y))});
      if (cs.stroke !== 'none' && parseFloat(cs.strokeWidth) > 0 && op * parseFloat(cs.strokeOpacity) >= 0.5) marks.push({el, kind: 'stroke', order, box, hit: (x, y) => el.isPointInStroke(to(x, y))});
    } else if (el instanceof HTMLElement) {
      if (!el.checkVisibility({opacityProperty: true, visibilityProperty: true})) return;
      const cs = getComputedStyle(el);
      if (!painted(el, cs) || opacityOf(el, root) < 0.9) return;
      const box = clipUp(toRect(el.getBoundingClientRect()), el.parentElement, root);
      if (box && box.w * box.h < big) marks.push({el, kind: 'fill', order, box, hit: (x, y) => x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h});
    }
  });
  return marks;
}

/**
 * Text that something is drawn across, by paint order. A grid of points inside each piece of text's glyph area is looked at with the shapes in document order:
 * what is drawn after the text covers it (a fill over some of its points, a line across it); what is drawn before it only shows through where no later opaque fill
 * (a bead, a card) sits between it and the text. The fill the text rests on is its surface: text on one surface is on it, text with some points on a surface and
 * some off (the edge of a card through it) is cut. Text that is still fading (opacity under 0.9) is not judged.
 */
function crossingsOf(all: Element[], root: HTMLElement, canvas: {width: number; height: number}, texts: Array<{text: string; rect: Rect; el: Element}>, of: (el: Element) => string | null): FrameInspection['crossings'] {
  const marks = marksOf(all, root, canvas);
  const out: FrameInspection['crossings'] = [];
  const base = root.getBoundingClientRect();
  const index = new Map(all.map((e, i) => [e, i]));
  for (const t of texts) {
    // texts are relative to the canvas; marks are in client coordinates
    const r = {x: t.rect.x + base.x, y: t.rect.y + base.y, w: t.rect.w, h: t.rect.h};
    // text that is still fading in or out is not judged: what is round it fades with it
    if (opacityOf(t.el, root) < 0.9) continue;
    const at = index.get(t.el) ?? 0;
    const near = marks.filter((m) => intersect(m.box, r));
    if (!near.length) continue;
    const inx = r.w * 0.15, iny = r.h * 0.2;
    const cols = Math.min(24, Math.max(4, Math.round(r.w / 8))), rows = 4;
    const n = cols * rows;
    const surface = new Map<Mark, number>(), over = new Map<Mark, number>(), under = new Map<Mark, number>();
    const bump = (m: Map<Mark, number>, k: Mark) => m.set(k, (m.get(k) ?? 0) + 1);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const x = r.x + inx + ((r.w - 2 * inx) * (i + 0.5)) / cols, y = r.y + iny + ((r.h - 2 * iny) * (j + 0.5)) / rows;
      const hit = near.filter((m) => m.hit(x, y));
      // the topmost fill below the text hides everything under it
      const below = hit.filter((m) => m.order <= at).sort((a, b) => b.order - a.order);
      const surf = below.find((m) => m.kind === 'fill');
      if (surf) bump(surface, surf);
      for (const m of below) if (m.kind === 'stroke' && (!surf || m.order > surf.order)) bump(under, m);
      for (const m of hit) if (m.order > at) bump(over, m);
    }
    const by = (m: Mark) => ({by: m.el.tagName.toLowerCase(), byOf: of(m.el), of: of(t.el)});
    for (const [m, k] of surface) if (k / n > 0.1 && k / n < 0.9) out.push({text: t.text, rect: t.rect, ...by(m), kind: 'edge', covered: k / n});
    for (const [m, k] of over) {
      if (m.kind === 'fill' ? k / n > 0.1 : k >= 2) out.push({text: t.text, rect: t.rect, ...by(m), kind: m.kind === 'fill' ? 'covered' : 'line', covered: k / n});
    }
    for (const [m, k] of under) if (k >= 2) out.push({text: t.text, rect: t.rect, ...by(m), kind: 'line', covered: k / n});
  }
  return out;
}

export function inspectFrame(root: HTMLElement, canvas: {width: number; height: number}): FrameInspection {
  const base = root.getBoundingClientRect();
  const rel = (r: Rect | null): Rect | null => (r ? {x: r.x - base.x, y: r.y - base.y, w: r.w, h: r.h} : null);
  const objects: ObjectInspection[] = [];
  for (const frame of root.querySelectorAll<HTMLElement>('[data-vt]')) {
    if (!frame.checkVisibility({visibilityProperty: true})) continue;
    let opacity = 1;
    for (let e: Element | null = frame; e && e !== root.parentElement; e = e.parentElement) opacity *= parseFloat(getComputedStyle(e).opacity);
    const {ink, clipped, pieces} = inkOf(frame, canvas);
    // a registered svg group has no box of its own (its bounding box is made of what it holds, hidden children included): what is drawn in it is its box
    const box = rel(frame instanceof SVGElement && !(frame instanceof SVGSVGElement) && ink ? ink : toRect(frame.getBoundingClientRect()))!;
    let reach: ObjectInspection['reach'];
    // naming what overflows costs a scan of every piece: only where something does
    for (const {r, what} of ink && (box.x - ink.x > 2 || box.y - ink.y > 2 || ink.x + ink.w - (box.x + box.w) > 2 || ink.y + ink.h - (box.y + box.h) > 2) ? pieces : []) {
      const q = rel(r)!;
      for (const [side, px] of [['left', box.x - q.x], ['right', q.x + q.w - (box.x + box.w)], ['top', box.y - q.y], ['bottom', q.y + q.h - (box.y + box.h)]] as const) {
        if (px > (reach?.px ?? 0)) reach = {side, px: Math.round(px), what};
      }
    }
    objects.push({id: frame.dataset.vt!, parent: frame.parentElement?.closest<HTMLElement>('[data-vt]')?.dataset.vt ?? null, box, ink: rel(ink), opacity, ...(reach && {reach}), clipped});
  }
  const texts: FrameInspection['texts'] = [];
  const textEls: Element[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const parent = n.parentElement;
    if (!parent || !n.textContent!.trim() || parent.closest('[data-caption]') || !parent.checkVisibility({opacityProperty: true, visibilityProperty: true})) continue;
    let opacity = 1;
    for (let e: Element | null = parent; e && e !== root.parentElement; e = e.parentElement) opacity *= parseFloat(getComputedStyle(e).opacity);
    if (opacity < 0.05) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const lh = parseFloat(getComputedStyle(parent).lineHeight);
    for (const rr of range.getClientRects()) {
      const t = toRect(rr);
      const trim = Number.isFinite(lh) && t.h > lh ? (t.h - lh) / 2 : 0;
      const r = clipUp({x: t.x, y: t.y + trim, w: t.w, h: t.h - 2 * trim}, parent, root);
      if (r) {
        texts.push({text: n.textContent!.trim(), rect: rel(r)!, of: parent.closest<HTMLElement>('[data-vt]')?.dataset.vt ?? null});
        textEls.push(parent);
      }
    }
  }
  const cap = root.querySelector<HTMLElement>('[data-caption]');
  const caption = cap && cap.checkVisibility({opacityProperty: true}) && parseFloat(getComputedStyle(cap.parentElement!).opacity) > 0.05
    ? rel(toRect(cap.getBoundingClientRect())) : null;
  const registered = [...root.querySelectorAll<HTMLElement>('[data-vt]')].map((e) => e.dataset.vt!);
  const ownerOf = (el: Element) => el.closest<HTMLElement>('[data-vt]')?.dataset.vt ?? null;
  const crossings = crossingsOf([...root.querySelectorAll('*')], root, canvas, texts.flatMap((t, i) => (t.rect.w > 1 && t.rect.h > 1 ? [{text: t.text, rect: t.rect, el: textEls[i]}] : [])), ownerOf);
  const registeredGlobal = [...root.querySelectorAll<HTMLElement>('[data-global] [data-vt]')].map((e) => e.dataset.vt!);
  return {width: canvas.width, height: canvas.height, objects, texts, crossings, registered, registeredGlobal, caption};
}
