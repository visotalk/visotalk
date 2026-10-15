/**
 * Pattern compilation: a pattern assigns each slot object a region of the canvas. Patterns never create objects.
 * Regions keep clear of the caption band at the bottom. Works for landscape and portrait presets.
 */
import type {PatternKind, PatternUse} from '@visotalk/ir';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  /** member of a flow row: laid out by the browser (flex row in `region`), x/w here are only an estimate */
  flow?: FlowInfo;
  /** primitives size to their content (flow rows) instead of filling the box */
  natural?: boolean;
}

export interface FlowInfo {
  group: string;
  region: Box;
  align: 'start' | 'center' | 'end';
  gap: number;
}

export interface Canvas {
  width: number;
  height: number;
}

type Regions = Record<string, Box>;

const area = (c: Canvas) => {
  const portrait = c.height > c.width;
  const mx = portrait ? 72 : 120;
  const top = portrait ? 160 : 70;
  const bottom = portrait ? 1560 : 900; // caption band below (two caption lines reach up to ~915 px)
  return {mx, top, bottom, w: c.width - 2 * mx, portrait};
};

/** Regions for named slots; array slots (`items`) are expanded by `expand()` */
const PATTERNS: Record<PatternKind, (c: Canvas, n: number, opts: Record<string, unknown>) => Regions> = {
  /**
   * General-purpose board: kicker, title, a band under the title (chips, legend), main area with an optional side
   * column (`options.side`: width ratio, default 0.3 when a `side` slot is used), and a note line at the bottom.
   * `options.band: false` gives the band's height to main.
   */
  board: (c, _n, o) => {
    const a = area(c);
    const titleH = o.titleH === undefined ? 110 : Number(o.titleH);
    const bandH = o.band === false ? 0 : 80;
    const top = a.top + 40 + titleH + 20;
    const mainTop = top + bandH + (bandH ? 30 : 0);
    const noteH = o.note === false ? 0 : 90;
    const mainH = a.bottom - mainTop - noteH;
    const side = typeof o.side === 'number' ? o.side : 0.3;
    const g = 60;
    const mainW = o.hasSide === false ? a.w : (a.w - g) * (1 - side);
    return {
      kicker: {x: a.mx, y: a.top, w: a.w, h: 40},
      title: {x: a.mx, y: a.top + 40, w: a.w, h: titleH},
      band: {x: a.mx, y: top, w: a.w, h: bandH || 70},
      main: a.portrait ? {x: a.mx, y: mainTop, w: a.w, h: mainH * 0.62} : {x: a.mx, y: mainTop, w: mainW, h: mainH},
      wide: {x: a.mx, y: mainTop, w: a.w, h: mainH},
      side: a.portrait ? {x: a.mx, y: mainTop + mainH * 0.62 + 30, w: a.w, h: mainH * 0.38 - 30} : {x: a.mx + mainW + g, y: mainTop, w: a.w - mainW - g, h: mainH},
      note: {x: a.mx, y: a.bottom - noteH + 10, w: a.w, h: noteH - 10},
    };
  },
  /**
   * A picture as large as the frame allows: a compact title (kicker and a 90 px title) and one big `main` below it, ending above the captions;
   * `note` is an optional line at the bottom that takes its height from main. Without a title slot, main rises to the top of the area.
   */
  stage: (c, _n, o) => {
    const a = area(c);
    const top = a.top + (o.hasTitle ? 140 : 0);
    const noteH = o.hasNote ? 90 : 0;
    return {
      kicker: {x: a.mx, y: a.top, w: a.w, h: 36},
      title: {x: a.mx, y: a.top + 36, w: a.w, h: 90},
      main: {x: a.mx, y: top, w: a.w, h: a.bottom - top - noteH},
      note: {x: a.mx, y: a.bottom - 80, w: a.w, h: 70},
    };
  },
  full: (c) => {
    const a = area(c);
    return {kicker: {x: a.mx, y: a.top, w: a.w, h: 40}, title: {x: a.mx, y: a.top + 40, w: a.w, h: 110}, main: {x: 0, y: 0, w: c.width, h: c.height}};
  },
  /** Title card: the title region fits the display styles (up to 240 px type); everything ends above the captions */
  title: (c) => {
    const a = area(c);
    const top = c.height * (a.portrait ? 0.34 : 0.28);
    return {
      kicker: {x: a.mx, y: top - 60, w: a.w, h: 50},
      title: {x: a.mx, y: top, w: a.w, h: 250},
      subtitle: {x: a.mx, y: top + 260, w: a.w, h: 100},
      aside: {x: a.mx, y: top + 370, w: a.w, h: Math.min(200, a.bottom - top - 370)},
    };
  },
  dag: (c) => {
    const a = area(c);
    return {
      kicker: {x: a.mx, y: a.top, w: a.w, h: 40},
      title: {x: a.mx, y: a.top + 50, w: a.w, h: 120},
      graph: {x: a.mx, y: a.top + 190, w: a.w, h: a.bottom - a.top - 310},
      note: a.portrait ? {x: a.mx, y: a.bottom - 120, w: a.w, h: 110} : {x: c.width - a.mx - 620, y: a.bottom - 110, w: 620, h: 110},
      aside: {x: a.mx, y: a.bottom - 110, w: a.w / 2, h: 110},
    };
  },
  compare: (c) => {
    const a = area(c);
    const g = 60;
    const colW = (a.w - g) / 2;
    const body = {y: a.top + 170, h: a.bottom - a.top - 190};
    return a.portrait
      ? {kicker: {x: a.mx, y: a.top, w: a.w, h: 40}, title: {x: a.mx, y: a.top + 40, w: a.w, h: 120}, left: {x: a.mx, y: body.y, w: a.w, h: body.h / 2 - 20}, right: {x: a.mx, y: body.y + body.h / 2 + 20, w: a.w, h: body.h / 2 - 20}}
      : {kicker: {x: a.mx, y: a.top, w: a.w, h: 40}, title: {x: a.mx, y: a.top + 40, w: a.w, h: 120}, left: {x: a.mx, y: body.y, w: colW, h: body.h}, right: {x: a.mx + colW + g, y: body.y, w: colW, h: body.h}};
  },
  steps: (c, _n, o) => {
    const a = area(c);
    return {kicker: {x: a.mx, y: a.top, w: a.w, h: 40}, title: {x: a.mx, y: a.top + 40, w: a.w, h: 110}, main: {x: a.mx, y: a.top + 190, w: a.w, h: a.bottom - a.top - (o.hasNote ? 300 : 200)}, note: {x: a.mx, y: a.bottom - 90, w: a.w, h: 80}};
  },
  /**
   * A track of dated items across the top (`track`), with a detail area underneath: `left` (photo), `right` (text) and
   * `note` under the right column. `main` is the whole area below the title for a timeline on its own.
   */
  timeline: (c, _n, o) => {
    const a = area(c);
    const below = a.top + 330;
    const leftW = a.w * 0.46;
    // with a title the track starts under it; without one it rises into the title's place
    const trackY = o.hasTitle ? a.top + 160 : a.top + 80;
    return {
      kicker: {x: a.mx, y: a.top, w: a.w, h: 40}, title: {x: a.mx, y: a.top + 40, w: a.w, h: 110},
      track: {x: a.mx, y: trackY, w: a.w, h: Math.min(200, below - trackY)},
      main: {x: a.mx, y: o.hasTitle ? a.top + 170 : a.top + 220, w: a.w, h: a.bottom - a.top - (o.hasTitle ? 210 : 260)},
      left: {x: a.mx + 40, y: below, w: leftW - 40, h: a.bottom - below - 70},
      right: {x: a.mx + leftW + 60, y: below + 30, w: a.w - leftW - 60, h: 300},
      note: {x: a.mx + leftW + 60, y: below + 360, w: a.w - leftW - 60, h: 90},
    };
  },
  grid: (c, _n, o) => {
    const a = area(c);
    return {kicker: {x: a.mx, y: a.top, w: a.w, h: 40}, title: {x: a.mx, y: a.top + 40, w: a.w, h: 110}, items: {x: a.mx, y: a.top + 190, w: a.w, h: a.bottom - a.top - (o.hasNote ? 300 : 200)}, note: {x: a.mx, y: a.bottom - 90, w: a.w, h: 80}};
  },
  codeOutput: (c, _n, o) => {
    const a = area(c);
    const split = typeof o.split === 'number' ? o.split : 0.56;
    const top = a.top + 150;
    const h = a.bottom - top - 20;
    return a.portrait
      ? {kicker: {x: a.mx, y: a.top, w: a.w, h: 40}, title: {x: a.mx, y: a.top + 40, w: a.w, h: 100}, code: {x: a.mx, y: top, w: a.w, h: h * 0.5}, output: {x: a.mx, y: top + h * 0.5 + 30, w: a.w, h: h * 0.5 - 30}}
      : {kicker: {x: a.mx, y: a.top, w: a.w, h: 40}, title: {x: a.mx, y: a.top + 40, w: a.w, h: 100}, code: {x: a.mx, y: top, w: a.w * split - 30, h},
        output: {x: a.mx + a.w * split + 30, y: top, w: a.w * (1 - split) - 30, h}};
  },
  /**
   * Documentary layout over full-bleed media. `options.split` (0..1) gives that share of the width, on the right, to a
   * `side` region (second photo); `sideLabel` sits in its corner. Text regions run down the left: lowerThird,
   * statement (a row of overlay chips), upper (taller row, e.g. stat cards), center (large centred text), lower, foot.
   */
  photoStory: (c, _n, o) => {
    const a = area(c);
    const split = typeof o.split === 'number' ? o.split : 0;
    const mediaW = c.width * (1 - split);
    return {
      media: {x: 0, y: 0, w: mediaW, h: c.height},
      side: {x: mediaW, y: 0, w: c.width - mediaW, h: c.height},
      sideLabel: {x: mediaW + 24, y: 24, w: c.width - mediaW - 48, h: 44},
      kicker: {x: a.mx, y: a.top, w: a.w, h: 40},
      lowerThird: {x: a.mx, y: 120, w: a.w * 0.8, h: 150},
      title: {x: a.mx, y: 120, w: a.w * 0.8, h: 150},
      statement: {x: a.mx, y: 320, w: a.w, h: 80},
      upper: {x: a.mx, y: 320, w: a.w, h: 200},
      center: {x: a.mx, y: 490, w: a.w, h: 150},
      lower: {x: a.mx, y: 640, w: a.w, h: 175},
      foot: {x: a.mx, y: 825, w: a.w, h: 70},
      badge: {x: c.width - a.mx - 520, y: a.top, w: 520, h: 120},
    };
  },
  /** Two columns; `options.ratio` is the left share, `options.below` reserves a full-width row of that height underneath */
  split: (c, _n, o) => {
    const a = area(c);
    const ratio = typeof o.ratio === 'number' ? o.ratio : 0.5;
    const g = 60;
    const top = a.top + (o.titleH === undefined ? 150 : Number(o.titleH) + 60);
    const belowH = Number(o.below ?? 0);
    const h = a.bottom - top - (belowH ? belowH + 40 : 0);
    const below = {x: a.mx, y: top + h + 40, w: a.w, h: belowH};
    return a.portrait
      ? {kicker: {x: a.mx, y: a.top, w: a.w, h: 40}, title: {x: a.mx, y: a.top + 40, w: a.w, h: 100}, left: {x: a.mx, y: top, w: a.w, h: h * ratio - 20}, right: {x: a.mx, y: top + h * ratio + 20, w: a.w, h: h * (1 - ratio) - 20}, below}
      : {kicker: {x: a.mx, y: a.top, w: a.w, h: 40}, title: {x: a.mx, y: a.top + 40, w: a.w, h: 100}, left: {x: a.mx, y: top, w: (a.w - g) * ratio, h},
        right: {x: a.mx + (a.w - g) * ratio + g, y: top, w: (a.w - g) * (1 - ratio), h}, below};
  },
};

/** The slot names a pattern lays out (a `side` slot is laid out only when the use has one, so it is asked for) */
export const patternSlots = (kind: PatternKind): string[] => Object.keys(PATTERNS[kind]({width: 1920, height: 1080}, 0, {hasSide: true}));

/**
 * Object id → box for a pattern use. Array slots are laid out in a row (or grid for `grid`), splitting their region;
 * `options.flow` (slot list, or a map slot → 'start' | 'center' | 'end') lays a slot out as a flow row instead: items keep
 * their natural width and the browser places them (flex row with `options.gap`), so no widths are guessed here.
 * Unknown slot names fall back to `main` (or the whole safe area).
 */
export function compilePattern(use: PatternUse, c: Canvas): Record<string, Box> {
  const fn = PATTERNS[use.kind] ?? PATTERNS.full;
  const slots = use.slots ?? {}; // a scene may name a pattern and fill no slot
  const regions = fn(c, 0, {...(use.options ?? {}), hasSide: 'side' in slots, hasTitle: 'title' in slots, hasNote: 'note' in slots});
  const out: Record<string, Box> = {};
  const a = area(c);
  const fallback = regions.main ?? {x: a.mx, y: a.top, w: a.w, h: a.bottom - a.top};
  for (const [slot, ref] of Object.entries(slots)) {
    const r = regions[slot] ?? fallback;
    const ids = [ref].flat();
    const flowOne = use.options?.flow as string[] | Record<string, FlowInfo['align']> | undefined;
    const one = Array.isArray(flowOne) ? (flowOne.includes(slot) ? 'start' : undefined) : flowOne?.[slot];
    if (ids.length === 1 && one) {
      out[ids[0]] = {...r, flow: {group: slot, region: r, align: one, gap: 0}};
      continue;
    }
    if (ids.length === 1) {
      out[ids[0]] = r;
      continue;
    }
    // array slots: a grid for `grid` / options.columns, a column for side/main lists with options.stack, else a row
    const stack = Array.isArray(use.options?.stack) ? (use.options!.stack as string[]).includes(slot) : false;
    const cols = stack ? 1 : use.kind === 'grid' || use.options?.columns ? Math.min(ids.length, Number(use.options?.columns ?? Math.ceil(Math.sqrt(ids.length * 1.8)))) : ids.length;
    const rows = Math.ceil(ids.length / cols);
    const gap = Number(use.options?.gap ?? 40);
    const h = Math.min((r.h - gap * (rows - 1)) / rows, Number(use.options?.rowH ?? Infinity));
    // flow rows: items keep their natural width and are laid out by the browser (no measuring here)
    const flowOpt = use.options?.flow as string[] | Record<string, FlowInfo['align']> | undefined;
    const align = Array.isArray(flowOpt) ? (flowOpt.includes(slot) ? 'start' : undefined) : flowOpt?.[slot];
    if (align && !stack) {
      const est = (r.w - gap * (ids.length - 1)) / ids.length;
      ids.forEach((id, i) => {
        out[id] = {x: r.x + i * (est + gap), y: r.y, w: est, h: r.h, flow: {group: slot, region: r, align, gap}};
      });
      continue;
    }
    const w = (r.w - gap * (cols - 1)) / cols;
    ids.forEach((id, i) => {
      out[id] = {x: r.x + (i % cols) * (w + gap), y: r.y + Math.floor(i / cols) * (h + gap), w, h: rows > 1 || use.kind === 'grid' ? h : r.h};
    });
  }
  return out;
}

/** Linear interpolation between two layouts (pattern changes between beats move objects by identity) */
export const lerpBox = (a: Box, b: Box, p: number): Box => ({x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, w: a.w + (b.w - a.w) * p, h: a.h + (b.h - a.h) * p, flow: b.flow});
