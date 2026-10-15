/**
 * React bindings for the scheduler. Components read time from context, never from wall clocks,
 * so the same tree renders identically in the live player and in the driven exporter.
 */
import React, {createContext, useContext, useLayoutEffect, useRef, useSyncExternalStore} from 'react';
import type {Clock} from './clock';
import type {Readiness} from './readiness';
import {randomFor} from './random';
import {themeTokens, type ThemeTokens} from '@visotalk/ir';
import type {TimedComponent, TimedContext, TimedInstance} from './timed';
/** Video asset as the runtime sees it (proxy URL, constant frame rate) */
export interface MediaAsset {
  src: string;
  fps: number;
  frames: number;
  width: number;
  height: number;
}

/** What a media element drew in the current frame; the exporter's frame manifest */
export type DrawInfo = {kind: 'video'; asset: string; frame: number; sourceTime: number; sceneTime: number; sceneFrom: number; in: number; rate: number};

export interface Runtime {
  clock: Clock;
  readiness: Readiness;
  width: number;
  height: number;
  pixelRatio: number;
  media: Record<string, MediaAsset>;
  /** Driven mode: URL prefix of pre-extracted frames, `${mediaBase}/${asset}/${frame}.png` */
  mediaBase: string;
  drawn: Map<Element, DrawInfo>;
}

const RuntimeCtx = createContext<Runtime | null>(null);
const SceneCtx = createContext<{from: number; duration: number}>({from: 0, duration: Infinity});

export const RuntimeProvider: React.FC<{runtime: Runtime; children: React.ReactNode}> = ({runtime, children}) => (
  <RuntimeCtx.Provider value={runtime}>{children}</RuntimeCtx.Provider>
);

export const useRuntime = (): Runtime => {
  const r = useContext(RuntimeCtx);
  if (!r) throw new Error('useRuntime outside RuntimeProvider');
  return r;
};

/** Document time in seconds */
export const useDocTime = (): number => {
  const {clock} = useRuntime();
  return useSyncExternalStore(clock.subscribe, clock.getTime);
};

/** Time relative to the enclosing <Scene>, in seconds */
export const useTime = (): number => useDocTime() - useContext(SceneCtx).from;
export const useSceneDuration = (): number => useContext(SceneCtx).duration;
export const useSceneFrom = (): number => useContext(SceneCtx).from;

/**
 * A time window of the document. Mounted slightly before it starts (premount) so assets and
 * timed components can prepare; hidden until its start.
 */
export const Scene: React.FC<{from: number; duration: number; end?: number; premount?: number; children: React.ReactNode}> = ({
  from,
  duration,
  end = from + duration,
  premount = 1,
  children,
}) => {
  const t = useDocTime();
  if (t < from - premount || t >= end) return null;
  const visible = t >= from;
  return (
    <SceneCtx.Provider value={{from, duration}}>
      {/* opacity as well as visibility: a child that sets `visibility: visible` itself (a graph part, a field) escapes a hidden parent, but not a transparent one */}
      <div style={{position: 'absolute', inset: 0, visibility: visible ? 'visible' : 'hidden', opacity: visible ? 1 : 0}}>{children}</div>
    </SceneCtx.Provider>
  );
};

/** Host for an L2 `visotalk/timed@1` component. */
export function Timed<P>({component, props, style, box, local, theme}: {component: TimedComponent<P>; props: P; style?: React.CSSProperties; box?: {w: number; h: number}; local?: number; theme?: ThemeTokens}) {
  const rt = useRuntime();
  const time = useTime();
  const duration = useSceneDuration();
  const host = useRef<HTMLDivElement>(null);
  const inst = useRef<TimedInstance<P> | null>(null);
  const ready = useRef(false);
  const ctxRef = useRef<TimedContext<P> | null>(null);

  const ctx: TimedContext<P> = {
    props,
    time: Math.max(0, time),
    local: Math.max(0, local ?? time),
    duration,
    width: box?.w ?? rt.width,
    height: box?.h ?? rt.height,
    theme: (theme ?? themeTokens()) as TimedContext<P>['theme'],
    random: randomFor,
    pixelRatio: rt.pixelRatio,
  };
  ctxRef.current = ctx;

  useLayoutEffect(() => {
    const i = component.mount(host.current!);
    inst.current = i;
    ready.current = false;
    rt.readiness.hold(
      (async () => {
        await i.prepare?.(ctxRef.current!);
        ready.current = true;
        // Draw the frame that was requested while preparing.
        i.render(ctxRef.current!);
      })(),
    );
    return () => {
      i.dispose?.();
      inst.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [component]);

  useLayoutEffect(() => {
    if (ready.current) inst.current?.render(ctx);
  });

  return <div ref={host} style={{position: 'absolute', inset: 0, ...style}} />;
}
