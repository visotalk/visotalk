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
