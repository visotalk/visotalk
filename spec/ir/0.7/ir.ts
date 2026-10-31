/**
 * VisoTalk IR — spec 0.7.0 (DRAFT)
 *
 * A document is lines, parts and animations: the narration with its captions, what is on screen, and the actions that
 * connect them in time. What a part draws is ordinary React and is not described here; the engine knows a part's id, its box and the
 * ids and numeric props it registers, never its contents.
 *
 * Source of truth for the document shape. Everything in 0.x may change; every change bumps MINOR (migrations start with the first saved document).
 */

export const SPEC_VERSION = '0.7.0' as const;

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
  /** The second of the film the player shows as its cover until it is played (the film itself starts at 0); none: the first frame */
  poster?: number;
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
  /** Presenter regions in canvas pixels; QA reports intersecting parts. */
  keepClear?: KeepClear[];
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
  /** How the captions are drawn; without it, the sans face in a soft box of the ground colour */
  caption?: CaptionSkin;
}

/**
 * The look of the captions, in px on a 1920-wide canvas (a tall frame scales them). Colours are CSS colours; every field is optional.
 * The `words` block (`exports.captions: 'words'`) takes the face, weight, colour and shadow, and its own size from `size`.
 */
export interface CaptionSkin {
  /** which of the theme's faces (sans) */
  font?: 'sans' | 'display' | 'mono';
  /** 34 */
  size?: number;
  /** 400 for a line caption, 700 for the words block */
  weight?: number;
  /** the text token */
  color?: string;
  /** the box behind a line caption: a CSS colour, or 'none' (the ground at 82%) */
  background?: string;
  /** the box's corner radius (10) */
  radius?: number;
  /** the box's inner space, [vertical, horizontal] (10, 26) */
  padding?: [number, number];
  /** from the bottom of the canvas to the bottom of the box (54) */
  bottom?: number;
  /** the widest a line caption runs (1500) */
  maxWidth?: number;
  /** a CSS text-shadow (none) */
  shadow?: string;
  /** a short line beside the caption, in this colour (none) */
  rule?: string;
  /** where the rule is drawn (top) */
  ruleSide?: 'top' | 'left';
}

export interface Pacing {
  /** silence before a scene's first line (0.4) */
  lead?: Seconds;
  /** after every line, unless the line sets `hold` (0.4) */
  hold?: Seconds;
  /** extra silence after a scene's last line (0.8) */
  tail?: Seconds;
  /** A narrated scene's length is rounded up to a whole number of these by lengthening its last hold (none): a film scored to a beat sets one bar, so
   * every scene in every language starts on a bar line */
  grid?: Seconds;
}

export interface Voice {
  /** A bare name is a local Kokoro voice; `provider:name` is a third-party one (`minimax:…`, `elevenlabs:…`, `volcengine:…`, `openai:…`) or a module (`./my-voice.mjs:name`) */
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
  /** A recording cut from another at the person's request: the original's path and the stretches of it kept, in its seconds, in order */
  trim?: {source: string; keep: Array<[Seconds, Seconds]>};
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
  /** Exact source frame rate, for example 30000/1001. */
  frameRate?: string;
}

// ---------------------------------------------------------------------------------------------- scenes, lines, parts

/** Where the presenter (or anything the picture must not cover) is, in canvas pixels; with `from`/`to` (seconds of the film) only while they are on screen there, as in the shots of a cut film that show them */
export interface KeepClear {
  x: number;
  y: number;
  w: number;
  h: number;
  from?: Seconds;
  to?: Seconds;
}

export interface Scene {
  id: Id;
  title?: string;
  /** Narration, in order. A scene without lines needs `duration` (with recorded narration, the recording gives it). */
  lines: Line[];
  duration?: Seconds;
  /** Where the presenter is in this scene, in canvas pixels, instead of the document's `canvas.keepClear`: `[]` when they are not on screen as recorded (covered, or moved into a part). */
  keepClear?: KeepClear[];
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
 * A box (default: the whole canvas) that holds what its React children draw. Every part is invisible until an `appear` shows it. The web editor moves, sizes, shows and hides
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
  /** Absolute span in the original continuous narration recording. */
  span?: {start: Seconds; end: Seconds};
  id: Id;
  /** Caption text */
  text: string;
  /** Pronunciation; derived from `text` by the normaliser (the voice lexicon) when absent */
  say?: string;
  /** Extra silence after this line, seconds (default `pacing.hold`) */
  hold?: Seconds;
  /** Word timings in seconds from the line start (filled by forced alignment; estimated when absent) */
  words?: Array<{w: string; t0: Seconds; t1: Seconds; /** how sure the aligner was, 0 to 1; absent for a word without letters */ p?: number}>;
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
  target: Id | Id[];
  at: ActionAnchor;
  dur?: Seconds;
  /** Where it ends, instead of `dur`: the action runs from its start to this anchor (a word, a scene time or a scene edge of its scene), however long the
   * narration makes that in each language. Not with `repeat` */
  until?: Anchor;
  /** Delay between multiple targets */
  stagger?: Seconds;
  easing?: Easing;
  /** `tween`: it plays again this many times after the first (0, once; -1, for as long as the film runs); each play runs `dur` */
  repeat?: number;
  /** `tween` with `repeat`: every other play runs backwards, so the prop comes back to where it began (after an even number of plays in all) */
  yoyo?: boolean;
  /** `tween`: values reached over `dur` (numbers, colours and lengths); `set`: values taken at once */
  to?: Record<string, number | string | boolean>;
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
  /** Where it stops, instead of `dur`: a word, a scene time or a scene edge of its scene (with `offset`, past it) */
  until?: Anchor;
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
  /** The outputs the document means to make: a canvas, and optionally a built-in theme (`visotalk/light`) drawn in place of the document's own */
  variants?: Array<{preset: Id; lang?: string; theme?: string}>;
  fps?: number; // default 30
  /** `words`: the spoken words in a block of large type in the lower half of a tall frame (from 53% of its height, 88 px, up to about six lines), each on the second it is said */
  captions?: 'burned' | 'sidecar' | 'both' | 'none' | 'words';
}

// ---------------------------------------------------------------------------------------------- languages

/**
 * One language of a document: `doc.<lang>.json` beside `doc.tsx`. It holds only what the language changes; `localize` makes the document
 * in that language before anything else runs. It names the document's line ids, anchor phrases, `texts` ids and asset ids, and changes no scene,
 * part or animation.
 */
export interface Overlay {
  /** BCP-47, as `meta.lang` */
  lang: string;
  meta?: {title?: string; description?: string; poster?: number};
  voice?: Partial<Voice>;
  /** The theme's font stacks in this language (a Latin face for a CJK document, say) */
  fonts?: {sans?: string; mono?: string};
  captions?: ExportPolicy['captions'];
  /** Every line of the document: its caption, the words spoken when they differ (numbers as words), and its silence after */
  lines: Record<Id, {text: string; say?: string; hold?: Seconds}>;
  /** By line id, each phrase an action or a sound of the document names in that line, and its phrase in this language */
  anchors?: Record<Id, Record<string, string | {word: string; nth?: number}>>;
  /** The words a part draws, by id, as the document's own `texts` */
  texts?: Record<string, string>;
  /** By asset id, another file in this language (a music bed cut to this narration) */
  assets?: Record<Id, {src: string; license?: License}>;
}
