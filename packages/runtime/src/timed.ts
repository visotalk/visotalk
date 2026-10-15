/**
 * `visotalk/timed@1` — the L2 contract.
 *
 * A timed component draws a pure function of (props, time, seed). It may do expensive,
 * deterministic work up front in prepare(), e.g. run a fixed-step simulation and keep the
 * samples, but render() must not depend on wall time, call order, or previous frames.
 * The runtime may call render() for any time in any order (seeking, parallel chunks).
 */
import type {ThemeColorKey, ThemeTokens} from '@visotalk/ir';
import type {Random} from './random';

export interface TimedContext<P> {
  props: P;
  /** Seconds since the component's scene started */
  time: number;
  /** Seconds since the component's first entrance in its scene (the scene's start when it has none): for motion of its own */
  local: number;
  /** Total duration of the component's scene, seconds */
  duration: number;
  /** The box the document placed the component in (its pattern slot), in canvas pixels */
  width: number;
  height: number;
  /** Colour and font tokens of the document's theme, so a component fits it */
  theme: Omit<ThemeTokens, 'colors'> & {colors: Record<ThemeColorKey, string>};
  /** Deterministic PRNG factory; same key → same stream */
  random: (key: string) => Random;
  /** Device pixel ratio the output is rendered at */
  pixelRatio: number;
}

export interface TimedInstance<P> {
  /** Called once per mount; awaited before the first captured frame */
  prepare?(ctx: TimedContext<P>): Promise<void> | void;
  /** Draw the state at ctx.time. Synchronous. */
  render(ctx: TimedContext<P>): void;
  dispose?(): void;
}

export interface TimedComponent<P> {
  contract: 'visotalk/timed@1';
  /** Create an instance bound to a host element */
  mount(host: HTMLElement): TimedInstance<P>;
}

/** What a component's tag takes besides the component's own props */
export interface ComponentTagProps {
  id: string;
  label?: string;
  style?: string;
}

/** The component, which is also the type of its tag: `import {Moon} from './moon.ts'` and `<Moon id="view" phase={0}/>` in a document, checked by `tsc` against `P` */
export type ComponentTag<P> = TimedComponent<P> & ((props: P & ComponentTagProps) => null);

/** Declares a component. At run time it is `c` itself; the type is what lets a document use it as a tag. */
export const defineComponent = <P>(c: TimedComponent<P>): ComponentTag<P> => c as ComponentTag<P>;
