/** Web player chrome: fits the fixed stage into its box, play/pause, scrubber, narration in sync with the clock. */
import React, {useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore} from 'react';
import type {Clock} from './clock';
import {C, F} from './theme';

export interface NarrationClip {
  at: number;
  duration: number;
  src: string;
}

function useNarration(clock: Clock, clips: NarrationClip[], base: string) {
  useEffect(() => {
    const tracks = clips.map((n) => ({...n, el: new Audio(base + n.src)}));
    const sync = () => {
      const t = clock.getTime();
      for (const tr of tracks) {
        const inside = clock.isPlaying() && t >= tr.at && t < tr.at + tr.duration;
        if (inside && tr.el.paused) {
          tr.el.currentTime = t - tr.at;
          void tr.el.play().catch(() => {});
        } else if (!inside && !tr.el.paused) tr.el.pause();
      }
    };
    const off = clock.subscribe(sync);
    return () => {
      off();
      tracks.forEach((tr) => tr.el.pause());
    };
  }, [clock, clips, base]);
}

export const Player: React.FC<{clock: Clock; width: number; height: number; narration: NarrationClip[]; assetBase: string; hint?: string; children: React.ReactNode}> = ({
  clock, width, height, narration, assetBase, hint, children,
}) => {
  const t = useSyncExternalStore(clock.subscribe, clock.getTime);
  const playing = useSyncExternalStore(clock.subscribe, clock.isPlaying);
  const [scale, setScale] = useState(1);
  const box = useRef<HTMLDivElement>(null);
  useNarration(clock, narration, assetBase);
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
        <button id="vt-play" style={btn} onClick={() => (playing ? clock.pause() : clock.play())}>{playing ? 'Pause' : 'Play'}</button>
        <input id="vt-seek" type="range" min={0} max={clock.duration} step={0.001} value={t} style={{flex: 1, minWidth: 0}}
          onChange={(e) => clock.seek(Number(e.target.value))} aria-label="Seek" />
        <span style={{fontFamily: F.mono, fontSize: 14, color: C.muted, width: 120, textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>
          {t.toFixed(2)} / {clock.duration.toFixed(2)}
        </span>
      </div>
    </div>
  );
};
