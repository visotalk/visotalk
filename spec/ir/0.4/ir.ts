/**
 * VisoTalk IR — spec 0.4.0 (DRAFT)
 *
 * Changes from 0.1: beat anchors can name their beat; interactions declare their scope;
 * numeric fields take a `format`; caption templates for param-dependent values; IR-level pacing; word timings.
 *
 * Source of truth for the document shape. Everything in 0.x may change; every change bumps MINOR (migrations start with the first saved document).
 *
 * Layers:
 *   L0  semantic: scenes, beats, lines, patterns, object state, actions
 *   L1  overrides: explicit keyframes that pin object properties
 *   L2  timed components: `component` objects backed by `components[]` registrations
 */

export const SPEC_VERSION = '0.4.0' as const;

/** MAJOR.MINOR.PATCH */
export type SpecVersion = `${number}.${number}.${number}`;
/** Lowercase identifier, unique within its collection: /^[a-z][a-z0-9_-]*$/ */
export type Id = string;
/** Seconds (float). Frames exist only at export time. */
export type Seconds = number;
/** Reference into a sub-part of an object, e.g. "g#x.grad" (graph `g`, node `x`, field `grad`). */
export type Path = Id | `${Id}#${string}`;
/** `${sceneId}/${beatId}` */
export type BeatRef = `${Id}/${Id}`;

// ---------------------------------------------------------------------------------------------- document

export interface VisoDoc {
  spec: SpecVersion;
  meta: Meta;
  canvas: Canvas;
  theme?: ThemeRef;
  voice?: Voice;
  /** Narration pacing used by the time solver (seconds); defaults in parentheses */
  pacing?: Pacing;
  assets?: Asset[];
  /** L2 registrations */
  components?: ComponentDef[];
  /** Interactive parameters; exports use defaults */
  params?: Record<Id, ParamDef>;
  /** Identity registry: every visual object that appears anywhere */
  objects: Record<Id, ObjectDef>;
  scenes: Scene[];
  /** Branching graph; absent = linear order of scenes/beats */
  flow?: Flow;
  /** L1 */
  overrides?: Override[];
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
  /** First preset is the default; others are re-solved variants (layout solver) */
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
  colors: Record<string, string>; // bg, panel, panel2, border, text, muted, faint, data, grad, op, good, bad, warn; there is no `accent`
  fonts: {sans: string; mono: string; display?: string};
  radius: number;
  /** spacing scale in px at the default preset */
  space: number[];
}

export interface Pacing {
  /** silence before a scene's first line (0.4) */
  lead?: Seconds;
  /** between lines (0.3) */
  gap?: Seconds;
  /** after a beat's last line, unless the beat sets `hold` (0.4) */
  hold?: Seconds;
  /** extra hold after a scene's last beat (0.8) */
  tail?: Seconds;
}

export interface Voice {
  provider?: string; // local default if absent
  voice: string;
  speed?: number; // 1 = natural
  /** word → pronunciation, applied before `say` derivation */
  lexicon?: Record<string, string>;
}

// ---------------------------------------------------------------------------------------------- values

/** Safe expression over params and constants (no JS): "x * y", "round(x * y, 2)", "fmt(v, '0.0')" */
export interface Expr {
  $expr: string;
}
export type Value<T> = T | Expr;

export type Easing =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | {cubicBezier: [number, number, number, number]}
  | {spring: {damping: number; stiffness?: number; mass?: number}};

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
  /** Filled by the asset service; used by the layout solver and QA */
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

/**
 * L2 registration: a component that follows the `visotalk/timed@1` contract. In a document it is an import of the component's module; `export` is the
 * imported name, and the object tag is that name.
 */
export interface ComponentDef {
  id: Id;
  /** Path of an ES module, relative to the document, or a package spec */
  module: string;
  export?: string;
  contract: 'visotalk/timed@1';
}

// ---------------------------------------------------------------------------------------------- objects

/**
 * Free appearance, over the object's `style`. Colours are theme colour names (`data`, `grad`, `muted`, `bad`, ...) or any CSS colour.
 * `size`, `color`, `weight`, `font`, `align` and `padding` set the text of a text object or a chip; `background`, `border` and `radius` give any object a panel.
 */
export interface Look {
  /** Font size in px on the 1920 x 1080 canvas */
  size?: number;
  color?: string;
  weight?: number;
  font?: 'sans' | 'mono';
  align?: 'left' | 'center' | 'right';
  background?: string;
  /** Border colour (2 px) */
  border?: string;
  /** Corner radius in px */
  radius?: number;
  /** Shapes: fill colour, outline colour and outline width in px (`background` and `border` are for panels) */
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  /** Inner padding in px of a text object (room between its text and a `border`) */
  padding?: number;
}

interface ObjectBase {
  /** Accessible description; also used by QA and Studio */
  label?: string;
  /** Theme style key, e.g. "title", "body", "caption", "accent" */
  style?: string;
  /** Free appearance over `style` (see `Look`) */
  look?: Look;
  /** Draws the object this many times larger inside its slot: the content is laid out in the slot divided by `scale`, so text grows and reflows and QA reports an overflow. Default 1 */
  scale?: number;
}

export type ObjectDef =
  | TextObject
  | ShapeObject
  | ConnectorObject
  | ImageObject
  | VideoObject
  | CardObject
  | ChipObject
  | CounterObject
  | MathObject
  | CodeObject
  | TerminalObject
  | GraphObject
  | ChartObject
  | TimelineObject
  | StepsObject
  | CreditsObject
  | ComponentObject;

/** Labelled value inside a card or graph node */
export interface Field {
  id: Id;
  label: string;
  value: Value<string | number>;
  /** Number format: "0", "0.00", "0.0000", "+0.0", "0%" (default "0.00" for non-integers) */
  format?: string;
}

export interface TextObject extends ObjectBase {
  type: 'text';
  text: Value<string>;
  /** Inline runs with their own style, e.g. two-colour titles */
  runs?: Array<{text: Value<string>; style?: string}>;
  maxLines?: number;
}

/**
 * A shape is drawn at its own place on the 1920 x 1080 canvas, whatever slot it sits in (the slot decides only when it is on screen), so a
 * picture can be built from many shapes, each timed on a word and each checked by QA. All numbers are canvas px and can be tweened
 * (`<Tween on="bar" h={300}>` grows a bar, `<Tween on="arrow" draw={1}>` draws a line). Look: `fill`, `stroke`, `strokeWidth`, `radius` (a
 * rect's corner); a `text` is drawn centred in a rect or circle with the `size`, `color`, `weight` and `font` of the look.
 */
export interface ShapeObject extends ObjectBase {
  type: 'shape';
  shape: 'rect' | 'circle' | 'line' | 'path' | 'icon' | 'svg';
  /** rect, circle, icon and svg (an ellipse inscribed in the box; an icon or a drawing fitted into it): the box */
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  /** line: from (x1, y1) to (x2, y2) */
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  /** line: an arrowhead at the end */
  arrow?: boolean;
  /** path: SVG path data in canvas px */
  path?: string;
  /** icon: a name from the built-in set (`visotalk schema icons`), drawn in `look.stroke` with `look.strokeWidth` on a 24-unit grid (default 2); `look.fill` fills it */
  icon?: string;
  /** svg: a drawing as SVG markup (`<svg viewBox="…">` with path, circle, ellipse, rect, line, polyline, polygon and g only; their own colours kept) fitted into the box */
  svg?: string;
  /** How much of the outline is drawn, 0 to 1 (default 1) */
  draw?: number;
  /** Centred in a rect or circle */
  text?: string;
}

export interface ConnectorObject extends ObjectBase {
  type: 'connector';
  from: Path;
  to: Path;
  curve?: 'straight' | 'arc' | 'orthogonal';
  label?: string;
  arrow?: 'none' | 'end' | 'both';
}

/** Media treatment shared by images and videos */
interface MediaProps {
  fit?: 'cover' | 'contain';
  /** Darken the media for legibility of text on top, 0..1 */
  dim?: number;
  /** Attribution tag in the corner; default: shown when the asset's license has an attribution */
  credit?: boolean;
}

/**
 * `kenBurns` params: {from: [scale, x%, y%], to: [scale, x%, y%]}, linear over the action's duration; without `dur` the
 * move lasts until the image leaves (its next exit in the scene, or the scene end).
 */
export interface ImageObject extends ObjectBase, MediaProps {
  type: 'image';
  asset: Id;
  caption?: string;
}

export interface VideoObject extends ObjectBase, MediaProps {
  type: 'video';
  asset: Id;
  /** Source window in seconds */
  range?: [Seconds, Seconds];
  /** Fixed rate, or elastic range the time solver may choose from */
  rate?: number | [number, number];
  muted?: boolean;
}

export interface CardObject extends ObjectBase {
  type: 'card';
  /** small label above the title, e.g. "01" */
  kicker?: Value<string>;
  title?: Value<string>;
  body?: Value<string>;
  fields?: Field[];
}

export interface ChipObject extends ObjectBase {
  type: 'chip';
  text: Value<string>;
}

export interface CounterObject extends ObjectBase {
  type: 'counter';
  value: Value<number>;
  format?: string; // "0", "0.00", "$0.0a"
  /** shown after the number; a word of two or more letters ("years", "ms") gets a space before it, a symbol ("%", "x", "s") does not */
  unit?: string;
  /** small label under the number, e.g. a file name */
  caption?: string;
}

export interface MathObject extends ObjectBase {
  type: 'math';
  tex: string;
}

export interface CodeObject extends ObjectBase {
  type: 'code';
  lang?: string;
  lines: string[];
  file?: string;
  /** shell prompt for `lang: "sh"` blocks ("$ " by default) */
  prompt?: string;
}

export interface TerminalObject extends ObjectBase {
  type: 'terminal';
  title?: string;
  /** The output the narration names: captured, or an example the viewer is told is one; never an invented measurement */
  steps: Array<{id: Id; cmd: string; out: string[]}>;
}

export interface GraphObject extends ObjectBase {
  type: 'graph';
  nodes: Array<{
    id: Id;
    /** value: card with fields; op: circle with symbol; neuron: small circle (network diagrams) */
    kind?: 'value' | 'op' | 'neuron' | 'box';
    label: Value<string>;
    /** The words of the narration that name this node, when they differ from its label: QA checks it enters on them */
    says?: string;
    fields?: Field[];
  }>;
  /** `says`: the words of the narration that name this edge ("parent"): QA checks it enters on them */
  edges: Array<{id: Id; from: Id; to: Id; label?: string; says?: string}>;
  layout?: 'layered' | 'manual' | 'force';
  direction?: 'lr' | 'tb';
  /** Manual layout: node centres, normalised to the box shrunk by half the node size (0 and 1 touch the edges) */
  positions?: Record<Id, [number, number]>;
  /** Width of value-node cards in px (default 300) */
  nodeWidth?: number;
  /** Scales value and op nodes together (width, header height, text; default 1); an explicit `nodeWidth` wins over the scaled width */
  nodeScale?: number;
}

export interface ChartObject extends ObjectBase {
  type: 'chart';
  kind: 'bar' | 'line' | 'scatter' | 'heatmap';
  /** Inline rows, or an asset of kind "data" */
  data: Array<Record<string, string | number>> | {asset: Id};
  encoding: {x?: string; y?: string; color?: string; value?: string};
  /** bar: bars fill at the speed of the measured value (benchmarks) */
  realtime?: boolean;
  unit?: string;
}

/** Horizontal track of dated items; `appear` on `timeline#item` reveals it, `drawIn` on the object draws the track */
export interface TimelineObject extends ObjectBase {
  type: 'timeline';
  items: Array<{id: Id; label: string; date?: string; status?: 'pending' | 'fail' | 'success' | 'unknown'}>;
}

export interface StepsObject extends ObjectBase {
  type: 'steps';
  /** `highlight` on an item marks it active (persistent); `set {state: 'done'}` strikes it through */
  items: Array<{id: Id; title: string; sub?: string; state?: 'pending' | 'active' | 'done'}>;
  /** inactive items are dimmed until highlighted (default true) */
  dimInactive?: boolean;
}

/**
 * Credits generated from the document: media (assets with a license attribution, with their source) and
 * `meta.sources`. Place it where credits belong; with `exports.credits: 'auto'` one is appended when needed.
 */
export interface CreditsObject extends ObjectBase {
  type: 'credits';
  include?: Array<'media' | 'sources'>;
  /** Extra line under the lists, e.g. how the summary was written */
  note?: string;
}

/** L2 */
export interface ComponentObject extends ObjectBase {
  type: 'component';
  component: Id;
  props: Record<string, Value<unknown>>;
}

// ---------------------------------------------------------------------------------------------- scenes, beats, time

export interface Scene {
  id: Id;
  title?: string;
  pattern?: PatternUse;
  beats: Beat[];
}

export type PatternKind = 'title' | 'compare' | 'steps' | 'dag' | 'timeline' | 'grid' | 'codeOutput' | 'photoStory' | 'split' | 'full' | 'board' | 'stage';

export interface PatternUse {
  kind: PatternKind;
  /** Named slots of the pattern → object ids */
  slots: Record<string, Id | Id[]>;
  options?: Record<string, unknown>;
}

/**
 * Beat-level pattern change without `kind`: merged over the beat's current pattern (the scene pattern or the previous
 * beat's result). `slots` entries replace slots by name and `null` removes one; `options` merge key by key.
 */
export interface PatternPatch {
  kind?: undefined;
  slots?: Record<string, Id | Id[] | null>;
  options?: Record<string, unknown>;
}

export interface Beat {
  id: Id;
  /** Narration; absent = silent beat, then `duration` is required */
  lines?: Line[];
  duration?: Seconds;
  /** Extra hold after the last line */
  hold?: Seconds;
  /**
   * Per-beat pattern change (e.g. full → split): a full pattern, or a patch merged over the current one.
   * Objects keep identity across the change.
   */
  pattern?: PatternUse | PatternPatch;
  /**
   * Object state at the start of this beat (partial props). Objects present in consecutive beats
   * interpolate by identity; objects absent from `state` keep their previous state.
   * An object (or sub-part) whose first entrance-or-exit action in the scene is an entrance (other than countUp) is
   * hidden from the scene start until that entrance, unless a state in the scene shows it earlier; `visible: false` is only needed for other cases.
   */
  state?: Record<Path, ObjectState>;
  actions?: Action[];
  interactions?: Interaction[];
}

export interface Line {
  id: Id;
  /** Caption text */
  text: string;
  /**
   * Pronunciation; derived from `text` by the normaliser when absent. May carry marks that name words for anchors:
   * `{#name}…{/name}` a range, `{@name}` a point. They are stripped before the text is spoken, aligned or compared.
   */
  say?: string;
  /**
   * Player-only caption with live values, e.g. "z = {fmt(x * y, '0.0')}". Spoken audio is fixed, so narration must
   * not state param-dependent values; put them here instead. Exports use `text`.
   */
  live?: string;
  /** Word timings in seconds from the line start (filled by forced alignment; estimated when absent) */
  words?: Array<{w: string; t0: Seconds; t1: Seconds; /** how sure the aligner was, 0 to 1; absent for a word without letters */ p?: number}>;
  i18n?: Record<string, {text: string; say?: string}>;
}

export interface ObjectState {
  visible?: boolean;
  emphasis?: 'none' | 'focus' | 'dim';
  props?: Record<string, Value<unknown>>;
}

/**
 * Anchors resolve to absolute time via the time solver.
 * `word` is either a phrase that must occur in the line's `say` (first occurrence) or a word index; `mark` names a mark
 * written into the line's `say` instead, and is exclusive with `word`. `edge: 'end'` on a range mark is its last word's end.
 */
export type Anchor =
  | {line: Id; word?: string | number; mark?: string; edge?: 'start' | 'end'; offset?: Seconds}
  /** Inside a beat, `ref` may be omitted (the enclosing beat); in overrides it is required */
  | {beat: 'start' | 'end'; ref?: BeatRef; offset?: Seconds};

/**
 * Where an action starts: an Anchor, or another action's edge. `after` is the `id` of an action anywhere in the document;
 * `edge` defaults to `end` (the latest target's start plus `dur`, and for `set` and `highlight` the start), `start` begins
 * together with it. The chain always ends in a word, a mark or a beat, so the narration stays the root of time.
 */
export type ActionAnchor = Anchor | {after: Id; edge?: 'start' | 'end'; offset?: Seconds};

export type MotionKind =
  | 'appear'
  | 'disappear'
  | 'morph'
  | 'set'
  | 'tween'
  | 'highlight'
  | 'typewriter'
  | 'countUp'
  | 'drawIn'
  | 'flow'
  | 'kenBurns'
  | 'stamp'
  | 'wipe'
  | 'crossfade';

export interface Action {
  /** Unique in the document; another action's `at.after` names it */
  id?: Id;
  target: Path | Path[];
  motion: MotionKind;
  at: ActionAnchor;
  /** With a range mark in `at` and an entrance motion: the target is on screen for the range, and leaves at its end */
  during?: boolean;
  dur?: Seconds;
  /** Delay between multiple targets */
  stagger?: Seconds;
  easing?: Easing;
  /** Motion-specific: e.g. kenBurns {from:[scale,x,y], to:[...]}, flow {direction:'backward'}, set {props} and tween {props: {name: number}} (the numeric props reach those values over `dur`, from the value they have then; on a component, its props) (on a field path, `{value}` replaces the field's value from then on), morph {to:[x,y]} (moves a graph node, and the edges on it, to that position across the graph's region, 0 to 1) */
  params?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------------------------- interaction & flow

export interface Interaction {
  id: Id;
  on: {target: Path; event: 'click' | 'hover' | 'change' | 'enter'};
  do: InteractionEffect[];
  /** How the exporter flattens this interaction into a linear video */
  export: 'ignore' | 'caption' | 'linearize';
  /** Active from its beat's start until the end of: its beat, its scene (default), or the document */
  until?: 'beat' | 'scene' | 'document';
}

export type InteractionEffect =
  | {goto: BeatRef}
  | {setParam: Id; value: Value<unknown>}
  | {set: {target: Path; props: Record<string, Value<unknown>>}}
  | {pause: true}
  | {play: true};

export interface ParamDef {
  type: 'number' | 'boolean' | 'enum';
  default: number | boolean | string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

export interface Flow {
  start: BeatRef;
  edges: Array<{from: BeatRef; to: BeatRef; when: 'default' | {interaction: Id}}>;
}

// ---------------------------------------------------------------------------------------------- L1 overrides

export interface Override {
  id: Id;
  target: Path;
  /** Dotted property path, e.g. "x", "style.color", "fields.grad.value" */
  prop: string;
  keys: Array<{at: Anchor; value: unknown; easing?: Easing}>;
  /** Positional overrides are per canvas preset */
  preset?: Id;
  author: 'human' | 'agent';
  note?: string;
}

// ---------------------------------------------------------------------------------------------- export

export interface ExportPolicy {
  variants: Array<{preset: Id; lang?: string}>;
  fps?: number; // default 30
  captions?: 'burned' | 'sidecar' | 'both' | 'none';
  /**
   * auto (default): when an asset license obliges attribution and no `credits` object is placed, a 5 s credits scene
   * is appended. none: nothing is appended. Either way exports write a credits sidecar (credits.md).
   */
  credits?: 'auto' | 'none';
}
