/**
 * <Video>: an asset of kind video, played by the scene's clock.
 *  - driven (export): an <img> of the exact source frame, extracted beforehand by the exporter (`mediaBase/<asset>/<frame>.jpg`).
 *  - live (player):   a <video> slaved to the clock: native playback while playing, frame-centre seeks otherwise. The element is the media scheduler's, made ahead of the
 *                     clip's time and mounted here; a second <Video> of the same clip at the same time makes its own. A clip due with nothing to play yet holds the clock
 *                     once (bounded, as a narration clip's wait is), then plays on.
 * The source time is `in + (time - start) * rate`, `time` being seconds since the scene on screen started; the narration's recording always shows the film's own time.
 */
import React, {useLayoutEffect, useMemo, useRef, useSyncExternalStore} from 'react';
import {useDocTime, useRuntime, useTime} from './react';
import {mediaReady, mediaReadyNow} from './media';
import {useStage} from './stage';

/** How far a playing video may be from the clock before it is moved there, and the clock waits for the frame; nearer than this it is pulled back by its rate */
const DRIFT = 0.6;
/** The most the rate is changed by to pull a video back to the clock: a quarter faster or slower */
const NUDGE = 0.25;

export const Video: React.FC<{asset: string; start?: number; in?: number; rate?: number; fit?: 'cover' | 'contain' | 'fill'; style?: React.CSSProperties}> = ({
  asset, start = 0, in: from = 0, rate = 1, fit = 'cover', style,
}) => {
  const rt = useRuntime();
  const {doc, live, assetUrl} = useStage();
  const info = doc.assets?.find((a) => a.id === asset);
  const fps = info?.analysis?.fps, frames = info?.analysis?.frames;
  if (info?.kind !== 'video' || !fps || !frames) throw new Error(`<Video asset="${asset}">: no video asset with that id in the document (declare it with <Asset kind="video"> and build it with visotalk)`);
  // the narration's recording is the film's clock: wherever it is drawn (under everything, in a corner, in half of a split) it shows the moment being heard
  const recorded = doc.voice?.voice === `recording:${asset}`;
  const filmTime = useDocTime(), sceneTime = useTime();
  const t = recorded ? filmTime : sceneTime - start;
  // pausing does not change the time: without this the component would not draw again, and the video would play on without the clock
  const playing = useSyncExternalStore(rt.clock.subscribe, rt.clock.isPlaying);
  const source = recorded ? Math.max(0, t) : from + Math.max(0, t) * rate;
  const frame = Math.min(frames - 1, Math.max(0, Math.floor(source * fps + 1e-6)));
  // the middle of the last frame: a scene that outlasts its clip holds there, and nothing asks the element for a time it does not have
  const last = (frames - 0.5) / fps;
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
  const waited = useRef(false);
  useLayoutEffect(() => {
    const v = video?.el;
    if (!v) return;
    Object.assign(v.style, box);
    const seekTo = (at: number) => {
      v.currentTime = at;
      rt.clock.hold(mediaReady(v, 2));
    };
    // a clip due on screen with nothing to play yet holds the clock once, as a narration clip does; past the bound it plays on
    if (t < 0 || mediaReadyNow(v)) waited.current = false;
    else if (playing && !rt.clock.isBuffering()) {
      if (!v.paused) v.pause();
      if (!waited.current) {
        waited.current = true;
        const at = Math.min(source, last);
        if (Math.abs(v.currentTime - at) > 1e-4) v.currentTime = at;
        rt.clock.hold(mediaReady(v));
      }
      return;
    }
    if (t >= 0 && playing && !rt.clock.isBuffering() && source >= last) {
      if (!v.paused) v.pause();
      v.playbackRate = rate;
      if (Math.abs(v.currentTime - last) > 0.5 / fps) v.currentTime = last;
    } else if (t >= 0 && playing && !rt.clock.isBuffering()) {
      // a video that has only just started (or a decoder a little behind) is caught up by its rate, so the narration never stops for it
      const behind = source - v.currentTime;
      if (Math.abs(behind) > DRIFT) {
        seekTo(source);
        v.playbackRate = rate;
      } else v.playbackRate = rate * (1 + Math.max(-NUDGE, Math.min(NUDGE, behind)));
      if (v.paused && !rt.clock.isBuffering()) void v.play().catch(() => {});
    } else {
      if (!v.paused) v.pause();
      const at = (frame + 0.5) / fps;
      if (Math.abs(v.currentTime - at) > 1e-4) seekTo(at);
    }
  });

  // the recording drawn by a part (in a window, a circle, half of a split) is the presenter, not something drawn over them: QA reads this mark
  const footage = recorded ? {'data-vt-footage': ''} : {};
  if (video) return <div ref={holder} style={{width: '100%', height: '100%'}} {...footage} />;
  const base = new URLSearchParams(location.search).get('media') ?? '/__media';
  return <img alt="" src={`${base}/${asset}/${frame}.jpg`} style={box} {...footage} />;
};
