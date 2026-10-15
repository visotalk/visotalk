/**
 * Frame inspection for QA: what each object actually draws in the current frame, measured in the DOM.
 * The drawn area ("ink") of an object is the union of its text runs and its painted elements (backgrounds, borders,
 * images, SVG, canvas, video), each clipped by the ancestors that clip overflow. Elements hidden by visibility or a
 * near-zero opacity do not count.
 */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ObjectInspection {
  id: string;
  /** the object's box from the layout (its frame) */
  box: Rect;
  /** union of what it draws, clipped; null when nothing is visible */
  ink: Rect | null;
  /** effective opacity of the frame */
  opacity: number;
  /** image / video frames are backgrounds for text on top */
  media: boolean;
  /** drawn at its own place (a shape): it may overlap others on purpose */
  free: boolean;
  /** in a flow row (natural width) */
  flow: boolean;
  /** descendants whose content is cut off by their own overflow clipping */
  clipped: Array<{what: string; overflowX: number; overflowY: number}>;
}

export interface FrameInspection {
  width: number;
  height: number;
  objects: ObjectInspection[];
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

function inkOf(frame: HTMLElement): {ink: Rect | null; clipped: ObjectInspection['clipped']} {
  let ink: Rect | null = null;
  const clipped: ObjectInspection['clipped'] = [];
  const walk = (el: Element) => {
    if (!el.checkVisibility({opacityProperty: true, visibilityProperty: true})) return;
    const cs = getComputedStyle(el);
    if (parseFloat(cs.opacity) < 0.05) return;
    // a free shape's svg is a canvas-sized (path) or box-sized frame: its ink is what is drawn in it, not the frame
    if (el instanceof SVGSVGElement && el.hasAttribute('data-free')) {
      for (const leaf of el.querySelectorAll('path,rect,ellipse,circle,line,polyline,polygon,text')) {
        if (parseFloat(getComputedStyle(leaf).opacity) < 0.05) continue;
        const r = toRect(leaf.getBoundingClientRect());
        if (r.w > 0 || r.h > 0) ink = union(ink, r);
      }
      return;
    }
    if (el !== frame && painted(el, cs)) {
      const r = clipUp(toRect(el.getBoundingClientRect()), el.parentElement, frame);
      if (r) ink = union(ink, r);
    }
    if (el instanceof HTMLElement && clips(cs) && !el.querySelector('img,video') && el !== frame) {
      const ox = el.scrollWidth - el.clientWidth, oy = el.scrollHeight - el.clientHeight;
      if (ox > 2 || oy > 2) clipped.push({what: (el.getAttribute('data-path') ?? el.tagName.toLowerCase()) + (el.textContent ? `: "${el.textContent.slice(0, 40)}"` : ''), overflowX: ox, overflowY: oy});
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
          if (r) ink = union(ink, r);
        }
      } else if (n.nodeType === Node.ELEMENT_NODE) walk(n as Element);
    }
  };
  walk(frame);
  // the frame's own paint (rare) and its clip
  if (ink && clips(getComputedStyle(frame))) ink = intersect(ink, toRect(frame.getBoundingClientRect()));
  return {ink, clipped};
}

export function inspectFrame(root: HTMLElement, canvas: {width: number; height: number}): FrameInspection {
  const base = root.getBoundingClientRect();
  const rel = (r: Rect | null): Rect | null => (r ? {x: r.x - base.x, y: r.y - base.y, w: r.w, h: r.h} : null);
  const objects: ObjectInspection[] = [];
  for (const frame of root.querySelectorAll<HTMLElement>('[data-object]')) {
    if (!frame.checkVisibility({visibilityProperty: true})) continue;
    const opacity = parseFloat(getComputedStyle(frame).opacity);
    const media = !!frame.querySelector(':scope > [data-path] > img, :scope > [data-path] > video');
    const free = !!frame.querySelector(':scope > [data-free]');
    const {ink, clipped} = media ? {ink: toRect(frame.getBoundingClientRect()), clipped: []} : inkOf(frame);
    objects.push({id: frame.dataset.object!, box: rel(toRect(frame.getBoundingClientRect()))!, ink: rel(ink), opacity, media, free,
      flow: !!frame.parentElement?.dataset.flow, clipped});
  }
  const cap = root.querySelector<HTMLElement>('[data-caption]');
  const caption = cap && cap.checkVisibility({opacityProperty: true}) && parseFloat(getComputedStyle(cap.parentElement!).opacity) > 0.05
    ? rel(toRect(cap.getBoundingClientRect())) : null;
  return {width: canvas.width, height: canvas.height, objects, caption};
}
