/**
 * Mounts an IR document in one of two hosts:
 *   live   (default)       web player: rAF clock, narration, interactions
 *   driven (?mode=driven&fps=N)  exporter: time only via window.__visotalk.seek(frame), params at defaults
 */
import '@fontsource/inter/400.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {DEFAULT_FPS, solve, sourceFrameOf, themeTokens, withCredits, type VisoDoc, type VoiceManifest} from '@visotalk/ir';
import {Clock} from './clock';
import {Readiness} from './readiness';
import {RuntimeProvider, type DrawInfo, type Runtime} from './react';
import {IRProvider, ParamStore} from './ir/context';
import type {TimedComponent} from './timed';
import {IRStage} from './ir/Stage';
import {Player} from './player';
import {inspectFrame, type FrameInspection} from './inspect';
import {C, themeVars} from './theme';

export interface MountOptions {
  doc: VisoDoc;
  voice: VoiceManifest;
  /** element to render into (default #root) */
  root?: HTMLElement;
  /** URL prefix for narration and assets (default "") */
  assetBase?: string;
  /** L2 components by the id of the document's `components` entry (the CLI bundles each module) */
  components?: Record<string, TimedComponent<any>>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export type FrameManifestEntry = DrawInfo & {rect: [number, number, number, number]};

export interface DrivenApi {
  doc: string;
  duration: number;
  width: number;
  height: number;
  narration: Array<{at: number; duration: number; src: string}>;
  fps: number;
  mediaNeeds(): Record<string, {src: string; frames: number[]}>;
  seek(frame: number): Promise<FrameManifestEntry[]>;
  /** Layout measurements of the current frame for QA (see inspect.ts) */
  inspect(): FrameInspection;
}

declare global {
  interface Window {
    __visotalk?: DrivenApi;
    __visotalkPlayer?: {clock: Clock; duration: number; params: ParamStore};
  }
}

const PREMOUNT = 1;

export function mount(opts: MountOptions) {
  const params = new URLSearchParams(location.search);
  const mode = params.get('mode') === 'driven' ? 'driven' : 'live';
  const {voice} = opts;
  const doc = withCredits(opts.doc);
  const assetBase = opts.assetBase ?? '';
  const presetId = params.get('preset') ?? doc.canvas.presets[0].id;
  const preset = doc.canvas.presets.find((p) => p.id === presetId) ?? doc.canvas.presets[0];
  // events sit on the frame grid of the frame rate the page is asked for (the exporter passes it), else the document's
  const fps = Number(params.get('fps')) || doc.exports?.fps || DEFAULT_FPS;
  const compiled = solve(doc, voice, fps);
  const paramStore = new ParamStore(doc.params ?? {});
  const assets = Object.fromEntries((doc.assets ?? []).map((a) => [a.id, a]));

  const runtime: Runtime = {
    clock: new Clock(compiled.duration, mode),
    readiness: new Readiness(),
    width: preset.width,
    height: preset.height,
    pixelRatio: Number(params.get('dpr') ?? 1),
    media: Object.fromEntries((doc.assets ?? []).filter((a) => a.kind === 'video').map((a) => [a.id, {
      src: assetBase + (a.proxy ?? a.src), fps: a.analysis?.fps ?? 30, frames: a.analysis?.frames ?? 1, width: a.analysis?.width ?? 1920, height: a.analysis?.height ?? 1080,
    }])),
    mediaBase: params.get('media') ?? '/__media',
    drawn: new Map(),
  };
  const narration = compiled.scenes.flatMap((s) => s.beats.flatMap((b) => b.lines)).filter((l) => l.audio)
    .map((l) => ({at: l.from, duration: l.duration, src: l.audio!}));

  const stage = (
    <IRProvider doc={doc} c={compiled} params={paramStore} live={mode === 'live'} preset={preset.id} components={opts.components ?? {}}
      assetUrl={(id) => assetBase + (assets[id]?.src ?? id)}>
      <div style={{position: 'relative', width: preset.width, height: preset.height, overflow: 'hidden', background: C.bg}}>
        <IRStage />
      </div>
    </IRProvider>
  );

  // theme tokens → CSS custom properties (components read var(--vt-*))
  for (const [k, v] of Object.entries(themeVars(themeTokens(doc.theme)))) document.documentElement.style.setProperty(k, v);
  const rootEl = opts.root ?? document.getElementById('root')!;
  const root = createRoot(rootEl);
  document.body.style.margin = '0';

  if (mode === 'live') {
    window.__visotalkPlayer = {clock: runtime.clock, duration: compiled.duration, params: paramStore};
    const hint = compiled.interactions.some((i) => i.export === 'ignore' || i.export === 'caption')
      ? 'Values with a dashed underline can be dragged sideways while their part of the explanation is on screen.'
      : undefined;
    root.render(
      <RuntimeProvider runtime={runtime}>
        <Player clock={runtime.clock} width={preset.width} height={preset.height} narration={narration} assetBase={assetBase} hint={hint}
          autoplay={params.has('autoplay')} loop={params.has('loop')}>
          {stage}
        </Player>
      </RuntimeProvider>,
    );
    return {compiled, runtime, params: paramStore};
  }

  // ---------------------------------------------------------------------------------------------- driven
  document.body.style.background = C.bg;
  runtime.readiness.hold(
    Promise.all(['400 16px Inter', '700 16px Inter', '400 16px "JetBrains Mono"', '700 16px "JetBrains Mono"'].map((f) => document.fonts.load(f, 'A–×≈·'))),
  );
  flushSync(() => root.render(<RuntimeProvider runtime={runtime}>{stage}</RuntimeProvider>));

  /**
   * Per-frame paint reset: a layout-tree reattach through `display: flow-root` drops Chrome's
   * history-dependent paint state without restarting CSS animations.
   */
  const reset = params.get('reset') ?? 'flow';
  const invalidateAll = () => {
    if (reset === 'none') return;
    rootEl.style.display = reset === 'display' ? 'none' : 'flow-root';
    void rootEl.offsetHeight;
    rootEl.style.display = '';
  };

  window.__visotalk = {
    doc: doc.meta.id,
    duration: compiled.duration,
    width: preset.width,
    height: preset.height,
    narration,
    fps,
    mediaNeeds: () => sourceFrameOf(doc, compiled, fps, PREMOUNT, (id) => runtime.media[id]),
    /** The page at frame n, a whole number: its time is `n / fps`, the same expression the solver's events come from */
    async seek(frame) {
      if (!Number.isInteger(frame) || frame < 0) throw new Error(`seek needs a whole frame number, got ${frame}`);
      flushSync(() => runtime.clock.seek(frame / fps));
      invalidateAll();
      await runtime.readiness.settle();
      const out: FrameManifestEntry[] = [];
      for (const [el, info] of runtime.drawn) {
        if (!el.checkVisibility({visibilityProperty: true})) continue;
        const r = el.getBoundingClientRect();
        out.push({...info, rect: [r.x, r.y, r.width, r.height]});
      }
      return out;
    },
    inspect: () => inspectFrame(rootEl, {width: preset.width, height: preset.height}),
  };
  return {compiled, runtime, params: paramStore};
}
