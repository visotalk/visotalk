/**
 * Video timing: a video object plays its asset from `range[0]` at `rate`, starting when it becomes
 * present in its scene (entrance action, `visible: true` state, or the scene start). The frame shown at time t is the
 * source frame whose interval contains in + (t − start)·rate; assets are ingested to constant frame rate.
 */
import type {VideoObject, VisoDoc} from './spec.ts';
import type {Compiled} from './timeline.ts';
import {sceneObjectIds} from './patterns.ts';

const EPS = 1e-6;

export interface MediaInfo {
  src: string;
  fps: number;
  frames: number;
}

export interface VideoUse {
  asset: string;
  in: number;
  rate: number;
}

export const videoUse = (o: VideoObject): VideoUse => ({
  asset: o.asset,
  in: o.range?.[0] ?? 0,
  rate: Array.isArray(o.rate) ? (o.rate[0] + o.rate[1]) / 2 : o.rate ?? 1,
});

export const sourceTime = (tLocal: number, use: VideoUse): number => use.in + Math.max(0, tLocal) * use.rate;

export const sourceFrame = (tLocal: number, use: VideoUse, m: {fps: number; frames: number}): number =>
  Math.min(m.frames - 1, Math.max(0, Math.floor(sourceTime(tLocal, use) * m.fps + EPS)));

/** Safe <video> seek target for frame n (centre of its interval) */
export const frameCentre = (n: number, m: {fps: number}): number => (n + 0.5) / m.fps;

/** Absolute time at which a video object starts playing in a scene */
export function videoStart(c: Compiled, objectId: string, scene: {from: number; end: number}): number {
  const end = scene.end;
  const inScene = (t: number) => t >= scene.from && t < end;
  const entrances = c.actions.filter((a) => a.path === objectId && inScene(a.start) && ['appear', 'wipe', 'crossfade', 'stamp'].includes(a.motion));
  if (entrances.length) return Math.min(...entrances.map((a) => a.start));
  const shown = c.states.filter((s) => s.path === objectId && s.visible === true && inScene(s.t));
  if (shown.length) return Math.min(...shown.map((s) => s.t));
  return scene.from;
}

/** Every source frame the exporter must extract for output at `fps` (scenes mount `premount` seconds early) */
export function sourceFrameOf(doc: VisoDoc, c: Compiled, fps: number, premount: number, media: (asset: string) => (MediaInfo & {src: string}) | undefined) {
  const out: Record<string, {src: string; frames: Set<number>}> = {};
  const total = Math.round(c.duration * fps);
  doc.scenes.forEach((scene, si) => {
    const sc = c.scenes[si];
    const ids = sceneObjectIds(scene);
    for (const id of ids) {
      const o = doc.objects[id];
      if (o?.type !== 'video') continue;
      const m = media(o.asset);
      if (!m) continue;
      const use = videoUse(o);
      const start = videoStart(c, id, sc);
      const need = (out[o.asset] ??= {src: m.src, frames: new Set()});
      for (let i = 0; i < total; i++) {
        const t = i / fps;
        if (t >= sc.from - premount && t < sc.end) need.frames.add(sourceFrame(t - start, use, m));
      }
    }
  });
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, {src: v.src, frames: [...v.frames].sort((a, b) => a - b)}]));
}
