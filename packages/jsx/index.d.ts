/**
 * The tags of a VisoTalk document, typed. A document is a TSX file that the engine reads and never runs, so these are declarations only:
 *
 *   import {Doc, Scene, Beat, Line, Chip, Stamp} from '@visotalk/jsx';
 *   export default <Doc id="demo" title="Demo" lang="en">
 *     <Chip id="tag" text="ETag" />
 *     <Scene id="s" pattern="title" slots={{title: "tag"}}>
 *       <Beat id="b1"><Line id="l1">The server sends an <Stamp on="tag">ETag</Stamp>.</Line></Beat>
 *     </Scene>
 *   </Doc>;
 *
 * A component is imported from its module (`import {Moon} from './components/moon.ts'`) and is a tag with its own props (see `defineComponent` in `@visotalk/runtime`).
 * Object attributes are the fields of the object types in `@visotalk/ir` (spec/ir/0.4/ir.ts); list fields are child tags. An object is referred to by
 * its id as a string, a part of it as `"id#part"`. `tsc` checks a document against these; `visotalk validate` checks what types cannot.
 */
import type {
  CanvasPreset, Meta, ChartObject, CardObject, ChipObject, CodeObject, ConnectorObject, CounterObject, CreditsObject, Easing,
  ExportPolicy, Flow, GraphObject, ImageObject, Interaction, Line as IRLine, MathObject, ObjectState, Override, Pacing, ParamDef, PatternKind, ShapeObject, StepsObject,
  TerminalObject, TextObject, ThemeTokens, TimelineObject, VideoObject, Voice, Asset as IRAsset,
} from '@visotalk/ir';

type Children = unknown;
type Tag<P> = (props: P & {children?: Children}) => null;
type ListKeys = 'nodes' | 'edges' | 'fields' | 'items' | 'steps' | 'runs';
/** An object tag: the fields of its type, its `id`, and its list fields as child tags */
type ObjectProps<T> = Omit<T, 'type' | ListKeys> & {id: string};
type Element<T, K extends keyof T> = T[K] extends Array<infer E> | undefined ? E : never;

/** `"object"` or `"object#part"` / `"object#part.field"`: what a motion acts on */
type Ref = string;
type Slots = Record<string, string | string[]>;

export const Doc: Tag<{
  id: string; title: string; lang: string; description?: string; sources?: Meta['sources']; generator?: string; created?: string; updated?: string; spec?: string;
  theme?: string; tokens?: Partial<ThemeTokens>; voice?: string; speed?: number; lexicon?: Voice['lexicon'];
  /** "16x9,9x16", or a <Canvas> child with <Preset> tags */
  canvas?: string; pacing?: Partial<Pacing>;
  params?: Record<string, ParamDef>; flow?: Flow; overrides?: Override[]; exports?: ExportPolicy;
}>;
export const Canvas: Tag<{}>;
export const Preset: Tag<CanvasPreset>;
export const Asset: Tag<IRAsset>;

export const Scene: Tag<{id: string; title?: string; pattern?: PatternKind; slots?: Slots; options?: Record<string, unknown>}>;
export const Beat: Tag<{
  id: string; duration?: number; hold?: number;
  /** A pattern with `pattern` replaces the scene's; slots alone patch it (a `null` slot removes one) */
  pattern?: PatternKind; slots?: Record<string, string | string[] | null>; options?: Record<string, unknown>;
  interactions?: Interaction[];
}>;
/** `text` is the caption; it may be left out when the words inside the tag are the caption */
export const Line: Tag<Omit<IRLine, 'words' | 'text'> & {text?: string}>;
export const State: Tag<ObjectState & {target: Ref}>;

export const Text: Tag<ObjectProps<TextObject>>;
export const Shape: Tag<ObjectProps<ShapeObject>>;
export const Connector: Tag<ObjectProps<ConnectorObject>>;
export const Image: Tag<ObjectProps<ImageObject>>;
export const Video: Tag<ObjectProps<VideoObject>>;
export const Card: Tag<ObjectProps<CardObject>>;
export const Chip: Tag<ObjectProps<ChipObject>>;
export const Counter: Tag<ObjectProps<CounterObject>>;
export const Math: Tag<ObjectProps<MathObject>>;
export const Code: Tag<ObjectProps<CodeObject>>;
export const Terminal: Tag<ObjectProps<TerminalObject>>;
export const Graph: Tag<ObjectProps<GraphObject>>;
export const Chart: Tag<ObjectProps<ChartObject>>;
export const Timeline: Tag<ObjectProps<TimelineObject>>;
export const Steps: Tag<ObjectProps<StepsObject>>;
export const Credits: Tag<ObjectProps<CreditsObject>>;

export const Node: Tag<Element<GraphObject, 'nodes'>>;
export const Edge: Tag<Element<GraphObject, 'edges'>>;
export const Field: Tag<Element<CardObject, 'fields'>>;
export const Item: Tag<Element<StepsObject, 'items'> | Element<TimelineObject, 'items'>>;
export const Step: Tag<Element<TerminalObject, 'steps'>>;
export const Run: Tag<Element<TextObject, 'runs'>>;

/** A motion: on its own inside a beat it needs a position (`at`, `after`, or `line` with `word` or `mark`); inside a <Line> it is anchored on the words it wraps */
interface MotionProps {
  on: Ref | Ref[];
  id?: string; dur?: number; stagger?: number; easing?: Easing; params?: Record<string, unknown>; during?: boolean;
  /** The beat's start or end; the object form is for a beat of another scene: {beat, ref: "scene/beat", offset} */
  at?: 'start' | 'end' | {beat: 'start' | 'end'; ref?: string; offset?: number};
  after?: string;
  line?: string; word?: string | number; mark?: string;
  edge?: 'start' | 'end'; offset?: number;
}
export const Appear: Tag<MotionProps>;
export const Disappear: Tag<MotionProps>;
export const Morph: Tag<MotionProps>;
/** The props it changes are its other attributes: `<Set on="view" phase={0.25}/>` */
export const Set: Tag<MotionProps & {[prop: string]: unknown}>;
/** Numeric props reach their values over `dur`, from the value they have then: `<Tween on="view" phase={0.5} dur={1}>waxing</Tween>` */
export const Tween: Tag<MotionProps & {[prop: string]: unknown}>;
export const Highlight: Tag<MotionProps>;
export const Typewriter: Tag<MotionProps>;
export const CountUp: Tag<MotionProps>;
export const DrawIn: Tag<MotionProps>;
export const Flow: Tag<MotionProps>;
export const KenBurns: Tag<MotionProps>;
export const Stamp: Tag<MotionProps>;
export const Wipe: Tag<MotionProps>;
export const Crossfade: Tag<MotionProps>;
