/**
 * The tags of a VisoTalk document. The engine reads the skeleton of the file as text (lines, parts, animations); these are what the same file
 * means as a module: React components that render nothing, so `export default <Doc …>` is a tree the runtime reads the parts' children from.
 *
 *   import {Doc, Scene, Line, Part, Animation, Appear} from '@visotalk/jsx';
 *   import {useTarget} from '@visotalk/runtime';
 *
 *   export default <Doc id="demo" title="Demo" lang="en">
 *     <Scene id="intro">
 *       <Line id="l1">The server sends a tag.</Line>
 *       <Part id="tag">{() => <div {...useTarget("tag-box")}>ETag</div>}</Part>
 *       <Animation><Appear on="tag-box" line="l1" word="tag"/></Animation>
 *     </Scene>
 *   </Doc>;
 *
 * A part's children are React: elements, or a function that returns them (hooks like `useTarget` can only be called inside a component, and a function
 * child is one). The attributes of the other tags are literals; `tsc` checks them, `visotalk validate` checks what types cannot.
 */
import type {ReactNode} from 'react';
import type {Asset as IRAsset, CanvasPreset, Easing, ExportPolicy, Line as IRLine, Meta, Pacing, ThemeTokens, Voice} from '@visotalk/ir';

type Tag<P> = (props: P) => null;
const tag = (name: string) => ({[name]: () => null})[name];

export const Doc: Tag<{
  id: string; title: string; lang: string; description?: string; poster?: number; sources?: Meta['sources']; generator?: string; created?: string; updated?: string; spec?: string;
  theme?: string; tokens?: Partial<ThemeTokens>; voice?: string; speed?: number; lexicon?: Voice['lexicon'];
  /** "16x9,9x16", or a <Canvas> child with <Preset> tags */
  canvas?: string; pacing?: Pacing; texts?: Record<string, string>; exports?: ExportPolicy;
  children?: ReactNode;
}> = tag('Doc');
export const Canvas: Tag<{children?: ReactNode}> = tag('Canvas');
export const Preset: Tag<CanvasPreset> = tag('Preset');
export const Asset: Tag<IRAsset> = tag('Asset');

export const Scene: Tag<{id: string; title?: string; /** a scene without lines needs it, seconds */ duration?: number; children?: ReactNode}> = tag('Scene');
/** The words spoken are the children; `text` is the caption when it differs from them (digits for numbers spoken as words) */
export const Line: Tag<Pick<IRLine, 'id' | 'hold'> & {text?: string; children: ReactNode}> = tag('Line');
/** A phrase of a line an action hangs on by name (`mark="…"`): the way to name a place when a phrase that occurs twice, or an unspaced language, makes `word` awkward */
export const Mark: Tag<{id: string; children: string}> = tag('Mark');

interface Box {x?: number; y?: number; w?: number; h?: number; z?: number}
/** A box (default: the whole canvas) holding React: elements, or a function returning them. Invisible until an `<Appear>` shows it; in a `<Scene>` it ends with the scene, in `<Doc>` it stays */
export const Part: Tag<{id: string} & Box & {children?: ReactNode | (() => ReactNode)}> = tag('Part');

export const Animation: Tag<{children?: ReactNode}> = tag('Animation');

/**
 * Music or a sound effect of an `<Asset kind="audio">`, in a `<Scene>`: it starts on a word of a line (`line` + `word`), `at` seconds into the scene, or "start"/"end" of it.
 * `volume` is dB against the file; the narration is never changed. `loop` plays it again until `dur` seconds are up, or to the end of the film; `fadeIn` and `fadeOut` are
 * seconds (`fadeOut` needs `dur` or `loop`); `duck` is how many dB it steps back while the narration is speaking. `<Sound asset="bed" at="start" loop volume={-8} duck={4} fadeIn={1.2} fadeOut={4}/>`.
 */
export const Sound: Tag<{
  asset: string; id?: string; dur?: number; until?: Until; volume?: number; loop?: boolean; fadeIn?: number; fadeOut?: number; duck?: number;
  at?: number | 'start' | 'end'; line?: string; word?: string; nth?: number; mark?: string; edge?: 'start' | 'end'; offset?: number;
}> = tag('Sound');

/** Where an action or a sound ends, instead of `dur`: "end" (or "start") of its scene, seconds into it, a word of a line, or a scene edge with an offset: `until="end"`, `until={{line: "l3", word: "the curve"}}`, `until={{scene: "end", offset: 1.5}}` */
type Until = 'start' | 'end' | number | {line: string; word?: string; nth?: number; edge?: 'start' | 'end'; offset?: number} | {scene: 'start' | 'end'; offset?: number} | {at: number};

/** A motion needs exactly one place to start: a word of a line (`line` + `word`, `nth` for the nth occurrence), `after` another action, or `at` seconds into the scene (or "start", "end") */
interface MotionProps {
  /** a part, or an element a part registers with `useTarget` or `<Obj>`: ids are unique within a scene */
  on: string | string[];
  id?: string; dur?: number; stagger?: number; easing?: Easing;
  /** where it ends, instead of `dur` (not on `<Set>`, nor with `repeat`) */
  until?: Until;
  /** `<Tween>` only: plays again this many times (-1: for the whole film); `yoyo` makes every other play run backwards */
  repeat?: number; yoyo?: boolean;
  at?: number | 'start' | 'end';
  after?: string;
  line?: string; word?: string; nth?: number; mark?: string;
  edge?: 'start' | 'end'; offset?: number;
}
export const Appear: Tag<MotionProps> = tag('Appear');
export const Disappear: Tag<MotionProps> = tag('Disappear');
/** The props it changes are its other attributes: numbers, colours ("#426894") and lengths ("12px"): `<Tween on="bar" w={1100} line="l1" word="counted" dur={1.4}/>`; read with `useProp("bar", "w", 0)`. `x`, `y`, `scale` and `rotate` move the target itself */
export const Tween: Tag<MotionProps & {[prop: string]: unknown}> = tag('Tween');
/** Like `<Tween>`, at once, and a value may be a string or true/false */
export const Set: Tag<MotionProps & {[prop: string]: unknown}> = tag('Set');
