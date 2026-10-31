/**
 * The stage: what is on screen at time t. The parts of the document stay mounted; the parts of the scene on screen are mounted when it starts and released when
 * it ends. A part is a box, invisible until an `appear`; its children are React, which draw by the clock and read what the document's animations do to the
 * targets they register (`useTarget`, `useProp`, `<Obj>`).
 */
import React, {createContext, useContext, useSyncExternalStore} from 'react';
import {captionBlocks, presenceAt, propAt, type BlockWord, type Compiled, type ThemeTokens, type VisoDoc} from '@visotalk/ir';
import {SceneCtx, useDocTime, useTime} from './react';
import {clamp01} from './motion';
import {C, F, alpha} from './theme';
import {Video} from './video';

/** What a part's children are: React nodes, or a function that returns them (so a hook can be called in it) */
export type PartBody = React.ReactNode | (() => React.ReactNode);

export interface StageData {
  doc: VisoDoc;
  c: Compiled;
  /** the children of every part, by `scene:part` (`:part` for a part of the document) */
  bodies: Map<string, PartBody>;
  theme: ThemeTokens;
  preset: {id: string; width: number; height: number};
  assetUrl: (id: string) => string;
  /** the web player, not the export (an export with `exports.captions` of `none` or `sidecar` paints none, and neither does the player) */
  live: boolean;
  /** the part the page's host is inspecting (`{vt: 'solo'}`): all other parts are hidden, without changing animation state */
  solo: Solo;
}

/** The part a host is looking at, if any. Like the clock, a store a component subscribes to, so a paused picture still answers a change. */
export class Solo {
  private part: string | null = null;
  private listeners = new Set<() => void>();
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  get = (): string | null => this.part;
  set(part: string | null): void {
    if (part === this.part) return;
    this.part = part;
    for (const fn of this.listeners) fn();
  }
}

const StageCtx = createContext<StageData | null>(null);
export const StageProvider: React.FC<StageData & {children: React.ReactNode}> = ({children, ...v}) => <StageCtx.Provider value={v}>{children}</StageCtx.Provider>;
export const useStage = (): StageData => {
  const s = useContext(StageCtx);
  if (!s) throw new Error('a part hook was called outside a part: hooks like useTarget run inside a function child of <Part> or in a component it renders');
  return s;
};

/** The part around a hook: its id (what `useProp(name, base)` reads) and the scene whose actions reach it (absent for a global part, which lives across scenes) */
const PartCtx = createContext<{id: string; scene?: string}>({id: ''});

/**
 * What the document's animations do to the target `id` at this time, as props to spread on the element that is it: `data-vt` (how a document finds it),
 * and a style with its opacity (an `appear`, a `disappear`) and the transform of its numeric props `x`, `y` (px), `scale` and `rotate` (degrees). Merge
 * your own style over `style` without replacing `opacity`, `visibility` or `transform`.
 */
/**
 * Inside a part of the document (global), an element is invisible until an `appear` shows it, like the part: what is hidden is said in one place. Inside a scene's part
 * it is visible with the part unless its first action is an `appear` (the scene's parts start from nothing, so that is a short list).
 */
export function useTarget(id: string) {
  const part = useContext(PartCtx);
  return useTargetOf(id, part.id !== '' && part.scene === undefined);
}

/** `hidden`: invisible until its first appear (a part, and what is inside a global part) */
function useTargetOf(id: string, hidden: boolean): {'data-vt': string; style: React.CSSProperties} {
  const {c} = useStage();
  const {scene} = useContext(PartCtx);
  const t = useDocTime();
  const presence = presenceAt(c, id, t, scene, hidden);
  const num = (name: string, base: number) => Number(propAt(c, id, name, t, base, scene));
  const x = num('x', 0), y = num('y', 0), s = num('scale', 1), r = num('rotate', 0);
  const transform = [x || y ? `translate(${x}px, ${y}px)` : '', s !== 1 ? `scale(${s})` : '', r ? `rotate(${r}deg)` : ''].filter(Boolean).join(' ');
  return {'data-vt': id, style: {opacity: presence, ...(presence <= 0 && {visibility: 'hidden' as const}), ...(transform && {transform})}};
}

/**
 * A prop of a target that the document changes with `<Tween>` and `<Set>`: its value now, `base` until the first one. `useProp(name, base)` reads the part
 * the hook runs in (`<Set target="note" to={{text: '…'}}/>` for `<Part id="note">`); `useProp(id, name, base)` reads the target `id`.
 */
export function useProp(name: string, base: number): number;
export function useProp(name: string, base: string): string;
export function useProp(name: string, base: boolean): boolean;
export function useProp(id: string, name: string, base: number): number;
export function useProp(id: string, name: string, base: string): string;
export function useProp(id: string, name: string, base: boolean): boolean;
export function useProp(...args: [string, number | string | boolean] | [string, string, number | string | boolean]): number | string | boolean {
  const {c} = useStage();
  const part = useContext(PartCtx);
  if (args.length === 2 && !part.id) throw new Error('useProp(name, base) reads the part it runs in: call it inside a part, or name the target: useProp(id, name, base)');
  const [id, name, base] = args.length === 2 ? [part.id, args[0], args[1]] : args;
  return propAt(c, id, name, useDocTime(), base, part.scene);
}

/** The words a part draws, by id: what the document's `texts` say for it, else `base`, the words the part was written with. A person edits these in the web editor. */
export function useText(id: string, base: string): string {
  return useStage().doc.texts?.[id] ?? base;
}

/** A target as an element: `<Obj id="bar" style={{…}}>…</Obj>` is a div (or `as="g"`, `as="span"`) a document can name; its DOM `id` is the target's, so a stylesheet can too (`#bar`) */
export function Obj<T extends keyof React.JSX.IntrinsicElements = 'div'>({id, as, style, children, ...rest}: {id: string; as?: T; style?: React.CSSProperties; children?: React.ReactNode} & Omit<React.JSX.IntrinsicElements[T], 'id' | 'style' | 'children'>) {
  const t = useTarget(id);
  // the document's animation and the element's own style compose: opacities multiply, transforms follow one another
  const merged = {...style, ...t.style, opacity: Number(style?.opacity ?? 1) * Number(t.style.opacity),
    ...(style?.transform && t.style.transform && {transform: `${t.style.transform} ${style.transform}`})};
  return React.createElement((as ?? 'div') as string, {...rest, id, ...t, style: merged}, children);
}

/** The canvas the part is drawn on: size in px and which preset */
export const useCanvas = (): {width: number; height: number; preset: string} => {
  const {preset} = useStage();
  return {width: preset.width, height: preset.height, preset: preset.id};
};
/** The document's theme tokens (colours and fonts), also CSS custom properties `var(--vt-data)`, `var(--vt-sans)` */
export const useTheme = (): ThemeTokens => useStage().theme;
/** The URL of an asset of the document (`<Asset>`) */
export const useAsset = (id: string): string => useStage().assetUrl(id);
/** The scenes of the film with where each starts and ends, in document seconds: a part that draws progress across scenes (a chapter rail) reads them */
export const useScenes = (): Array<{id: string; from: number; end: number}> => useStage().c.scenes.map((s) => ({id: s.id, from: s.from, end: s.end}));
/** The film's sounds (`<Sound>`), each with its asset and when it starts and ends in document seconds: a picture that answers a sound (a flash on a hit, a lamp on a ping) reads them, so the document's sounds are the one list of those moments */
export const useSounds = (): Array<{asset: string; start: number; end?: number}> => useStage().c.sounds.map((s) => ({asset: s.asset, start: s.start, ...(s.end !== undefined && {end: s.end})}));
/** The frame the clock is on, at the document's frame rate */
export const useFrame = (): number => Math.round(useTime() * useStage().c.fps);

const Render: React.FC<{fn: () => React.ReactNode}> = ({fn}) => <>{fn()}</>;

/** A part whose code throws draws nothing, and is recorded by id for `qa`: uncaught, the exception would unmount the whole film and name no part */
class PartBoundary extends React.Component<{part: string; scene?: string; children: React.ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() {
    return {failed: true};
  }
  componentDidCatch(error: unknown) {
    const w = window as unknown as {__visotalkPartErrors?: Array<{part: string; scene?: string; message: string}>};
    const {part, scene} = this.props;
    w.__visotalkPartErrors ??= [];
    if (!w.__visotalkPartErrors.some((e) => e.part === part && e.scene === scene)) w.__visotalkPartErrors.push({part, scene, message: String((error as Error)?.message ?? error)});
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** A part: invisible until the document appears it. `scene` is the scene it belongs to, absent for a global part */
const PartHost: React.FC<{part: VisoDoc['scenes'][number]['parts'][number]; body: PartBody; scene?: string}> = ({part, body, scene}) => (
  <PartCtx.Provider value={{id: part.id, scene}}>
    <PartBoundary part={part.id} scene={scene}>
      <PartBox part={part} body={body} />
    </PartBoundary>
  </PartCtx.Provider>
);
const PartBox: React.FC<{part: VisoDoc['scenes'][number]['parts'][number]; body: PartBody}> = ({part, body}) => {
  const {preset, solo} = useStage();
  const {scene} = useContext(PartCtx);
  const t = useTargetOf(part.id, true);
  const soloed = useSyncExternalStore(solo.subscribe, solo.get);
  const x = part.x ?? 0, y = part.y ?? 0;
  return (
    <div data-part={part.id} {...(scene === undefined && {'data-global': ''})} {...t} style={{position: 'absolute', left: x, top: y, width: part.w ?? preset.width - x, height: part.h ?? preset.height - y, ...t.style}}>
      {/* A separate opacity gate cannot be overridden by a descendant's visibility or the part's animated opacity. */}
      <div style={{position: 'absolute', inset: 0, opacity: soloed !== null && soloed !== part.id ? 0 : 1, pointerEvents: soloed !== null && soloed !== part.id ? 'none' : undefined}}>
        {typeof body === 'function' ? <Render fn={body} /> : body}
      </div>
    </div>
  );
};

/** Consecutive characters of one word (`unit`, within a line) together; every other word alone */
const groupUnits = (words: BlockWord[]): BlockWord[][] => {
  const out: BlockWord[][] = [];
  for (const w of words) {
    const prev = out.at(-1)?.at(-1);
    if (prev && w.unit !== undefined && prev.unit === w.unit && prev.line === w.line) out[out.length - 1].push(w);
    else out.push([w]);
  }
  return out;
};

/** `captions: 'words'`: the block of spoken words that fills the lower half of a tall frame, one word appearing as it is said, the line being said in full ink */
/** The caption skin's values with the defaults filled in; `tall` scales the sizes for a portrait frame, which is read small */
function captionLook(theme: ThemeTokens, tall: boolean, words: boolean) {
  const k = theme.caption ?? {};
  const scale = tall ? (words ? 88 / 38 : 50 / 34) : 1;
  const size = (k.size ?? 34) * (words ? 38 / 34 : 1) * scale;
  return {
    fontFamily: F[k.font ?? 'sans'], fontSize: Math.round(size), fontWeight: k.weight ?? (words ? 700 : 400), color: k.color ?? C.text,
    ...(k.shadow && {textShadow: k.shadow}),
    background: k.background === 'none' ? 'transparent' : (k.background ?? alpha(C.bg, 0.82)),
    radius: k.radius ?? 10, padding: k.padding ?? [10, 26], bottom: k.bottom ?? 54, maxWidth: k.maxWidth ?? 1500,
    rule: k.rule, ruleSide: k.ruleSide ?? 'top',
  };
}

const WordCaptions: React.FC = () => {
  const {c, preset, theme} = useStage();
  const t = useDocTime();
  const blocks = React.useMemo(() => captionBlocks(c), [c]);
  const block = blocks.find((b) => t >= b.from && t < b.to);
  if (!block) return null;
  const tall = preset.height > preset.width;
  const now = [...block.words].reverse().find((w) => w.t0 <= t)?.line;
  const k = captionLook(theme, tall, true);
  return (
    <div data-caption="words" style={{position: 'absolute', ...(tall ? {left: preset.width * 0.067, right: preset.width * 0.067, top: preset.height * 0.527} : {left: 160, right: 160, bottom: k.bottom, textAlign: 'center'}),
      fontFamily: k.fontFamily, fontSize: k.fontSize, fontWeight: k.fontWeight, lineHeight: tall ? 1.35 : 1.5, color: k.color, textShadow: k.textShadow}}>
      {groupUnits(block.words).map((group, g) => {
        const spans = group.map((w, i) => {
          const p = clamp01((t - w.t0) / 0.16);
          return <span key={`${g}.${i}`} style={{display: 'inline-block', marginRight: w.cjk ? 0 : '0.28em', opacity: p * (w.line === now ? 1 : 0.62), transform: `translateY(${(1 - p) * 10}px)`}}>{w.w}</span>;
        });
        // the characters of one word stay on one line
        return group.length > 1 ? <span key={g} style={{whiteSpace: 'nowrap'}}>{spans}</span> : spans[0];
      })}
    </div>
  );
};

const Captions: React.FC<{sceneId: string}> = ({sceneId}) => {
  const {c, doc, preset, theme} = useStage();
  const tall = preset.height > preset.width;
  const t = useDocTime();
  const mode = doc.exports?.captions ?? 'burned';
  if (mode === 'words') return <WordCaptions />;
  if (mode === 'none' || mode === 'sidecar') return null;
  const sc = c.scenes.find((s) => s.id === sceneId)!;
  const line = sc.lines.find((l) => t >= l.from && t < l.from + l.duration + 0.2);
  if (!line) return null;
  const o = clamp01((t - line.from) / 0.2) * (1 - clamp01((t - line.from - line.duration) / 0.2));
  const k = captionLook(theme, tall, false);
  // a phone frame is read small: the caption is larger, and keeps clear of the edges
  const [py, px] = tall ? (theme.caption?.padding ?? [14, 30]) : k.padding;
  // the rule: a bar down the caption's left side, inside its padding, or a short one centred above its text
  const bar = tall ? 6 : 4;
  const rule = !k.rule ? null : k.ruleSide === 'left'
    ? <div style={{position: 'absolute', left: 0, top: py * 0.6, bottom: py * 0.6, width: bar, borderRadius: bar / 2, background: k.rule}} />
    : <div style={{width: tall ? 80 : 56, height: bar - 1, background: k.rule, margin: `0 auto ${tall ? 12 : 8}px`}} />;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: tall ? Math.max(110, k.bottom) : k.bottom, display: 'flex', justifyContent: 'center', opacity: o}}>
      <div data-caption={line.id} style={{maxWidth: tall ? preset.width * 0.88 : k.maxWidth, textAlign: 'center', fontFamily: k.fontFamily, fontSize: k.fontSize, fontWeight: k.fontWeight, lineHeight: 1.35, color: k.color,
        background: k.background, padding: `${py}px ${px}px`, borderRadius: k.radius, textShadow: k.textShadow, ...(rule && {position: 'relative' as const})}}>
        {rule}
        {line.text}
      </div>
    </div>
  );
};

/**
 * What a host page's stylesheet must not do to a film: a Claude artifact's page and Tailwind's preflight both cap pictures and videos
 * at their box's width (img, video { max-width: 100% }), which squeezes a picture drawn wider than its box, a map shown a tile at a time.
 * Scoped to the stage and more specific than the host's rule; a part's own inline style still wins.
 */
const STAGE_CSS = '.vt-stage img,.vt-stage video,.vt-stage canvas,.vt-stage svg{max-width:none;max-height:none}';

/** The scene on screen at the document time: its parts and the document's, then the caption */
export const Stage: React.FC = () => {
  const {doc, c, bodies} = useStage();
  const t = useDocTime();
  const si = Math.max(0, c.scenes.findIndex((s) => t >= s.from && t < s.end));
  const last = c.scenes.length - 1;
  const idx = t >= c.duration ? last : si;
  const sc = c.scenes[idx], scene = doc.scenes[idx];
  if (!sc) return null;
  // the document's parts stay; the scene's are mounted for it and released with it (the key names the scene)
  const parts = [
    ...(doc.parts ?? []).map((part) => ({part, body: bodies.get(`:${part.id}`), scene: undefined as string | undefined})),
    ...scene.parts.map((part) => ({part, body: bodies.get(`${scene.id}:${part.id}`), scene: scene.id})),
  ].map((e, i) => ({...e, i})).sort((a, b) => (a.part.z ?? 0) - (b.part.z ?? 0) || a.i - b.i);
  const transparent = typeof location !== 'undefined' && new URLSearchParams(location.search).get('alpha') === '1';
  // a video recording is the narration and the picture under everything: the film's clock plays it whole; a layer (alpha) leaves it out, for the editor that has it
  const recording = doc.voice?.voice.startsWith('recording:') ? doc.assets?.find((a) => a.id === doc.voice!.voice.slice('recording:'.length)) : undefined;
  return (
    <SceneCtx.Provider value={{from: sc.from, duration: sc.duration}}>
      <div className="vt-stage" style={{position: 'absolute', inset: 0, background: transparent ? 'transparent' : C.bg, overflow: 'hidden'}}>
        <style>{STAGE_CSS}</style>
        {recording?.kind === 'video' && !transparent && (
          <div data-vt-recording="" style={{position: 'absolute', inset: 0}}><Video asset={recording.id} fit="fill" /></div>
        )}
        {parts.map(({part, body, scene: s}) => <PartHost key={`${s ?? ''}:${part.id}`} part={part} body={body} scene={s} />)}
        <Captions sceneId={sc.id} />
      </div>
    </SceneCtx.Provider>
  );
};
