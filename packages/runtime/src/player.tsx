/**
 * Web player chrome: fits the fixed stage into its box, play/pause, a scrubber with a tick at every narration clip, sound, full screen, keyboard,
 * narration in sync with the clock. `bare` (`?bare` on the page) draws the picture alone, for a page that has controls of its own.
 * The controls are the brand's, not the video theme's: square, a cue-orange play button and playhead;
 * only the greys come from the theme's `--vt-*` variables.
 */
import React, {useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore} from 'react';
import type {Clock} from './clock';
import {follow} from './media';
import {within} from './readiness';
import {C, F} from './theme';

export interface NarrationClip {
  at: number;
  duration: number;
  src: string;
}

/**
 * One `Audio` per clip, started and stopped from the clock. A clip the clock has entered that cannot play yet holds the clock
 * (`Clock.hold`), and every clip pauses while the clock waits, so nothing runs ahead of the picture. Browsers (iOS Safari above all) let an element play only
 * after it has been started from a tap, so `unlock` — called from a click handler — starts every clip silently once.
 */
function useNarration(clock: Clock, clips: NarrationClip[], base: string, muted: React.MutableRefObject<boolean>) {
  const unlockRef = useRef(() => {});
  useEffect(() => {
    const tracks = clips.map((n) => {
      const el = new Audio(base + n.src);
      el.preload = 'auto';
      return {...n, el, unlocking: false, unlocked: false, held: false};
    });
    const sync = () => {
      const t = clock.getTime();
      for (const tr of tracks) {
        const inside = !muted.current && clock.isPlaying() && t >= tr.at && t < tr.at + tr.duration;
        if (tr.unlocking) continue;
        if (!inside) {
          tr.held = false;
          if (!tr.el.paused) tr.el.pause();
          continue;
        }
        if (follow(clock, tr.el, tr, t - tr.at) && tr.el.paused) void tr.el.play().catch(() => {});
      }
    };
    unlockRef.current = () => {
      for (const tr of tracks) {
        if (tr.unlocked) continue;
        tr.unlocked = tr.unlocking = true;
        tr.el.muted = true;
        const done = () => { tr.el.pause(); tr.el.muted = false; tr.unlocking = false; sync(); };
        tr.el.play().then(done, () => { tr.el.muted = false; tr.unlocking = false; tr.unlocked = false; });
      }
    };
    const off = clock.subscribe(sync);
    return () => {
      off();
      tracks.forEach((tr) => tr.el.pause());
    };
  }, [clock, clips, base, muted]);
  return () => unlockRef.current();
}

const NO_SOUNDS: SoundTrack[] = [];
const NO_GAIN = () => 1;

export interface SoundTrack {
  src: string;
  start: number;
  /** absent for a single play of a file whose length the document does not know */
  end?: number;
  loop: boolean;
}

/**
 * The sounds of the document (music, effects), each an element routed through a gain node (`gain(i, t)` is the document's own curve: volume, fades, ducking), because
 * an element's `volume` does nothing on iOS. They start and stop from the clock like the narration, and stay with it after a seek. `unlock` is called from a tap.
 */
function useSounds(clock: Clock, sounds: SoundTrack[], gain: (i: number, t: number) => number, base: string, muted: React.MutableRefObject<boolean>) {
  const unlockRef = useRef(() => {});
  const gainRef = useRef(gain);
  gainRef.current = gain;
  useEffect(() => {
    const Ctx = typeof window === 'undefined' ? undefined : window.AudioContext ?? (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
    if (!Ctx || !sounds.length) return undefined;
    const ctx = new Ctx();
    const tracks = sounds.map((s) => {
      const el = new Audio(base + s.src);
      el.preload = 'auto';
      el.loop = s.loop;
      const node = ctx.createGain();
      node.gain.value = 0;
      ctx.createMediaElementSource(el).connect(node).connect(ctx.destination);
      return {...s, el, node, starting: false, held: false};
    });
    const sync = () => {
      const t = clock.getTime();
      tracks.forEach((tr, i) => {
        const inside = !muted.current && clock.isPlaying() && t >= tr.start && (tr.end === undefined || t < tr.end);
        if (!inside) {
          tr.held = false;
          if (!tr.el.paused) tr.el.pause();
          tr.node.gain.value = 0;
          return;
        }
        tr.node.gain.value = gainRef.current(i, t);
        const len = tr.el.duration;
        const want = tr.loop && len > 0 ? (t - tr.start) % len : t - tr.start;
        if (follow(clock, tr.el, tr, want, tr.loop ? len : 0) && tr.el.paused && !tr.starting) {
          tr.starting = true;
          void ctx.resume().then(() => tr.el.play()).catch(() => {}).finally(() => { tr.starting = false; });
        }
      });
    };
    unlockRef.current = () => { void ctx.resume().then(sync); };
    const off = clock.subscribe(sync);
    return () => {
      off();
      tracks.forEach((tr) => tr.el.pause());
      void ctx.close();
    };
  }, [clock, sounds, base, muted]);
  return () => unlockRef.current();
}

/** `cue` and `on-cue` (dark) from docs/brand/tokens.json: the play button and the playhead are playback's colour and nothing else's. */
const CUE = '#4aa8f2';
const ON_CUE = '#0d0f14';

const CSS = `
.vt-b{display:flex;align-items:center;justify-content:center;flex:none;width:40px;height:40px;padding:0;border:0;border-radius:0;background:transparent;color:${C.text};cursor:pointer}
.vt-b:hover{background:${C.panel2}}
.vt-b.vt-cue{background:${CUE};color:${ON_CUE}}
.vt-b.vt-cue:hover{background:color-mix(in srgb,${CUE} 88%,white)}
.vt-b:focus-visible,.vt-seek:focus-visible{outline:2px solid ${C.text};outline-offset:2px}
.vt-root:focus{outline:none}
.vt-seek{position:relative;flex:1;min-width:0;height:40px;cursor:pointer;touch-action:none}
.vt-wait{position:absolute;left:50%;top:50%;width:28px;height:28px;margin:-14px 0 0 -14px;border:3px solid ${C.border};border-top-color:${CUE};animation:vt-spin .8s linear infinite;pointer-events:none}
@keyframes vt-spin{to{transform:rotate(360deg)}}
.vt-ic{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:square;stroke-linejoin:miter}
`;

const Glyph: React.FC<{name: 'play' | 'pause' | 'sound' | 'muted' | 'full' | 'exit'}> = ({name}) => (
  <svg className="vt-ic" viewBox="0 0 24 24" aria-hidden="true">
    {name === 'play' && <path d="M7 4.5L19 12L7 19.5Z" fill="currentColor" />}
    {name === 'pause' && <path d="M7 5v14M17 5v14" strokeWidth={3} />}
    {name === 'sound' && <path d="M4 9h4l5-4v14l-5-4H4zM17 8.5a5 5 0 010 7" />}
    {name === 'muted' && <path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6" />}
    {name === 'full' && <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />}
    {name === 'exit' && <path d="M9 4v5H4M15 9h5M15 4v5M20 15h-5v5M4 15h5v5" />}
  </svg>
);

/** 82.53 -> "1:22" */
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const Player: React.FC<{clock: Clock; width: number; height: number; narration: NarrationClip[]; sounds?: SoundTrack[]; gain?: (i: number, t: number) => number; assetBase: string; hint?: string; autoplay?: boolean; loop?: boolean; bare?: boolean; children: React.ReactNode}> = ({
  clock: ck, width, height, narration, sounds = NO_SOUNDS, gain = NO_GAIN, assetBase, hint, autoplay, loop, bare, children,
}) => {
  const t = useSyncExternalStore(ck.subscribe, ck.getTime);
  const playing = useSyncExternalStore(ck.subscribe, ck.isPlaying);
  const buffering = useSyncExternalStore(ck.subscribe, ck.isBuffering);
  // a wait shorter than a blink is not worth a spinner
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    if (!buffering) { setWaiting(false); return undefined; }
    const id = setTimeout(() => setWaiting(true), 250);
    return () => clearTimeout(id);
  }, [buffering]);
  const [scale, setScale] = useState(1);
  const box = useRef<HTMLDivElement>(null);
  const seekBar = useRef<HTMLDivElement>(null);
  // an autoplaying page starts silent (browsers refuse sound before a tap); a tap on Play or Sound turns it on, unless the viewer muted it
  const [muted, setMuted] = useState(!!autoplay);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const viewerMuted = useRef(false);
  // full screen is the player's own box, so the controls come with the picture; a browser that cannot (iPhone Safari) has no button
  const root = useRef<HTMLDivElement>(null);
  const [canFull, setCanFull] = useState(false);
  const [full, setFull] = useState(false);
  useEffect(() => {
    setCanFull(document.fullscreenEnabled);
    const change = () => setFull(document.fullscreenElement === root.current);
    document.addEventListener('fullscreenchange', change);
    return () => document.removeEventListener('fullscreenchange', change);
  }, []);
  const toggleFull = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void root.current?.requestFullscreen().catch(() => {}); };
  const unlockNarration = useNarration(ck, narration, assetBase, mutedRef);
  const unlockSounds = useSounds(ck, sounds, gain, assetBase, mutedRef);
  const unlock = () => { unlockNarration(); unlockSounds(); };
  const setSound = (on: boolean) => { viewerMuted.current = !on; mutedRef.current = !on; setMuted(!on); if (on) unlock(); };
  const toggle = () => { if (playing) ck.pause(); else { if (!viewerMuted.current) setSound(true); ck.play(); } };
  // a page that frames a bare player has the sound button: `{vt: 'sound', on}` from the parent is a press of it (see `bridge.ts`)
  useEffect(() => {
    if (!bare) return undefined;
    const onMessage = (e: MessageEvent) => {
      const m = e.data as {vt?: unknown; on?: unknown} | null;
      if (e.source === window.parent && m && m.vt === 'sound' && typeof m.on === 'boolean') setSound(m.on);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setSound only writes refs and state, and `unlock` forwards to a ref
  }, [bare]);
  useEffect(() => {
    if (autoplay) ck.play();
    if (!loop) return undefined;
    let was = false; // restart only when playback runs out, not when someone pauses or seeks to the end
    return ck.subscribe(() => {
      const now = ck.isPlaying();
      if (was && !now && ck.getTime() >= ck.duration) ck.play();
      was = ck.isPlaying();
    });
  }, [ck, autoplay, loop]);
  useLayoutEffect(() => {
    const el = box.current!;
    const fit = () => setScale(Math.max(0.05, Math.min(el.clientWidth / width, el.clientHeight / height)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height]);

  // an image the picture shows that has not arrived holds the clock, whichever part drew it
  const imagesHeld = useRef(new WeakSet<HTMLImageElement>());
  useLayoutEffect(() => {
    for (const img of box.current!.querySelectorAll('img')) {
      if (img.complete || img.loading === 'lazy' || imagesHeld.current.has(img)) continue;
      imagesHeld.current.add(img);
      ck.hold(within(img.decode(), 5000, img.currentSrc || img.src));
    }
  }, [ck, t]);

  const seekTo = (clientX: number) => {
    const r = seekBar.current!.getBoundingClientRect();
    ck.seek(Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * ck.duration);
  };
  const onKey = (e: React.KeyboardEvent) => {
    // typing in a field of the video, or pressing a button, is not the player's key
    const el = e.target as HTMLElement;
    if (el.closest('input, textarea, select, [contenteditable]') || (el.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter'))) return;
    if (e.key === ' ' || e.key === 'k') toggle();
    else if (e.key === 'ArrowRight') ck.seek(ck.getTime() + 5);
    else if (e.key === 'ArrowLeft') ck.seek(ck.getTime() - 5);
    else if (e.key === 'Home') ck.seek(0);
    else if (e.key === 'End') ck.seek(ck.duration);
    else if (e.key === 'f' && canFull && !bare) toggleFull();
    else if (e.key === 'm' && (narration.length > 0 || sounds.length > 0)) setSound(muted);
    else return;
    e.preventDefault();
  };
  const frac = ck.duration > 0 ? t / ck.duration : 0;
  // the first and the last frame are not a reason to press anything: a big Play says what to do
  const idle = !playing && (t <= 0 || t >= ck.duration);

  return (
    <div ref={root} className="vt-root" tabIndex={0} onKeyDown={onKey} onPointerDown={(e) => (e.currentTarget as HTMLElement).focus({preventScroll: true})}
      style={{height: '100%', minHeight: 320, display: 'flex', flexDirection: 'column', background: '#05070a'}}>
      <style>{CSS}</style>
      <div ref={box} style={{position: 'relative', flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
        <div style={{width: width * scale, height: height * scale}}>
          <div style={{transform: `scale(${scale})`, transformOrigin: '0 0'}}>{children}</div>
        </div>
        {waiting && <div className="vt-wait" role="status" aria-label="Loading" />}
        {idle && !bare && (
          <button id="vt-start" type="button" className="vt-b vt-cue" aria-label="Play" onClick={toggle}
            style={{position: 'absolute', left: '50%', top: '50%', width: 72, height: 72, transform: 'translate(-50%, -50%)'}}>
            <svg viewBox="0 0 24 24" aria-hidden="true" style={{width: 32, height: 32}}><path d="M7 4.5L19 12L7 19.5Z" fill="currentColor" /></svg>
          </button>
        )}
      </div>
      {!bare && hint && <div style={{fontFamily: F.sans, fontSize: 13, color: C.muted, padding: '6px 16px 0'}}>{hint}</div>}
      {!bare && <div style={{height: 56, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px'}}>
        <button id="vt-play" type="button" className="vt-b vt-cue" aria-label={playing ? 'Pause' : 'Play'} onClick={toggle}>
          <Glyph name={playing ? 'pause' : 'play'} />
        </button>
        <div id="vt-seek" ref={seekBar} className="vt-seek" role="slider" tabIndex={0} aria-label="Seek" aria-valuemin={0} aria-valuemax={Math.round(ck.duration)}
          aria-valuenow={Math.round(t)} aria-valuetext={`${clock(t)} of ${clock(ck.duration)}`}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); seekTo(e.clientX); }}
          onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) seekTo(e.clientX); }}>
          <div style={{position: 'absolute', left: 0, right: 0, top: 18, height: 4, background: C.border}}>
            <div style={{width: `${frac * 100}%`, height: 4, background: C.text}} />
            {narration.map((n) => (
              <i key={n.src} style={{position: 'absolute', top: -5, left: `${(n.at / ck.duration) * 100}%`, width: 2, height: 14, background: n.at <= t ? C.text : C.faint}} />
            ))}
          </div>
          <i style={{position: 'absolute', top: 11, left: `calc(${frac * 100}% - 3px)`, width: 6, height: 18, background: CUE}} />
        </div>
        <span style={{fontFamily: F.mono, fontSize: 12, color: C.muted, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums'}}>
          {clock(t)} / {clock(ck.duration)}
        </span>
        {(narration.length > 0 || sounds.length > 0) && (
          <button id="vt-sound" type="button" className="vt-b" aria-label={muted ? 'Sound on' : 'Sound off'} aria-pressed={!muted} onClick={() => setSound(muted)}>
            <Glyph name={muted ? 'muted' : 'sound'} />
          </button>
        )}
        {canFull && (
          <button id="vt-full" type="button" className="vt-b" aria-label={full ? 'Exit full screen' : 'Full screen'} aria-pressed={full} onClick={toggleFull}>
            <Glyph name={full ? 'exit' : 'full'} />
          </button>
        )}
      </div>}
    </div>
  );
};
