/**
 * The stage: what is on screen at time t. The parts of the document stay mounted; the parts of the scene on screen are mounted when it starts and released when
 * it ends. A part is a box, invisible until an `appear`; its children are React, which draw by the clock and read what the document's animations do to the
 * targets they register (`useTarget`, `useProp`, `<Obj>`).
 */
import React, {createContext, useContext} from 'react';
import {presenceAt, propAt, type Compiled, type ThemeTokens, type VisoDoc} from '@visotalk/ir';
import {SceneCtx, useDocTime, useTime} from './react';
import {clamp01} from './motion';
import {C, F} from './theme';

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
  /** the web player (captions always on screen), not the export (which follows `exports.captions`) */
  live: boolean;
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
 * the hook runs in (`<Set on="note" text="…">` for `<Part id="note">`); `useProp(id, name, base)` reads the target `id`.
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

/** A target as an element: `<Obj id="bar" style={{…}}>…</Obj>` is a div (or `as="g"`, `as="span"`) a document can name */
export function Obj<T extends keyof React.JSX.IntrinsicElements = 'div'>({id, as, style, children, ...rest}: {id: string; as?: T; style?: React.CSSProperties; children?: React.ReactNode} & Omit<React.JSX.IntrinsicElements[T], 'id' | 'style' | 'children'>) {
  const t = useTarget(id);
  // the document's animation and the element's own style compose: opacities multiply, transforms follow one another
  const merged = {...style, ...t.style, opacity: Number(style?.opacity ?? 1) * Number(t.style.opacity),
    ...(style?.transform && t.style.transform && {transform: `${t.style.transform} ${style.transform}`})};
  return React.createElement((as ?? 'div') as string, {...rest, ...t, style: merged}, children);
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
/** The frame the clock is on, at the document's frame rate */
export const useFrame = (): number => Math.round(useTime() * useStage().c.fps);

const Render: React.FC<{fn: () => React.ReactNode}> = ({fn}) => <>{fn()}</>;

/** A part: invisible until the document appears it. `scene` is the scene it belongs to, absent for a global part */
const PartHost: React.FC<{part: VisoDoc['scenes'][number]['parts'][number]; body: PartBody; scene?: string}> = ({part, body, scene}) => (
  <PartCtx.Provider value={{id: part.id, scene}}>
    <PartBox part={part} body={body} />
  </PartCtx.Provider>
);
const PartBox: React.FC<{part: VisoDoc['scenes'][number]['parts'][number]; body: PartBody}> = ({part, body}) => {
  const {preset} = useStage();
  const {scene} = useContext(PartCtx);
  const t = useTargetOf(part.id, true);
  const x = part.x ?? 0, y = part.y ?? 0;
  return (
    <div data-part={part.id} {...(scene === undefined && {'data-global': ''})} {...t} style={{position: 'absolute', left: x, top: y, width: part.w ?? preset.width - x, height: part.h ?? preset.height - y, ...t.style}}>
      {typeof body === 'function' ? <Render fn={body} /> : body}
    </div>
  );
};

const Captions: React.FC<{sceneId: string}> = ({sceneId}) => {
  const {c, doc, live} = useStage();
  const t = useDocTime();
  const mode = doc.exports?.captions ?? 'burned';
  if (!live && (mode === 'none' || mode === 'sidecar')) return null;
  const sc = c.scenes.find((s) => s.id === sceneId)!;
  const line = sc.lines.find((l) => t >= l.from && t < l.from + l.duration + 0.2);
  if (!line) return null;
  const o = clamp01((t - line.from) / 0.2) * (1 - clamp01((t - line.from - line.duration) / 0.2));
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 54, display: 'flex', justifyContent: 'center', opacity: o}}>
      <div data-caption={line.id} style={{maxWidth: 1500, textAlign: 'center', fontFamily: F.sans, fontSize: 34, lineHeight: 1.35, color: C.text,
        background: 'rgba(11,14,20,0.82)', padding: '10px 26px', borderRadius: 10}}>
        {line.text}
      </div>
    </div>
  );
};

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
  return (
    <SceneCtx.Provider value={{from: sc.from, duration: sc.duration}}>
      <div style={{position: 'absolute', inset: 0, background: C.bg, overflow: 'hidden'}}>
        {parts.map(({part, body, scene: s}) => <PartHost key={`${s ?? ''}:${part.id}`} part={part} body={body} scene={s} />)}
        <Captions sceneId={sc.id} />
      </div>
    </SceneCtx.Provider>
  );
};
