/**
 * <Video>: an asset of kind video, played by the scene's clock.
 *  - driven (export): an <img> of the exact source frame, extracted beforehand by the exporter (`mediaBase/<asset>/<frame>.jpg`).
 *  - live (player):   a <video> slaved to the clock: native playback while playing, frame-centre seeks otherwise.
 * The source time is `in + (time - start) * rate`, `time` being seconds since the scene on screen started.
 */
import React, {useLayoutEffect, useRef} from 'react';
import {useRuntime, useTime} from './react';
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

  useLayoutEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (t >= 0 && rt.clock.isPlaying()) {
      v.playbackRate = rate;
      if (v.paused) {
        v.currentTime = source;
        void v.play().catch(() => {});
      } else if (Math.abs(v.currentTime - source) > DRIFT) v.currentTime = source;
    } else {
      if (!v.paused) v.pause();
      const at = (frame + 0.5) / fps;
      if (Math.abs(v.currentTime - at) > 1e-4) v.currentTime = at;
    }
  });

  const box: React.CSSProperties = {display: 'block', width: '100%', height: '100%', objectFit: fit, ...style};
  if (live) return <video ref={ref} src={assetUrl(asset)} muted playsInline preload="auto" style={box} />;
  const base = new URLSearchParams(location.search).get('media') ?? '/__media';
  return <img alt="" src={`${base}/${asset}/${frame}.jpg`} style={box} />;
};
