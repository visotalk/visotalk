/**
 * React bindings for the scheduler. Components read time from context, never from wall clocks,
 * so the same tree renders identically in the live player and in the driven exporter.
 */
import React, {createContext, useContext, useSyncExternalStore} from 'react';
import type {Clock} from './clock';
import type {MediaScheduler} from './media';
import type {Readiness} from './readiness';

export interface Runtime {
  clock: Clock;
  readiness: Readiness;
  width: number;
  height: number;
  pixelRatio: number;
  /** the web player's media (absent in the export): `<Video>` takes its clips from it */
  media?: MediaScheduler;
}

const RuntimeCtx = createContext<Runtime | null>(null);
export const SceneCtx = createContext<{from: number; duration: number}>({from: 0, duration: Infinity});

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

/** Time since the start of the scene on screen, in seconds: the clock a part draws by */
export const useTime = (): number => useDocTime() - useContext(SceneCtx).from;
/** Length of the scene on screen, in seconds */
export const useSceneDuration = (): number => useContext(SceneCtx).duration;
/** Work the frame must wait for before it is captured, and the web player's clock before it goes on: a part's own async loading (fonts and images are awaited already) */
export const useReadiness = (): Readiness => useRuntime().readiness;
