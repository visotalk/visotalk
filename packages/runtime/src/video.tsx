/**
 * <Video>: an asset of kind video, played by the scene's clock.
 *  - driven (export): an <img> of the exact source frame, extracted beforehand by the exporter (`mediaBase/<asset>/<frame>.jpg`).
 *  - live (player):   a <video> slaved to the clock: native playback while playing, frame-centre seeks otherwise. The element is the media scheduler's, made ahead of the
 *                     clip's time and mounted here; a second <Video> of the same clip at the same time makes its own.
 * The source time is `in + (time - start) * rate`, `time` being seconds since the scene on screen started.
 */
import React, {useLayoutEffect, useMemo, useRef, useSyncExternalStore} from 'react';
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
  // pausing does not change the time: without this the component would not draw again, and the video would play on without the clock
  const playing = useSyncExternalStore(rt.clock.subscribe, rt.clock.isPlaying);
  const source = from + Math.max(0, t) * rate;
  const frame = Math.min(frames - 1, Math.max(0, Math.floor(source * fps + 1e-6)));
  const url = assetUrl(asset);
  // the scheduler's element for the clip, else (the export, or the clip is on screen twice) one of this component's own
  const video = useMemo(() => {
    if (!live) return null;
    const v = rt.media?.takeVideo(url);
    if (v) return {el: v, shared: true};
    const own = document.createElement('video');
    own.preload = 'auto';
    own.muted = true;
    own.playsInline = true;
    own.src = url;
    return {el: own, shared: false};
  }, [live, rt.media, url]);
  const box: React.CSSProperties = {display: 'block', width: '100%', height: '100%', objectFit: fit, ...style};
  const holder = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!video || !holder.current) return undefined;
    const box = holder.current;
    box.appendChild(video.el);
    return () => {
      if (video.el.parentNode === box) box.removeChild(video.el);
      if (video.shared) rt.media?.returnVideo(url);
    };
  }, [video, rt.media, url]);

  // a frame moved to is a hold on the clock until the browser has it, and the video plays only while the clock does
  useLayoutEffect(() => {
    const v = video?.el;
    if (!v) return;
    Object.assign(v.style, box);
    const seekTo = (at: number) => {
      v.currentTime = at;
      rt.clock.hold(mediaReady(v, 2));
    };
    if (t >= 0 && playing && !rt.clock.isBuffering()) {
      v.playbackRate = rate;
      if (Math.abs(v.currentTime - source) > DRIFT) seekTo(source);
      if (v.paused && !rt.clock.isBuffering()) void v.play().catch(() => {});
    } else {
      if (!v.paused) v.pause();
      const at = (frame + 0.5) / fps;
      if (Math.abs(v.currentTime - at) > 1e-4) seekTo(at);
    }
  });

  if (video) return <div ref={holder} style={{width: '100%', height: '100%'}} />;
  const base = new URLSearchParams(location.search).get('media') ?? '/__media';
  return <img alt="" src={`${base}/${asset}/${frame}.jpg`} style={box} />;
};
