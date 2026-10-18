/**
 * Export-side video decoding: every source frame of a video asset as a JPEG named by its index (`<cache>/<asset>/<n>.jpg`), decoded once by
 * ffmpeg in order, so the frame a part shows at output frame i is the exact source frame, whatever order frames are rendered in.
 * What `visotalk build` found about each video is in `<dist>/media.json`: `{asset: {src, fps, frames}}`.
 */
import {spawn} from 'node:child_process';
import {existsSync, mkdirSync, readdirSync, readFileSync, rmSync} from 'node:fs';
import {join} from 'node:path';

export type MediaIndex = Record<string, {src: string; fps: number; frames: number}>;

export const readMedia = (dist: string): MediaIndex => (existsSync(join(dist, 'media.json')) ? JSON.parse(readFileSync(join(dist, 'media.json'), 'utf8')) : {});

/** Decodes the video assets of a built player into `cache`; an asset already decoded (every frame present) is left alone */
export async function extractMedia(dist: string, cache: string): Promise<Record<string, number>> {
  const done: Record<string, number> = {};
  for (const [id, m] of Object.entries(readMedia(dist))) {
    const dir = join(cache, id);
    mkdirSync(dir, {recursive: true});
    if (readdirSync(dir).filter((f) => f.endsWith('.jpg')).length === m.frames) { done[id] = 0; continue; }
    rmSync(dir, {recursive: true, force: true});
    mkdirSync(dir, {recursive: true});
    await new Promise<void>((ok, fail) => {
      const p = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(dist, m.src), '-fps_mode', 'passthrough', '-q:v', '2', '-start_number', '0', join(dir, '%d.jpg')], {stdio: ['ignore', 'ignore', 'pipe']});
      let err = '';
      p.stderr!.on('data', (d) => (err += d));
      p.on('close', (c) => (c === 0 ? ok() : fail(new Error(`ffmpeg ${c} decoding ${m.src}: ${err.slice(-1000)}`))));
    });
    done[id] = m.frames;
  }
  return done;
}
