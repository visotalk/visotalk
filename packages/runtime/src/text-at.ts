/**
 * The words on the page, for a parent that asks about them (`{vt: 'textAt'}` and `{vt: 'textFit'}`, see `bridge.ts`). It cannot read the page itself:
 * the frame that holds a player is sandboxed. Positions are fractions of the page, since the parent knows the frame's box and not its pixels.
 */
interface CaretDocument {
  caretPositionFromPoint?(x: number, y: number): {offsetNode: Node} | null;
  caretRangeFromPoint?(x: number, y: number): Range | null;
}

export interface TextHit {
  text: string;
  /** what the text node draws, as fractions of the page */
  rect: {x: number; y: number; w: number; h: number};
}

export type TextProblem = 'offscreen' | 'clipped' | 'overflow';

const rectsOf = (node: Node, doc: Document) => {
  const range = doc.createRange();
  range.selectNodeContents(node);
  return [...range.getClientRects()];
};

/** The text node drawn at a point and the words in it, or null: the caret lookup snaps to the nearest text, so the point has to fall inside what the node draws. A click on empty canvas answers null. */
export function textAt(fx: number, fy: number, doc: Document = document): TextHit | null {
  const view = doc.defaultView!;
  const x = fx * view.innerWidth;
  const y = fy * view.innerHeight;
  const caret = doc as unknown as CaretDocument;
  const node = caret.caretPositionFromPoint?.(x, y)?.offsetNode ?? caret.caretRangeFromPoint?.(x, y)?.startContainer;
  const text = node?.textContent?.trim();
  if (!node || node.nodeType !== Node.TEXT_NODE || !text) return null;
  const rects = rectsOf(node, doc);
  if (!rects.some((r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)) return null;
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.right));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  return {text, rect: {x: left / view.innerWidth, y: top / view.innerHeight, w: (right - left) / view.innerWidth, h: (bottom - top) / view.innerHeight}};
}

/**
 * Whether the words as drawn now fit where they are: past the edge of the page, cut off by an ancestor that clips, or past the box of the part or
 * element they are in (the same three things the exporter's QA names `offscreen`, `clipped` and `overflow`). Null when they fit, or are not drawn.
 */
export function textFit(words: string, doc: Document = document): TextProblem | null {
  const view = doc.defaultView!;
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.textContent?.trim() !== words) continue;
    const owner = node.parentElement;
    const rects = rectsOf(node, doc).filter((r) => r.width > 0 && r.height > 0);
    if (!owner?.checkVisibility({visibilityProperty: true}) || !rects.length) continue;
    const left = Math.min(...rects.map((r) => r.left));
    const top = Math.min(...rects.map((r) => r.top));
    const right = Math.max(...rects.map((r) => r.right));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    const past = (box: {left: number; top: number; right: number; bottom: number}) => box.left - left > 2 || box.top - top > 2 || right - box.right > 2 || bottom - box.bottom > 2;
    if (past({left: 0, top: 0, right: view.innerWidth, bottom: view.innerHeight})) return 'offscreen';
    for (let e: Element | null = owner; e && e !== doc.body; e = e.parentElement) {
      const style = view.getComputedStyle(e);
      if ((style.overflowX !== 'visible' || style.overflowY !== 'visible') && past(e.getBoundingClientRect())) return 'clipped';
    }
    const part = owner.closest<HTMLElement>('[data-vt]');
    if (part && past(part.getBoundingClientRect())) return 'overflow';
    return null;
  }
  return null;
}
