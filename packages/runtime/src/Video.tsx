/**
 * <Video>: one component, two strategies.
 *  - driven (export): an <img> showing the exact pre-extracted source frame; readiness waits for its decode.
 *  - live (player):   a <video> slaved to the clock: native playback while playing, frame-centre seeks otherwise.
 * `start` is the document time at which playback of `use` begins.
 */
import React, {useLayoutEffect, useRef} from 'react';
import {frameCentre, sourceFrame, sourceTime, type VideoUse} from '@visotalk/ir';
import {useDocTime, useRuntime} from './react';

const DRIFT = 0.12;

export const Video: React.FC<{use: VideoUse; start: number; fit?: 'cover' | 'contain' | 'fill'; style?: React.CSSProperties; path?: string}> = ({
  use, start, fit = 'cover', style, path,
}) => {
  const rt = useRuntime();
  const t = useDocTime() - start;
  const asset = rt.media[use.asset];
  if (!asset) throw new Error(`unknown video asset "${use.asset}"`);
  const frame = sourceFrame(t, use, asset);
  const box: React.CSSProperties = {display: 'block', width: '100%', height: '100%', objectFit: fit, ...style};
  const ref = useRef<HTMLImageElement & HTMLVideoElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (rt.clock.mode === 'driven') {
      rt.drawn.set(el, {kind: 'video', asset: use.asset, frame, sourceTime: sourceTime(t, use), sceneTime: t, sceneFrom: start, in: use.in, rate: use.rate});
      return;
    }
    const v = el as HTMLVideoElement;
    if (t >= 0 && rt.clock.isPlaying()) {
      v.playbackRate = use.rate;
      const s = sourceTime(t, use);
      if (v.paused) {
        v.currentTime = s;
        void v.play().catch(() => {});
      } else if (Math.abs(v.currentTime - s) > DRIFT) v.currentTime = s;
    } else {
      if (!v.paused) v.pause();
      const target = frameCentre(frame, asset);
      if (Math.abs(v.currentTime - target) > 1e-4) v.currentTime = target;
    }
  });

  useLayoutEffect(() => {
    const el = ref.current;
    return () => {
      if (el) rt.drawn.delete(el);
    };
  }, [rt]);

  if (rt.clock.mode === 'driven') return <img ref={ref} alt="" data-path={path} src={`${rt.mediaBase}/${use.asset}/${frame}.png`} style={box} />;
  return <video ref={ref} data-path={path} src={asset.src} muted playsInline preload="auto" style={box} />;
};
