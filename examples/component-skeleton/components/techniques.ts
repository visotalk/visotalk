/**
 * Small techniques for components, one at a time. Copy the line you need into your own drawing; none of them is a picture.
 * A component is a pure function of its props and time: the same frame must come out the same every time.
 */

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/** One prop, many items. `shown` = 2.4 means items 0 and 1 are fully there and item 2 is 40 % of the way; the document tweens or sets `shown` on words. */
export const stagger = (shown: number, i: number) => clamp(shown - i);

/** Ease-out: starts fast, settles slowly. Apply to a 0 to 1 progress before using it. */
export const ease = (k: number) => 1 - (1 - k) ** 3;

/** Whole pixels for anything with an edge: fractional coordinates antialias differently from run to run. */
export const px = Math.round;

/** An arrow from (x1, y) to (x2, y) as ONE filled shape on whole pixels. A stroked shaft under a filled head antialiases differently from run to run. */
export function arrow(g: CanvasRenderingContext2D, x1: number, x2: number, y: number, head = 16, half = 2) {
  const a = px(x1), b = px(x2), cy = px(y), dir = Math.sign(b - a) || 1;
  g.beginPath();
  g.moveTo(b, cy);
  g.lineTo(b - dir * head, cy - head * 0.85);
  g.lineTo(b - dir * head, cy - half);
  g.lineTo(a, cy - half);
  g.lineTo(a, cy + half);
  g.lineTo(b - dir * head, cy + half);
  g.lineTo(b - dir * head, cy + head * 0.85);
  g.closePath();
  g.fill();
}

/** A font size that fits `text` in `maxW`: start from the size you want and shrink. Use weights 400 and 700 only (the fonts the page has loaded). */
export function fitFont(g: CanvasRenderingContext2D, text: string, weight: 400 | 700, family: string, size: number, maxW: number) {
  let s = size;
  for (; s > 12; s -= 2) {
    g.font = `${weight} ${s}px ${family}`;
    if (g.measureText(text).width <= maxW) break;
  }
  return s;
}

/** Let the browser lay out a row of equal columns: HTML and CSS instead of coordinates. Fill each column with elements; no CSS transitions or animations (set styles from the props each frame). */
export function gridOf(root: HTMLElement, columns: number, gap = 32) {
  root.style.cssText = `display:grid;grid-template-columns:repeat(${columns},1fr);gap:${gap}px;align-content:start`;
  root.replaceChildren();
  return Array.from({length: columns}, () => root.appendChild(document.createElement('div')));
}
