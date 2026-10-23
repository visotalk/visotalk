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
import {writeFile} from 'node:fs/promises';
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
  /** device pixels per canvas pixel: 2 renders a 1920 x 1080 canvas as 3840 x 2160, laid out as at 1 (a part's canvas reads it as `devicePixelRatio`) */
  scale?: number;
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

/** 754.2 s → "12:34", 3725 s → "1:02:05" */
const clock = (s: number) => {
  const t = Math.max(0, Math.round(s)), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = String(t % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

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
  if (o.scale !== undefined && !(o.scale > 0 && o.scale <= 4)) throw new Error(`scale must be a number above 0 and at most 4, not ${o.scale}`);
  if (o.saveFrames) mkdirSync(join(out, 'frames'), {recursive: true});
  const mediaCache = resolve(o.dist, '..', '.media-cache');
  await extractMedia(resolve(o.dist), mediaCache);
  const player = await servePlayer(o.dist, 0, mediaCache);
  const query = new URLSearchParams({mode: 'driven', fps: String(fps), media: '/__media', reset: o.reset ?? 'flow', ...(o.preset ? {preset: o.preset} : {}), ...(o.theme ? {theme: o.theme} : {})});
  const url = `${player.url}?${query}`;
  let frameTmp: string | undefined;
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
    const ext = format === 'jpeg' ? 'jpg' : 'png';
    const frameDir = (frameTmp = o.saveFrames ? undefined : mkdtempSync(join(out, '.frames-'))) ?? join(out, 'frames');
    const inspections: Record<number, unknown> = {};
    let seekMs = 0, captureMs = 0;
    const t0 = performance.now();
    // progress across every browser at once, at most every five seconds (and at the last frame): done, rate, and the time left at that rate
    let done = 0, shown = t0;
    const progress = () => {
      done++;
      const now = performance.now();
      if (now - shown < 5000 && done < order.length) return;
      shown = now;
      const rate = done / ((now - t0) / 1000), left = (order.length - done) / rate;
      log(`frames ${done}/${order.length} (${Math.floor((100 * done) / order.length)}%) · ${rate.toFixed(1)} fps · ${done < order.length ? `${clock(left)} left` : `${clock((now - t0) / 1000)} in all`}`);
    };
    await Promise.all(chunks.map(async (chunk) => {
      const browser = await launch(chrome, [], o.scale);
      try {
        const d = await openDrivenPage(browser, url, meta.width, meta.height, fps, o.scale);
        for (const i of chunk) {
          const a = performance.now();
          await d.page.evaluate(`window.__visotalk.seek(${i})`);
          if (o.inspect) inspections[i] = await d.page.evaluate('window.__visotalk.inspect()');
          const b = performance.now();
          const img = (await d.frame(format === 'jpeg' ? {format: 'jpeg', quality: 95} : {format: 'png'}))!;
          seekMs += b - a;
          captureMs += performance.now() - b;
          hashes[i] = createHash('sha256').update(img).digest('hex').slice(0, 16);
          // frames go to disk, never into memory: a 4K film is tens of gigabytes of them (beside the output, not in a /tmp that may be RAM)
          if (o.encode || o.saveFrames) await writeFile(join(frameDir, `${String(i).padStart(5, '0')}.${ext}`), img);
          o.onFrame?.(i, img);
          progress();
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
      log(`encoding ${to - from} frames`);
      await encode(frameDir, ext, from, to - from, join(out, 'video.mp4'), fps);
      if (o.audio !== false && (meta.narration.length || meta.sounds.length)) {
        log('mixing the soundtrack');
        await muxAudio(join(out, 'video.mp4'), join(out, 'final.mp4'), from / fps, (to - from) / fps, meta, resolve(o.dist));
      }
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
    if (frameTmp) rmSync(frameTmp, {recursive: true, force: true});
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

async function encode(dir: string, ext: string, from: number, count: number, out: string, fps: number) {
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-start_number', String(from), '-i', join(dir, `%05d.${ext}`), '-frames:v', String(count),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
}

const SR = 48000;
/** What ffmpeg writes to its stdout, whole (a decoded file, a mixed bus) */
function capture(args: string[]): Promise<Buffer> {
  return new Promise((ok, fail) => {
    const p = spawn('ffmpeg', ['-y', '-loglevel', 'error', ...args, '-f', 'f32le', '-ar', String(SR), '-ac', '2', 'pipe:1'], {stdio: ['ignore', 'pipe', 'pipe']});
    const out: Buffer[] = [];
    let err = '';
    p.stdout!.on('data', (d: Buffer) => out.push(d));
    p.stderr!.on('data', (d) => (err += d));
    p.on('close', (code) => (code === 0 ? ok(Buffer.concat(out)) : fail(new Error(`ffmpeg exited ${code}: ${err.slice(-2000)}`))));
  });
}
const samples = (b: Buffer) => new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);

/**
 * The soundtrack of a video that starts `offset` seconds into the film and runs `length` seconds. The narration clips each at their start, mixed and loudness-normalised
 * to −16 LUFS, as they are; then each sound of the document: its file (looped if it loops) set at its start, multiplied by its gain envelope (volume, fades, ducking: the
 * curve the player uses), and added to the narration without changing it. With a `video` it is muxed into a copy of it; without one it is written alone as an MP3 (the
 * one track a built player plays, so the page sounds as the video does).
 *
 * The narration goes through ffmpeg (it needs loudnorm); the sounds are summed here: each file is decoded once, to 48 kHz stereo, and each play of it touches only the
 * samples where it sounds. Doing that in an ffmpeg graph meant padding every sound and its envelope to the whole film, which cost as many film lengths as there were sounds
 * (a five-minute film with 150 sounds took fifteen minutes to mix).
 */
export async function muxAudio(video: string | undefined, out: string, offset: number, length: number, meta: Pick<Meta, 'narration' | 'sounds' | 'envelopes'>, root: string) {
  const lines = meta.narration.map((l) => ({at: l.at - offset, src: join(root, l.src)})).filter((l) => l.at >= 0);
  const n = Math.round(length * SR), mix = new Float32Array(n * 2);
  if (lines.length) {
    const graph = [...lines.map((l, k) => `[${k}:a]adelay=${Math.round(l.at * 1000)}:all=1[a${k}]`),
      `${lines.map((_, k) => `[a${k}]`).join('')}amix=inputs=${lines.length}:normalize=0,aformat=channel_layouts=mono,pan=stereo|c0=c0|c1=c0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=${SR},apad=whole_dur=${length.toFixed(3)},atrim=0:${length.toFixed(3)}[nar]`]; // loudnorm returns 192 kHz, so it is resampled back; FFmpeg 5 leaves the mix's channel layout unspecified, which pan refuses, so it is named; loudnorm measures the stereo pair, since a mono level copied to two channels reads 3 LU louder; the pad keeps the track as long as the picture, whose last scene holds after the last word
    const nar = samples(await capture([...lines.flatMap((l) => ['-i', l.src]), '-filter_complex', graph.join(';'), '-map', '[nar]']));
    for (let i = 0; i < Math.min(nar.length, mix.length); i++) mix[i] += nar[i];
  }
  const decoded = new Map<string, Float32Array>();
  for (const [k, s] of meta.sounds.entries()) {
    const src = join(root, s.src);
    if (!decoded.has(src)) decoded.set(src, samples(await capture(['-i', src, '-af', `aresample=${SR},aformat=sample_fmts=flt:sample_rates=${SR}:channel_layouts=stereo`])));
    const pcm = decoded.get(src)!, frames = pcm.length / 2, env = meta.envelopes[k];
    if (!frames) continue;
    // a sound that began before this piece is joined part-way in
    const i0 = Math.round((s.at - offset) * SR), from = Math.max(0, i0), to = s.loop ? n : Math.min(n, i0 + frames);
    for (let i = from; i < to; i++) {
      const pos = (offset + i / SR) * ENV_HZ, e = Math.floor(pos), f = pos - e;
      const gain = (env[e] ?? 0) * (1 - f) + (env[e + 1] ?? 0) * f; // the 200 Hz envelope, drawn straight between its points
      if (gain === 0) continue;
      const j = 2 * (s.loop ? (i - i0) % frames : i - i0);
      mix[2 * i] += pcm[j] * gain;
      mix[2 * i + 1] += pcm[j + 1] * gain;
    }
  }
  const tmp = mkdtempSync(join(tmpdir(), 'visotalk-mix-'));
  try {
    const raw = join(tmp, 'mix.f32');
    writeFileSync(raw, Buffer.from(mix.buffer));
    const input = ['-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', raw];
    const limit = `alimiter=limit=0.95,atrim=0:${length.toFixed(3)}`;
    const encode = video
      ? ['-i', video, ...input, '-filter_complex', `[1:a]${limit}[aout]`, '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k']
      : [...input, '-af', limit, '-c:a', 'libmp3lame', '-b:a', '96k'];
    await run('ffmpeg', ['-y', '-loglevel', 'error', ...encode, '-ar', String(SR), out]);
  } finally {
    rmSync(tmp, {recursive: true, force: true});
  }
}
