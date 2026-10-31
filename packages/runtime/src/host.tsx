/**
 * Mounts an IR document in one of two hosts:
 *   live   (default)       web player: rAF clock, narration
 *   driven (?mode=driven&fps=N)  exporter: time only via window.__visotalk.seek(frame)
 * The document's module supplies the children of its parts; the IR (parsed from the same file) supplies everything else.
 */
import '@fontsource/inter/400.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {DEFAULT_FPS, keepClearAt, solve, soundGain, themeTokens, type VisoDoc, type VoiceManifest} from '@visotalk/ir';
import {Clock} from './clock';
import {Readiness} from './readiness';
import {MediaScheduler} from './media';
import {RuntimeProvider, type Runtime} from './react';
import {partBodies} from './bodies';
import {Stage, Solo, StageProvider} from './stage';
import {Player} from './player';
import {installParentBridge} from './bridge';
import {textAt, textFit} from './text-at';
import {inspectFrame, type FrameInspection} from './inspect';
import {C, themeVars} from './theme';

export interface MountOptions {
  doc: VisoDoc;
  voice: VoiceManifest;
  /** the document's own module: its default export is `<Doc …>`, the source of the parts' children */
  module: {default: React.ReactElement};
  /** element to render into (default #root) */
  root?: HTMLElement;
  /** URL prefix for narration and assets (default "") */
  assetBase?: string;
  /** the film's whole soundtrack as one file (relative to `assetBase`), built with it: played in place of the narration clips and the sounds, and the clock keeps to it */
  mix?: string;
}

export interface DrivenApi {
  doc: string;
  duration: number;
  width: number;
  height: number;
  narration: Array<{at: number; duration: number; src: string}>;
  /** each sound of the document: its file (relative to the page), where it sounds, and whether it loops */
  sounds: Array<{src: string; at: number; end?: number; loop: boolean}>;
  /** the gain of sound `i` at `n` samples a second from `from` (seconds) for `count` samples: the envelope the exporter multiplies the file by */
  soundGain(i: number, from: number, hz: number, count: number): number[];
  fps: number;
  seek(frame: number): Promise<void>;
  /** Layout measurements of the current frame for QA (see inspect.ts) */
  inspect(): FrameInspection;
}

declare global {
  interface Window {
    __visotalk?: DrivenApi;
    __visotalkPlayer?: {clock: Clock; duration: number};
  }
}

/** The ids of every part a document declares, in a scene or in `<Doc>`. */
const partIds = (doc: VisoDoc): Set<string> => new Set([...(doc.parts ?? []).map((p) => p.id), ...doc.scenes.flatMap((s) => (s.parts ?? []).map((p) => p.id))]);

export function mount(opts: MountOptions) {
  const params = new URLSearchParams(location.search);
  const mode = params.get('mode') === 'driven' ? 'driven' : 'live';
  const assetBase = opts.assetBase ?? '';
  const presetId = params.get('preset') ?? opts.doc.canvas.presets[0].id;
  // a variant's theme (`exports.variants[].theme`) stands in for the document's own; its `theme.tokens` still apply
  const themeId = params.get('theme');
  // events sit on the frame grid of the frame rate the page is asked for (the exporter passes it), else the document's
  const fpsOf = (d: VisoDoc) => Number(params.get('fps')) || d.exports?.fps || DEFAULT_FPS;
  const presetOf = (d: VisoDoc) => d.canvas.presets.find((p) => p.id === presetId) ?? d.canvas.presets[0];
  const bodies = partBodies(opts.module.default);
  const solo = new Solo();

  /** Everything the page draws that comes from the document, so a new document can be drawn the same way. */
  const draw = (doc: VisoDoc, voice: VoiceManifest) => {
    const preset = presetOf(doc);
    const fps = fpsOf(doc);
    const compiled = solve(doc, voice, fps);
    const assets = Object.fromEntries((doc.assets ?? []).map((a) => [a.id, a]));
    const theme = themeTokens(themeId ? {...doc.theme, id: themeId} : doc.theme);
    const narration = compiled.recording?[{at:0,duration:compiled.duration,src:compiled.recording.audio}]:compiled.scenes.flatMap((s) => s.lines).filter((l) => l.audio).map((l) => ({at: l.from, duration: l.duration, src: l.audio!}));
    const sounds = compiled.sounds.map((s) => ({...s, src: assets[s.asset]?.src ?? s.asset}));
    const stage = (
      <StageProvider doc={doc} c={compiled} bodies={bodies} theme={theme} preset={preset} live={mode === 'live'} solo={solo} assetUrl={(id) => assetBase + (assets[id]?.src ?? id)}>
        <div style={{position: 'relative', width: preset.width, height: preset.height, overflow: 'hidden', background: params.get('alpha')==='1'?'transparent':C.bg}}>
          <Stage />
        </div>
      </StageProvider>
    );
    return {doc, preset, fps, compiled, theme, narration, sounds, stage};
  };

  let shown = draw(opts.doc, opts.voice);
  const {doc, compiled, preset, fps} = shown;
  const clock = new Clock(compiled.duration, mode);
  const runtime: Runtime = {
    clock,
    readiness: new Readiness(mode === 'live' ? clock : undefined),
    width: preset.width,
    height: preset.height,
    pixelRatio: Number(params.get('dpr') ?? 1),
  };

  // theme tokens → CSS custom properties (parts read var(--vt-*))
  const applyTheme = (theme: ReturnType<typeof themeTokens>) => {
    for (const [k, v] of Object.entries(themeVars(theme))) document.documentElement.style.setProperty(k, v);
  };
  applyTheme(shown.theme);
  const rootEl = opts.root ?? document.getElementById('root')!;
  const root = createRoot(rootEl);
  document.body.style.margin = '0';

  if (mode === 'live') {
    // the built soundtrack is the document it was built with: one handed over later (an edit) plays its clips and sounds one by one again
    const mixed = () => !!opts.mix && shown.doc === opts.doc;
    const media = new MediaScheduler(runtime.clock, assetBase);
    runtime.media = media;
    const render = () => {
      media.set({doc: shown.doc, compiled: shown.compiled, mix: mixed() ? opts.mix : undefined});
      root.render(
        <RuntimeProvider runtime={runtime}>
          <Player clock={runtime.clock} width={shown.preset.width} height={shown.preset.height} poster={shown.doc.meta.poster} media={media} ticks={shown.narration.map((n) => n.at)}
            autoplay={params.has('autoplay')} loop={params.has('loop')} bare={params.has('bare')}>
            {shown.stage}
          </Player>
        </RuntimeProvider>,
      );
    };
    window.__visotalkPlayer = {clock: runtime.clock, duration: compiled.duration};
    /**
     * The parent hands over the document as it has it now (a box moved, a line reworded) and the player draws that, at the same time, without a build.
     * Only what the player already has the code for is taken: the same parts, on the same canvas. Anything else needs a build, and is left alone.
     */
    const take = (nextDoc: unknown, nextVoice: unknown) => {
      try {
        const next = nextDoc as VisoDoc;
        const ids = partIds(next);
        const had = partIds(shown.doc);
        if (ids.size !== had.size || [...ids].some((id) => !had.has(id))) return;
        if (presetOf(next).width !== shown.preset.width || presetOf(next).height !== shown.preset.height) return;
        shown = draw(next, nextVoice as VoiceManifest);
        applyTheme(shown.theme);
        runtime.clock.setDuration(shown.compiled.duration);
        window.__visotalkPlayer = {clock: runtime.clock, duration: shown.compiled.duration};
        render();
      } catch {
        // a document that does not solve is not drawn; the player keeps the one it has
      }
    };
    installParentBridge(runtime.clock, undefined, undefined, take, {at: textAt, fit: textFit}, (part) => solo.set(part !== null && partIds(shown.doc).has(part) ? part : null));
    render();
    return {compiled, runtime};
  }

  // ---------------------------------------------------------------------------------------------- driven
  const {stage, narration, sounds} = shown;
  document.body.style.background = params.get('alpha')==='1'?'transparent':C.bg;
  if(params.get('alpha')==='1')document.documentElement.style.background='transparent';
  runtime.readiness.hold(
    Promise.all(['400 16px Inter', '700 16px Inter', '400 16px "JetBrains Mono"', '700 16px "JetBrains Mono"'].map((f) => document.fonts.load(f, 'A–×≈·'))),
  );
  flushSync(() => root.render(<RuntimeProvider runtime={runtime}>{stage}</RuntimeProvider>));

  /**
   * Per-frame paint reset: a layout-tree reattach through `display: flow-root` drops Chrome's
   * history-dependent paint state.
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
    sounds: sounds.map((s) => ({src: s.src, at: s.start, end: s.end, loop: s.loop})),
    soundGain: (i, from, hz, count) => Array.from({length: count}, (_, k) => soundGain(compiled, compiled.sounds[i], from + k / hz)),
    fps,
    /** The page at frame n, a whole number: its time is `n / fps`, the same expression the solver's events come from */
    async seek(frame) {
      if (!Number.isInteger(frame) || frame < 0) throw new Error(`seek needs a whole frame number, got ${frame}`);
      flushSync(() => runtime.clock.seek(frame / fps));
      invalidateAll();
      await runtime.readiness.settle();
    },
    // the presenter's region on this frame: the scene's own when it says one, else the document's
    inspect: () => {
      const t = runtime.clock.getTime(), sc = shown.compiled.scenes.findIndex((s) => t >= s.from && t < s.end);
      const recording = shown.doc.voice?.voice.startsWith('recording:') && shown.doc.assets?.find((a) => a.id === shown.doc.voice!.voice.slice('recording:'.length));
      return {...inspectFrame(rootEl, {width: preset.width, height: preset.height}), keepClear: keepClearAt(shown.doc, shown.doc.scenes[sc < 0 ? shown.doc.scenes.length - 1 : sc], t), footage: !!recording && recording.kind === 'video'};
    },
  };
  return {compiled, runtime};
}
