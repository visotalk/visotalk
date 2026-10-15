/**
 * Export-side video decoding: extract exactly the source frames a render needs, as PNG files named by frame index.
 * One sequential decode per asset (frame-exact by construction; measured 127–162 fps at 1080p in research 02).
 */
import {spawn} from 'node:child_process';
import {existsSync, mkdirSync, readdirSync, renameSync, rmSync} from 'node:fs';
import {join} from 'node:path';

function ffmpeg(args: string[]): Promise<void> {
  return new Promise((ok, fail) => {
    const p = spawn('ffmpeg', ['-y', '-loglevel', 'error', ...args], {stdio: ['ignore', 'ignore', 'pipe']});
    let err = '';
    p.stderr!.on('data', (d) => (err += d));
    p.on('close', (c) => (c === 0 ? ok() : fail(new Error(`ffmpeg ${c}: ${err.slice(-1500)}`))));
  });
}

/**
 * Ensures `${cacheDir}/${frame}.png` exists for every requested frame.
 * Decodes the contiguous span [min, max] once (trim by frame number, no seeking), keeps what is needed.
 */
export async function extractFrames(src: string, frames: number[], cacheDir: string): Promise<{decoded: number; ms: number}> {
  mkdirSync(cacheDir, {recursive: true});
  const missing = frames.filter((n) => !existsSync(join(cacheDir, `${n}.png`)));
  if (!missing.length) return {decoded: 0, ms: 0};
  const t0 = performance.now();
  const lo = Math.min(...missing), hi = Math.max(...missing);
  const tmp = join(cacheDir, `.tmp-${process.pid}`);
  mkdirSync(tmp, {recursive: true});
  await ffmpeg(['-i', src, '-vf', `trim=start_frame=${lo}:end_frame=${hi + 1},setpts=PTS-STARTPTS`, '-fps_mode', 'passthrough',
    '-start_number', String(lo), join(tmp, '%d.png')]);
  const want = new Set(missing);
  for (const f of readdirSync(tmp)) {
    const n = Number(f.replace('.png', ''));
    if (want.has(n)) renameSync(join(tmp, f), join(cacheDir, f));
  }
  rmSync(tmp, {recursive: true, force: true});
  const still = missing.filter((n) => !existsSync(join(cacheDir, `${n}.png`)));
  if (still.length) throw new Error(`extraction missed ${still.length} frame(s) of ${src}, e.g. ${still.slice(0, 5)}`);
  return {decoded: hi - lo + 1, ms: performance.now() - t0};
}
