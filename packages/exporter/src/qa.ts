/**
 * Frame QA on measured layout (window.__visotalk.inspect, packages/runtime/src/inspect.ts):
 *   overflow   what an object draws extends past its box
 *   clipped    text or content cut off inside an object (overflow hidden)
 *   offscreen  drawn outside the canvas
 *   caption    drawn under the visible caption
 *   overlap    two objects draw over each other (media frames are backgrounds and exempt)
 */
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface ObjectInspection {
  id: string;
  box: Rect;
  ink: Rect | null;
  opacity: number;
  media: boolean;
  /** a shape, drawn at its own place: it may overlap others on purpose */
  free?: boolean;
  flow: boolean;
  clipped: Array<{what: string; overflowX: number; overflowY: number}>;
}
export interface FrameInspection {
  width: number;
  height: number;
  objects: ObjectInspection[];
  caption: Rect | null;
}
export interface FrameIssue {
  code: 'overflow' | 'clipped' | 'offscreen' | 'caption' | 'overlap';
  at: string;
  frame: number;
  objects: string[];
  message: string;
  fix: string;
}

const FIX: Record<FrameIssue['code'], string> = {
  overflow: 'shorten the text, or use a style or a pattern region with more room',
  clipped: 'shorten the text or give the object more room; a graph label is a word or two',
  offscreen: 'move it into the canvas: use a pattern slot, or shorten the content',
  caption: 'keep it above the two-line caption band: use a smaller region or fewer lines',
  overlap: 'put the two objects in different slots, or hide one before the other appears',
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
    if (!o.media && !o.flow && past(ink, o.box) > TOL) add('overflow', [o.id], `"${o.id}" draws ${Math.round(past(ink, o.box))}px past its box`);
    for (const c of o.clipped) add('clipped', [o.id], `"${o.id}": ${c.what} is cut off (${c.overflowX}px × ${c.overflowY}px)`);
    if (!o.media && past(ink, {x: 0, y: 0, w: f.width, h: f.height}) > 2) add('offscreen', [o.id], `"${o.id}" draws outside the canvas`);
    if (f.caption && !o.media) {
      const hit = intersect(ink, f.caption);
      if (hit && hit.h > 2) add('caption', [o.id], `"${o.id}" is under the caption (${Math.round(hit.h)}px)`);
    }
  }
  const solid = shown.filter((o) => !o.media && !o.free);
  for (let i = 0; i < solid.length; i++) {
    for (let j = i + 1; j < solid.length; j++) {
      const a = solid[i], b = solid[j];
      const hit = intersect(a.ink!, b.ink!);
      if (hit && area(hit) > 200 && area(hit) > 0.02 * Math.min(area(a.ink!), area(b.ink!))) {
        add('overlap', [a.id, b.id], `"${a.id}" and "${b.id}" overlap (${Math.round(hit.w)}×${Math.round(hit.h)}px)`);
      }
    }
  }
  return out;
}

/** Stable identity of an issue for baselines: code, objects and where */
export const issueKey = (i: {code: string; objects: string[]; at: string}) => `${i.code}:${i.objects.join('+')}@${i.at}`;
