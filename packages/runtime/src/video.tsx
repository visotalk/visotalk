/**
 * <Video>: an asset of kind video, played by the scene's clock.
 *  - driven (export): an <img> of the exact source frame, extracted beforehand by the exporter (`mediaBase/<asset>/<frame>.jpg`).
 *  - live (player):   a <video> slaved to the clock: native playback while playing, frame-centre seeks otherwise.
 * The source time is `in + (time - start) * rate`, `time` being seconds since the scene on screen started.
 */
import React, {useLayoutEffect, useRef} from 'react';
import {useRuntime, useTime} from './react';
import {mediaReady} from './media';
import {useStage} from './stage';

const DRIFT = 0.12;

export const Video: React.FC<{asset: string; start?: number; in?: number; rate?: number; fit?: 'cover' | 'contain' | 'fill'; style?: React.CSSProperties}> = ({
  asset, start = 0, in: from = 0, rate = 1, fit = 'cover', style,
}) => {
  const rt = useRuntime();
  const {doc, live, assetUrl} = useStage();
  const info = doc.assets?.find((a) => a.id === asset);
  const fps = info?.analysis?.fps, frames = info?.analysis?.frames;
  if (info?.kind !== 'video' || !fps || !frames) throw new Error(`<Video asset="${asset}">: no video asset with that id in the document (declare it with <Asset kind="video"> and build it with visotalk)`);
  const t = useTime() - start;
  const source = from + Math.max(0, t) * rate;
  const frame = Math.min(frames - 1, Math.max(0, Math.floor(source * fps + 1e-6)));
  const ref = useRef<HTMLVideoElement>(null);

  // a frame moved to is a hold on the clock until the browser has it, and the video plays only while the clock does
  useLayoutEffect(() => {
    const v = ref.current;
    if (!v) return;
    const seekTo = (at: number) => {
      v.currentTime = at;
      rt.clock.hold(mediaReady(v, 2));
    };
    if (t >= 0 && rt.clock.isPlaying() && !rt.clock.isBuffering()) {
      v.playbackRate = rate;
      if (Math.abs(v.currentTime - source) > DRIFT) seekTo(source);
      if (v.paused && !rt.clock.isBuffering()) void v.play().catch(() => {});
    } else {
      if (!v.paused) v.pause();
      const at = (frame + 0.5) / fps;
      if (Math.abs(v.currentTime - at) > 1e-4) seekTo(at);
    }
  });

  const box: React.CSSProperties = {display: 'block', width: '100%', height: '100%', objectFit: fit, ...style};
  if (live) return <video ref={ref} src={assetUrl(asset)} muted playsInline preload="auto" style={box} />;
  const base = new URLSearchParams(location.search).get('media') ?? '/__media';
  return <img alt="" src={`${base}/${asset}/${frame}.jpg`} style={box} />;
};
