/**
 * renderBuilt(): deterministic export of a built player (dist/ with index.html).
 *
 * 1. Probe the page: duration, narration.
 * 2. Per frame: window.__visotalk.seek(n) (commit + paint reset + readiness) → beginFrame screenshot.
 *    Contiguous chunks render in parallel browsers; any order gives identical frames.
 * 3. Encode (H.264) and mix narration (−16 LUFS).
 */
import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {findChrome, launch, openDrivenPage, PINNED_CHROME, withChromeLock} from './chrome.ts';
import {extractMedia} from './extract.ts';
import {servePlayer} from './server.ts';

export interface RenderOptions {
  dist: string;
  out: string;
  fps?: number;
  from?: number;
  to?: number;
  /** explicit frame list (overrides from/to; e.g. regression samples) */
  frames?: number[];
  order?: 'seq' | 'random';
  concurrency?: number;
  format?: 'png' | 'jpeg';
  encode?: boolean;
  audio?: boolean;
  saveFrames?: boolean;
  chrome?: string;
  /** canvas preset id */
  preset?: string;
  /** a built-in theme drawn in place of the document's own (a variant's `theme`) */
  theme?: string;
  /** per-frame paint reset (default flow) */
  reset?: 'flow' | 'display' | 'none';
  /** also measure each frame's layout for QA (window.__visotalk.inspect) */
  inspect?: boolean;
  /** called for every captured frame */
  onFrame?: (i: number, img: Buffer) => void;
  log?: (s: string) => void;
}

export interface RenderReport {
  doc: string;
  chrome: string;
  fps: number;
  frames: number;
  range: [number, number];
  order: string;
  concurrency: number;
  timings: {wallMs: number; seekMsPerFrame: number; captureMsPerFrame: number; fps: number; encodeMs: number};
  hashes: string[];
  /** per frame index, when `inspect` is set */
  inspections?: Record<number, unknown>;
}

interface Meta {
  doc: string;
  duration: number;
  width: number;
  height: number;
  narration: Array<{at: number; duration: number; src: string}>;
  sounds: Array<{src: string; at: number; end?: number; loop: boolean}>;
  /** per sound, its gain from 0 s at `ENV_HZ` samples a second (see `soundGain`) */
  envelopes: number[][];
}

/** Samples a second of the gain envelope a sound's file is multiplied by: fades and the duck are no faster than 0.1 s */
export const ENV_HZ = 200;

function shuffled<T>(xs: T[], seed = 7): T[] {
  const a = [...xs];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Renders (or probes, or inspects) frames of a built player; one run at a time drives Chrome on a machine (`withChromeLock`) */
export const renderBuilt = (o: RenderOptions): Promise<RenderReport> => withChromeLock(() => renderUnlocked(o));

async function renderUnlocked(o: RenderOptions): Promise<RenderReport> {
  const fps = o.fps ?? 30;
  const format = o.format ?? 'png';
  const log = o.log ?? (() => {});
  const chrome = findChrome(o.chrome);
  const out = resolve(o.out);
  mkdirSync(out, {recursive: true});
  if (o.saveFrames) mkdirSync(join(out, 'frames'), {recursive: true});
  const mediaCache = resolve(o.dist, '..', '.media-cache');
  await extractMedia(resolve(o.dist), mediaCache);
  const player = await servePlayer(o.dist, 0, mediaCache);
  const query = new URLSearchParams({mode: 'driven', fps: String(fps), media: '/__media', reset: o.reset ?? 'flow', ...(o.preset ? {preset: o.preset} : {}), ...(o.theme ? {theme: o.theme} : {})});
  const url = `${player.url}?${query}`;
  try {
    // 1. probe
    const probeBrowser = await launch(chrome);
    let meta: Meta;
    let version: string;
    try {
      version = await probeBrowser.version();
      if (!version.endsWith(`/${PINNED_CHROME}`)) console.error(`warning: ${version} is not the pinned ${PINNED_CHROME}; pixels, and the goldens, can differ from other machines`);
      const p = await probeBrowser.newPage();
      await p.goto(url, {waitUntil: 'domcontentloaded'});
      await p.waitForFunction('!!window.__visotalk');
      meta = (await p.evaluate(`({doc: window.__visotalk.doc, duration: window.__visotalk.duration, width: window.__visotalk.width,
        height: window.__visotalk.height, narration: window.__visotalk.narration, sounds: window.__visotalk.sounds, envelopes: []})`)) as Meta;
      const count = Math.ceil(meta.duration * ENV_HZ);
      meta.envelopes = (await p.evaluate(`window.__visotalk.sounds.map((_, i) => window.__visotalk.soundGain(i, 0, ${ENV_HZ}, ${count}))`)) as number[][];
    } finally {
      await probeBrowser.close();
    }
    // 2. capture
    const total = Math.round(meta.duration * fps);
    const from = o.from ?? 0;
    const to = Math.min(total, o.to ?? total);
    const indices = o.frames ? o.frames.filter((i) => i >= 0 && i < total) : Array.from({length: to - from}, (_, i) => from + i);
    const order = o.order === 'random' ? shuffled(indices) : indices;
    const conc = Math.max(1, o.concurrency ?? 1);
    const size = Math.ceil(order.length / conc);
    const chunks = Array.from({length: conc}, (_, c) => order.slice(c * size, (c + 1) * size)).filter((c) => c.length);
    const hashes: string[] = new Array(total).fill('');
    const frames: Buffer[] = new Array(total);
    const inspections: Record<number, unknown> = {};
    let seekMs = 0, captureMs = 0;
    const t0 = performance.now();
    await Promise.all(chunks.map(async (chunk) => {
      const browser = await launch(chrome);
      try {
        const d = await openDrivenPage(browser, url, meta.width, meta.height, fps);
        for (const [k, i] of chunk.entries()) {
          const a = performance.now();
          await d.page.evaluate(`window.__visotalk.seek(${i})`);
          if (o.inspect) inspections[i] = await d.page.evaluate('window.__visotalk.inspect()');
          const b = performance.now();
          const img = (await d.frame(format === 'jpeg' ? {format: 'jpeg', quality: 95} : {format: 'png'}))!;
          seekMs += b - a;
          captureMs += performance.now() - b;
          hashes[i] = createHash('sha256').update(img).digest('hex').slice(0, 16);
          if (o.encode) frames[i] = img;
          if (o.saveFrames) writeFileSync(join(out, 'frames', `${String(i).padStart(5, '0')}.${format === 'jpeg' ? 'jpg' : 'png'}`), img);
          o.onFrame?.(i, img);
          if (k % 150 === 0) log(`frame ${i} (${k + 1}/${chunk.length})`);
        }
      } finally {
        await browser.close();
      }
    }));
    const wall = performance.now() - t0;
    // 3. encode
    let encodeMs = 0;
    if (o.encode) {
      const e0 = performance.now();
      await encode(frames.slice(from, to), join(out, 'video.mp4'), fps, format);
      if (o.audio !== false && (meta.narration.length || meta.sounds.length)) await muxAudio(join(out, 'video.mp4'), join(out, 'final.mp4'), from / fps, (to - from) / fps, meta, resolve(o.dist));
      encodeMs = performance.now() - e0;
    }
    const n = order.length;
    const report: RenderReport = {
      doc: meta.doc, chrome: version, fps, frames: n, range: [from, to], order: o.order ?? 'seq', concurrency: chunks.length,
      timings: {wallMs: Math.round(wall), seekMsPerFrame: +(seekMs / n).toFixed(1), captureMsPerFrame: +(captureMs / n).toFixed(1), fps: +(n / (wall / 1000)).toFixed(2), encodeMs: Math.round(encodeMs)},
      hashes, ...(o.inspect ? {inspections} : {}),
    };
    writeFileSync(join(out, 'report.json'), JSON.stringify({...report, inspections: undefined}, null, 1));
    return report;
  } finally {
    player.close();
  }
}

function run(cmd: string, args: string[], input?: (stdin: NodeJS.WritableStream) => Promise<void>): Promise<void> {
  return new Promise((ok, fail) => {
    const p = spawn(cmd, args, {stdio: [input ? 'pipe' : 'ignore', 'ignore', 'pipe']});
    let err = '';
    p.stderr!.on('data', (d) => (err += d));
    p.on('close', (code) => (code === 0 ? ok() : fail(new Error(`${cmd} exited ${code}: ${err.slice(-2000)}`))));
    if (input) input(p.stdin!).then(() => p.stdin!.end(), fail);
  });
}

async function encode(frames: Buffer[], out: string, fps: number, format: string) {
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', format === 'jpeg' ? 'mjpeg' : 'png', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
  async (stdin) => {
    for (const f of frames) if (!stdin.write(f)) await new Promise((r) => stdin.once('drain', r));
  });
}

/**
 * The soundtrack of a video that starts `offset` seconds into the film and runs `length` seconds. The narration clips each at their start, mixed and loudness-normalised
 * to −16 LUFS, as they are; then each sound of the document: its file (looped if it loops) set at its start, multiplied by its gain envelope (volume, fades, ducking: the
 * curve the player uses), and added to the narration without changing it. With a `video` it is muxed into a copy of it; without one it is written alone as an MP3 (the
 * one track a built player plays, so the page sounds as the video does).
 */
export async function muxAudio(video: string | undefined, out: string, offset: number, length: number, meta: Pick<Meta, 'narration' | 'sounds' | 'envelopes'>, root: string) {
  const lines = meta.narration.map((l) => ({at: l.at - offset, src: join(root, l.src)})).filter((l) => l.at >= 0);
  const first = video ? 1 : 0; // the input index of the first clip
  const tmp = mkdtempSync(join(tmpdir(), 'visotalk-env-'));
  try {
    const args = ['-y', '-loglevel', 'error', ...(video ? ['-i', video] : [])];
    for (const l of lines) args.push('-i', l.src);
    for (const s of meta.sounds) args.push(...(s.loop ? ['-stream_loop', '-1'] : []), '-i', join(root, s.src));
    meta.sounds.forEach((_, k) => {
      const slice = Float32Array.from(meta.envelopes[k].slice(Math.round(offset * ENV_HZ), Math.round((offset + length) * ENV_HZ)));
      const file = join(tmp, `env${k}.raw`);
      writeFileSync(file, Buffer.from(slice.buffer));
      args.push('-f', 'f32le', '-ar', String(ENV_HZ), '-ac', '1', '-i', file);
    });
    const graph: string[] = [];
    const mixed: string[] = [];
    if (lines.length) {
      graph.push(...lines.map((l, k) => `[${k + first}:a]adelay=${Math.round(l.at * 1000)}:all=1[a${k}]`));
      graph.push(`${lines.map((_, k) => `[a${k}]`).join('')}amix=inputs=${lines.length}:normalize=0,aformat=channel_layouts=mono,pan=stereo|c0=c0|c1=c0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,apad=whole_dur=${length.toFixed(3)}[nar]`); // loudnorm returns 192 kHz, which amix cannot join to 48 kHz inputs without dropping the narration; FFmpeg 5 leaves the mix's channel layout unspecified, which pan refuses, so it is named; loudnorm measures the stereo pair, since a mono level copied to two channels reads 3 LU louder; the pad keeps the track as long as the picture, whose last scene holds after the last word
      mixed.push('[nar]');
    }
    const FMT = 'aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo';
    meta.sounds.forEach((s, k) => {
      const file = first + lines.length + k, env = first + lines.length + meta.sounds.length + k;
      const at = s.at - offset;
      // a sound that began before this piece is joined part-way in (a looped file keeps its place only to the second; a piece of a long film starts on a cut anyway)
      const place = at >= 0 ? `adelay=${Math.round(at * 1000)}:all=1` : `atrim=start=${(-at).toFixed(3)},asetpts=PTS-STARTPTS`;
      graph.push(`[${file}:a]aresample=48000,${FMT},${place},apad=whole_dur=${length.toFixed(3)},atrim=0:${length.toFixed(3)}[s${k}]`);
      graph.push(`[${env}:a]aresample=48000,pan=stereo|c0=c0|c1=c0,${FMT},apad=whole_dur=${length.toFixed(3)},atrim=0:${length.toFixed(3)}[e${k}]`);
      graph.push(`[s${k}][e${k}]amultiply[m${k}]`);
      mixed.push(`[m${k}]`);
    });
    graph.push(`${mixed.join('')}amix=inputs=${mixed.length}:normalize=0:duration=longest,alimiter=limit=0.95,atrim=0:${length.toFixed(3)}[aout]`);
    const encode = video ? ['-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k'] : ['-map', '[aout]', '-c:a', 'libmp3lame', '-b:a', '96k'];
    await run('ffmpeg', [...args, '-filter_complex', graph.join(';'), ...encode, '-ar', '48000', out]);
  } finally {
    rmSync(tmp, {recursive: true, force: true});
  }
}
