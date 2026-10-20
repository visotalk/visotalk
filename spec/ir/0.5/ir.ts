/**
 * VisoTalk IR — spec 0.5.0 (DRAFT)
 *
 * A document is lines, parts and animations (ADR 0017): the narration with its captions, what is on screen, and the actions that
 * connect them in time. What a part draws is ordinary React and is not described here; the engine knows a part's id, its box and the
 * ids and numeric props it registers, never its contents.
 *
 * Source of truth for the document shape. Everything in 0.x may change; every change bumps MINOR (migrations start with the first saved document).
 */

export const SPEC_VERSION = '0.5.0' as const;

/** MAJOR.MINOR.PATCH */
export type SpecVersion = `${number}.${number}.${number}`;
/** Lowercase identifier, unique within its collection: /^[a-z][a-z0-9_-]*$/ */
export type Id = string;
/** Seconds (float). Frames exist only at export time. */
export type Seconds = number;

// ---------------------------------------------------------------------------------------------- document

export interface VisoDoc {
  spec: SpecVersion;
  meta: Meta;
  canvas: Canvas;
  theme?: ThemeRef;
  voice?: Voice;
  /** Narration pacing used by the time solver (seconds); defaults in parentheses */
  pacing?: Pacing;
  /** The words a part draws with `useText(id, base)`, by id: what a person edited, in place of the `base` the part was written with. Ids are lowercase `[a-z][a-z0-9_-]*` like every id */
  texts?: Record<string, string>;
  assets?: Asset[];
  /** Global parts: the only parts that outlive a scene. Hidden until an `appear`, they keep their instance, and the props the document gave them, from scene to scene */
  parts?: Part[];
  scenes: Scene[];
  exports?: ExportPolicy;
  /** Vendor extensions are preserved by tools and ignored by renderers */
  [ext: `x-${string}`]: unknown;
}

export interface Meta {
  id: Id;
  title: string;
  /** BCP-47 primary language of `lines` */
  lang: string;
  description?: string;
  sources?: Source[];
  generator?: string;
  created?: string; // ISO 8601
  updated?: string;
}

export interface Source {
  id: Id;
  url: string;
  title?: string;
  note?: string;
}

export interface Canvas {
  /** First preset is the default; a part that must fit another reads the canvas it is drawn on */
  presets: CanvasPreset[];
}

export interface CanvasPreset {
  id: Id; // e.g. "16x9", "9x16"
  width: number;
  height: number;
}

export interface ThemeRef {
  id: string; // built-in or published theme / brand kit
  tokens?: Partial<ThemeTokens>;
}

export interface ThemeTokens {
  colors: Record<string, string>; // bg, panel, panel2, border, text, muted, faint, data, grad, op, good, bad, warn
  fonts: {sans: string; mono: string; display?: string};
  radius: number;
  /** spacing scale in px at the default preset */
  space: number[];
}

export interface Pacing {
  /** silence before a scene's first line (0.4) */
  lead?: Seconds;
  /** after every line, unless the line sets `hold` (0.4) */
  hold?: Seconds;
  /** extra silence after a scene's last line (0.8) */
  tail?: Seconds;
}

export interface Voice {
  provider?: string; // local default if absent
  voice: string;
  speed?: number; // 1 = natural
  /** word → pronunciation, applied before `say` derivation */
  lexicon?: Record<string, string>;
}

/**
 * `easeIn`, `easeOut`, `easeInOut` are cubic curves; `Sine`, `Quad`, `Quart`, `Quint` after one of the three (`easeOutQuart`) are the others of easings.net, `Back` overshoots
 * (`easeOutBack` by 1.70158, or `easeOutBack(2.2)` by 2.2), and `cubic-bezier(x1, y1, x2, y2)` is the CSS curve.
 */
export type Curve = 'Sine' | 'Quad' | 'Quart' | 'Quint' | 'Back';
export type Easing = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | `ease${'In' | 'Out' | 'InOut'}${Curve}` | `ease${'In' | 'Out' | 'InOut'}Back(${number})` | `cubic-bezier(${string})`;

// ---------------------------------------------------------------------------------------------- assets & licensing

export type AssetKind = 'image' | 'video' | 'audio' | 'font' | 'data';

export interface Asset {
  id: Id;
  kind: AssetKind;
  /** Relative path inside the project, or an absolute URL */
  src: string;
  /** Where the asset was obtained (page URL), listed in credits */
  source?: string;
  license: License;
  /** Filled by the asset service */
  analysis?: AssetAnalysis;
  /** Video: edit-friendly proxy (short GOP) used for export */
  proxy?: string;
}

export interface License {
  /** SPDX id where possible ("CC0-1.0", "CC-BY-2.0"), or a well-known label ("PD-USGov", "user-owned") */
  id: string;
  attribution?: string;
  url?: string;
  obligations: Array<'attribution' | 'share-alike' | 'non-commercial' | 'no-derivatives'>;
}

export interface AssetAnalysis {
  /** Normalised [x0, y0, x1, y1] */
  subject?: [number, number, number, number];
  safeText?: Array<[number, number, number, number]>;
  luminance?: number; // 0..1
  /** Video: labelled usable segments, seconds in the source */
  segments?: Array<{in: Seconds; out: Seconds; label?: string}>;
  duration?: Seconds;
  /** Pixel size (image, video) */
  width?: number;
  height?: number;
  /** Video, after ingest to constant frame rate */
  fps?: number;
  frames?: number;
}

// ---------------------------------------------------------------------------------------------- scenes, lines, parts

export interface Scene {
  id: Id;
  title?: string;
  /** Narration, in order. A scene without lines needs `duration`. */
  lines: Line[];
  duration?: Seconds;
  /**
   * The parts of this scene. They are mounted when the scene starts, hidden until an `appear`, and released when it ends: the next scene
   * starts from nothing, and declares again what it shows. Part ids are unique within a scene (and differ from the global parts').
   */
  parts: Part[];
  /** The actions of the scene, in any order: each says when it starts */
  animations: Action[];
  /** Music and sound effects that start in this scene: each says when, and how loud */
  sounds?: Sound[];
}

/**
 * A box (default: the whole canvas) that holds what its React children draw. Every part is invisible until an `appear` shows it. Studio moves, sizes, shows and hides
 * parts; it does not edit what is inside. The engine reads `id` and the box; `body` is the source of the children, for tools (it is not run from here).
 */
export interface Part {
  id: Id;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  /** Stacking order among the parts of a scene (default: document order) */
  z?: number;
  body?: string;
}

export interface Line {
  id: Id;
  /** Caption text */
  text: string;
  /** Pronunciation; derived from `text` by the normaliser (the voice lexicon) when absent */
  say?: string;
  /** Extra silence after this line, seconds (default `pacing.hold`) */
  hold?: Seconds;
  /** Word timings in seconds from the line start (filled by forced alignment; estimated when absent) */
  words?: Array<{w: string; t0: Seconds; t1: Seconds; /** how sure the aligner was, 0 to 1; absent for a word without letters */ p?: number}>;
  i18n?: Record<string, {text: string; say?: string}>;
}

// ---------------------------------------------------------------------------------------------- animation

/**
 * Where an action starts. `word` is a phrase of the line's `say` (words as the aligner hears them: numbers spelled out), `nth` says which
 * occurrence (a phrase that occurs twice without `nth` is an error). Without `word`, `line` is the start of the line
 * (`edge: 'end'`: its end). `at` is seconds from the start of the scene; `scene` is its start or end.
 */
export type Anchor =
  | {line: Id; word?: string; nth?: number; edge?: 'start' | 'end'; offset?: Seconds}
  | {at: Seconds}
  | {scene: 'start' | 'end'; offset?: Seconds};

/**
 * An Anchor, or another action's edge. `after` is the `id` of an action anywhere in the document; `edge` defaults to `end` (the latest target's
 * start plus `dur`, and for `set` the start). The chain always ends in a word, a scene time or a scene edge, so the narration stays the root of time.
 */
export type ActionAnchor = Anchor | {after: Id; edge?: 'start' | 'end'; offset?: Seconds};

export type MotionKind = 'appear' | 'disappear' | 'tween' | 'set';

export interface Action {
  /** Unique in the document; another action's `at.after` names it */
  id?: Id;
  motion: MotionKind;
  /** A part of the scene or a global part, or an element a part registers (`useTarget`): ids are unique within a scene */
  on: Id | Id[];
  at: ActionAnchor;
  dur?: Seconds;
  /** Delay between multiple targets */
  stagger?: Seconds;
  easing?: Easing;
  /** `tween`: it plays again this many times after the first (0, once; -1, for as long as the film runs); each play runs `dur` */
  repeat?: number;
  /** `tween` with `repeat`: every other play runs backwards, so the prop comes back to where it began (after an even number of plays in all) */
  yoyo?: boolean;
  /** `tween`: props that reach these values over `dur`, from the value they have then (numbers, colours such as "#426894" or "hsl(212 46% 68%)", and lengths such as "12px" or "40%", a length from one of the same unit); `set`: props that take these values at once */
  props?: Record<string, number | string | boolean>;
}

// ---------------------------------------------------------------------------------------------- sound

/**
 * A sound of an `audio` asset, started on the same anchors an action is (a word of a line, a time in the scene, a scene edge). The narration is the loudest
 * thing in a film and is never changed: a sound is set against its own file in dB, fades in and out, and can step back while the narration speaks (`duck`).
 * A bed of music that runs across scenes is a sound that starts in one scene and lasts to the end of the film (`loop` without `dur`).
 */
export interface Sound {
  id?: Id;
  /** an asset of kind `audio` */
  asset: Id;
  at: Anchor;
  /** Seconds it sounds. Without it: the file's length, or with `loop` the rest of the film. `fadeOut` needs one or the other. */
  dur?: Seconds;
  /** dB against the file (0); negative is quieter */
  volume?: number;
  /** Play again from the start when the file ends, for as long as it sounds */
  loop?: boolean;
  fadeIn?: Seconds;
  fadeOut?: Seconds;
  /** dB it steps back, from `volume`, while a narration line is spoken, and releases in the pauses (0, never; 6 is a clear step) */
  duck?: number;
}

// ---------------------------------------------------------------------------------------------- export

export interface ExportPolicy {
  variants: Array<{preset: Id; lang?: string}>;
  fps?: number; // default 30
  /** `words`: the spoken words in a block in the lower half of a tall frame, each on the second it is said */
  captions?: 'burned' | 'sidecar' | 'both' | 'none' | 'words';
}
