/** Web player chrome: fits the fixed stage into its box, play/pause, scrubber, narration in sync with the clock. */
import React, {useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore} from 'react';
import type {Clock} from './clock';
import {C, F} from './theme';

export interface NarrationClip {
  at: number;
  duration: number;
  src: string;
}

/**
 * One `Audio` per clip, started and stopped from the clock. Browsers (iOS Safari above all) let an element play only
 * after it has been started from a tap, so `unlock` — called from a click handler — starts every clip silently once.
 */
function useNarration(clock: Clock, clips: NarrationClip[], base: string, muted: React.MutableRefObject<boolean>) {
  const unlockRef = useRef(() => {});
  useEffect(() => {
    const tracks = clips.map((n) => ({...n, el: new Audio(base + n.src), unlocking: false, unlocked: false}));
    const sync = () => {
      const t = clock.getTime();
      for (const tr of tracks) {
        const inside = !muted.current && clock.isPlaying() && t >= tr.at && t < tr.at + tr.duration;
        if (tr.unlocking) continue;
        if (inside && tr.el.paused) {
          tr.el.currentTime = t - tr.at;
          void tr.el.play().catch(() => {});
        } else if (!inside && !tr.el.paused) tr.el.pause();
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

export const Player: React.FC<{clock: Clock; width: number; height: number; narration: NarrationClip[]; assetBase: string; hint?: string; autoplay?: boolean; loop?: boolean; children: React.ReactNode}> = ({
  clock, width, height, narration, assetBase, hint, autoplay, loop, children,
}) => {
  const t = useSyncExternalStore(clock.subscribe, clock.getTime);
  const playing = useSyncExternalStore(clock.subscribe, clock.isPlaying);
  const [scale, setScale] = useState(1);
  const box = useRef<HTMLDivElement>(null);
  // an autoplaying page starts silent (browsers refuse sound before a tap); a tap on Play or Sound turns it on
  const [muted, setMuted] = useState(!!autoplay);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const unlock = useNarration(clock, narration, assetBase, mutedRef);
  const unmute = () => { mutedRef.current = false; setMuted(false); unlock(); };
  useEffect(() => {
    if (autoplay) clock.play();
    if (!loop) return undefined;
    let was = false; // restart only when playback runs out, not when someone pauses or seeks to the end
    return clock.subscribe(() => {
      const now = clock.isPlaying();
      if (was && !now && clock.getTime() >= clock.duration) clock.play();
      was = clock.isPlaying();
    });
  }, [clock, autoplay, loop]);
  useLayoutEffect(() => {
    const el = box.current!;
    const fit = () => setScale(Math.max(0.05, Math.min(el.clientWidth / width, el.clientHeight / height)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height]);
  const btn: React.CSSProperties = {fontFamily: F.mono, fontSize: 14, color: C.text, background: C.panel, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: '8px 14px', cursor: 'pointer'};
  return (
    <div style={{height: '100%', minHeight: 320, display: 'flex', flexDirection: 'column', background: '#05070a'}}>
      <div ref={box} style={{flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
        <div style={{width: width * scale, height: height * scale}}>
          <div style={{transform: `scale(${scale})`, transformOrigin: '0 0'}}>{children}</div>
        </div>
      </div>
      {hint && <div style={{fontFamily: F.sans, fontSize: 13, color: C.muted, padding: '6px 16px 0'}}>{hint}</div>}
      <div style={{height: 64, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px'}}>
        <button id="vt-play" style={btn} onClick={() => { if (playing) clock.pause(); else { unmute(); clock.play(); } }}>{playing ? 'Pause' : 'Play'}</button>
        {muted && narration.length > 0 && <button style={btn} onClick={unmute}>Sound on</button>}
        <input id="vt-seek" type="range" min={0} max={clock.duration} step={0.001} value={t} style={{flex: 1, minWidth: 0}}
          onChange={(e) => clock.seek(Number(e.target.value))} aria-label="Seek" />
        <span style={{fontFamily: F.mono, fontSize: 14, color: C.muted, width: 120, textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>
          {t.toFixed(2)} / {clock.duration.toFixed(2)}
        </span>
      </div>
    </div>
  );
};
