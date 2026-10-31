/** Contact sheet: frames tiled into one image (ffmpeg `tile`), row-major, `cols` per row, each scaled to `cellW` wide */
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

export function contactSheet(images: Buffer[], out: string, opts: {cols?: number; cellW?: number; ext?: 'png' | 'jpg'} = {}) {
  const cols = opts.cols ?? 3;
  const rows = Math.ceil(images.length / cols);
  const dir = mkdtempSync(join(tmpdir(), 'visotalk-sheet-'));
  try {
    images.forEach((img, i) => writeFileSync(join(dir, `${String(i).padStart(4, '0')}.${opts.ext ?? 'png'}`), img));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', join(dir, `%04d.${opts.ext ?? 'png'}`),
      '-vf', `scale=${opts.cellW ?? 640}:-2,tile=${cols}x${rows}:padding=6:color=0x05070b`, '-frames:v', '1', ...(out.endsWith('.jpg') ? ['-q:v', '4'] : []), out]);
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
}

/** A frame to look at: scaled to `width` (720p by default) and saved as JPEG, about a tenth of the full-size PNG, so a model can look at many without its context filling with pictures */
export function lookImage(img: Buffer, out: string, width = 1280) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-i', '-', '-vf', `scale=${width}:-2`, '-q:v', '4', '-frames:v', '1', out], {input: img});
}

/** A region of the stage, in its own pixels (1920x1080 for a 16:9 canvas), from `--zoom x,y,w,h` */
export interface Region {x: number; y: number; w: number; h: number}

export function parseZoom(s: string): Region {
  const n = s.split(',').map((v) => Number(v.trim()));
  if (n.length !== 4 || n.some((v) => !Number.isInteger(v) || v < 0)) throw new Error(`--zoom is x,y,w,h in stage pixels, four whole numbers (got ${s})`);
  const [x, y, w, h] = n;
  if (w < 40 || h < 40) throw new Error(`--zoom: a region at least 40 x 40 stage pixels (got ${w} x ${h})`);
  return {x, y, w, h};
}

/** That region of a full-size frame, as PNG; a region running past the edge stops at it */
export function cropImage(img: Buffer, r: Region): Buffer {
  return execFileSync('ffmpeg', ['-loglevel', 'error', '-f', 'image2pipe', '-i', '-', '-vf', `crop=min(${r.w}\\,iw-${r.x}):min(${r.h}\\,ih-${r.y}):${r.x}:${r.y}`,
    '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', '-'], {input: img, maxBuffer: 64 << 20});
}
