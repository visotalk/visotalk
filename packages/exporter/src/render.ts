/**
 * renderBuilt(): deterministic export of a built player (dist/ with index.html).
 *
 * 1. Probe the page: duration, narration.
 * 2. Per frame: window.__visotalk.seek(n) (commit + paint reset + readiness) → beginFrame screenshot.
 *    Browsers take the frames interleaved; any order gives identical frames. An encoded render streams each frame to ffmpeg as it is drawn, in order.
 * 3. Finish the video (H.264) and mix narration (−16 LUFS).
 */
import {createHash} from 'node:crypto';
import {closeSync, existsSync, fstatSync, openSync, readSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import {availableParallelism, tmpdir, totalmem} from 'node:os';
import {dirname, join, relative, resolve, sep} from 'node:path';
import {spawn} from 'node:child_process';
import {findChrome, glRenderer, launch, loadPlayer, openDrivenPage, PINNED_CHROME, withChromeLock} from './chrome.ts';
import {extractMedia} from './extract.ts';
import {servePlayer} from './server.ts';

export interface RenderOptions {
  dist: string;
  out: string;
  fps?: number;
  /** Exact input frame rate (for example 30000/1001). */
  fpsRate?: string;
  layer?: 'mov'|'webm';
  over?: string;
  from?: number;
  to?: number;
  /** explicit frame list (overrides from/to; e.g. regression samples) */
  frames?: number[];
  order?: 'seq' | 'random';
  /** browsers rendering at once (1); 'auto' sizes it to the machine and the job (`autoConcurrency`) */
  concurrency?: number | 'auto';
  format?: 'png' | 'jpeg';
  encode?: boolean;
  audio?: boolean;
  saveFrames?: boolean;
  chrome?: string;
  /** canvas preset id */
  preset?: string;
  /** device pixels per canvas pixel: 2 renders a 1920 x 1080 canvas as 3840 x 2160, laid out as at 1 (a part's canvas reads it as `devicePixelRatio`) */
  scale?: number;
  /** draw on the machine's GPU instead of in software: faster when Chrome reaches one, but the pixels depend on the GPU and its driver */
  gpu?: boolean;
  /** a built-in theme drawn in place of the document's own (a variant's `theme`) */
  theme?: string;
  /** per-frame paint reset (default flow) */
  reset?: 'flow' | 'display' | 'none';
  /** also measure each frame's layout for QA (window.__visotalk.inspect) */
  inspect?: boolean;
  /** called for every captured frame */
  onFrame?: (i: number, img: Buffer) => void;
  log?: (s: string) => void;
  /** how often the progress line (`frames …`) is logged, in ms (5000): a terminal that rewrites it in place can take it every second */
  progressMs?: number;
}

/** 754.2 s → "12:34", 3725 s → "1:02:05" */
const clock = (s: number) => {
  const t = Math.max(0, Math.round(s)), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = String(t % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

export interface RenderReport {
  doc: string;
  chrome: string;
  /** with `gpu`: the GL renderer the frames were drawn with */
  gpu?: string;
  fps: number;
  frames: number;
  range: [number, number];
  order: string;
  concurrency: number;
  /** `wallMs` and `fps` are the capture, which includes waiting for the encoder when it is behind; `encodeMs` is what follows it: the encoder's last frames and the sound */
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

/**
 * What one browser rendering a 1920 x 1080 page is allowed, in MB: a margin over the 0.5 to 1 GB a heavy canvas document was seen to take, not a
 * measurement. Times `scale`, not its square: Chrome's memory grows with the pixels it paints, but much of it is not pixels.
 */
const MB_PER_BROWSER = 1500;

/**
 * How many browsers to render with, and what bounded the number: one a core (a browser waits on the page and the pipe for part of every frame, so
 * on two cores two browsers drew 18% faster than one and three no faster than two), half the memory (a container's limit
 * where there is one) to the browsers, at least 30 frames each, at most 16. On a tie the first of those is named. CPU quotas are not seen, only the
 * cores the process may run on.
 */
export function autoConcurrency({frames, scale = 1, cores = availableParallelism(), memoryMb = (process.constrainedMemory() || totalmem()) / 2 ** 20}: {frames: number; scale?: number; cores?: number; memoryMb?: number}): {browsers: number; bound: 'cores' | 'memory' | 'frames' | 'limit'} {
  const bounds = {cores, memory: Math.floor((memoryMb * 0.5) / (MB_PER_BROWSER * Math.max(1, scale))), frames: Math.floor(frames / 30), limit: 16} as const;
  const [bound, n] = (Object.entries(bounds) as Array<[keyof typeof bounds, number]>).reduce((a, b) => (b[1] < a[1] ? b : a));
  return {browsers: Math.max(1, n), bound};
}

/** Renders (or probes, or inspects) frames of a built player; one run at a time drives Chrome on a machine (`withChromeLock`) */
export const renderBuilt = (o: RenderOptions): Promise<RenderReport> => withChromeLock(async () => {
  const s = await openSession(o);
  try {
    return await renderUnlocked(o, s);
  } finally {
    s.close();
  }
});

/** A built player served for capture, and what its page says about the film: its length, narration and sounds (one probe for every range rendered) */
interface Session {
  url: string;
  meta: Meta;
  version: string;
  close: () => void;
}

async function openSession(o: RenderOptions): Promise<Session> {
  const fps = o.fps ?? 30;
  const chrome = findChrome(o.chrome);
  if (o.scale !== undefined && !(o.scale > 0 && o.scale <= 4)) throw new Error(`scale must be a number above 0 and at most 4, not ${o.scale}`);
  if (typeof o.concurrency === 'number' && !(Number.isInteger(o.concurrency) && o.concurrency >= 1)) throw new Error(`concurrency is a whole number of browsers, 1 or more, not ${o.concurrency}`);
  const mediaCache = resolve(o.dist, '..', '.media-cache');
  await extractMedia(resolve(o.dist), mediaCache);
  const player = await servePlayer(o.dist, 0, mediaCache);
  const query = new URLSearchParams({mode: 'driven', fps: String(fps), media: '/__media', reset: o.reset ?? 'flow', ...(o.preset ? {preset: o.preset} : {}), ...(o.theme ? {theme: o.theme} : {}),...((o.layer||o.over)?{alpha:'1'}:{})});
  const url = `${player.url}?${query}`;
  try {
    const probeBrowser = await launch(chrome);
    try {
      const version = await probeBrowser.version();
      if (!version.endsWith(`/${PINNED_CHROME}`)) console.error(`warning: ${version} is not the pinned ${PINNED_CHROME}; pixels, and the goldens, can differ from other machines`);
      const p = await probeBrowser.newPage();
      await loadPlayer(p, url);
      const meta = (await p.evaluate(`({doc: window.__visotalk.doc, duration: window.__visotalk.duration, width: window.__visotalk.width,
        height: window.__visotalk.height, narration: window.__visotalk.narration, sounds: window.__visotalk.sounds, envelopes: []})`)) as Meta;
      const count = Math.ceil(meta.duration * ENV_HZ);
      meta.envelopes = (await p.evaluate(`window.__visotalk.sounds.map((_, i) => window.__visotalk.soundGain(i, 0, ${ENV_HZ}, ${count}))`)) as number[][];
      return {url, meta, version, close: () => player.close()};
    } finally {
      await probeBrowser.close();
    }
  } catch (err) {
    player.close();
    throw err;
  }
}

/** Where a range sits in the film being rendered, so progress counts the film's frames and its time left rather than the range's */
interface FilmProgress {
  before: number;
  total: number;
}

async function renderUnlocked(o: RenderOptions, {url, meta, version}: Session, film?: FilmProgress): Promise<RenderReport> {
  const fps = o.fps ?? 30;
  const format = o.layer||o.over?'png':o.format ?? 'png';
  const log = o.log ?? (() => {});
  const chrome = findChrome(o.chrome);
  const out = resolve(o.out);
  mkdirSync(out, {recursive: true});
  if (o.saveFrames) mkdirSync(join(out, 'frames'), {recursive: true});
  // an encoder still running when the render stops (a browser failed, the sound could not be mixed) is stopped with it
  let running: ReturnType<typeof streamEncoder> | undefined;
  try {
    // 2. capture
    const total = Math.round(meta.duration * fps);
    const from = o.from ?? 0;
    const to = Math.min(total, o.to ?? total);
    const indices = o.frames ? o.frames.filter((i) => i >= 0 && i < total) : Array.from({length: to - from}, (_, i) => from + i);
    const order = o.order === 'random' ? shuffled(indices) : indices;
    let conc: number;
    if (o.concurrency === 'auto') {
      const sized = autoConcurrency({frames: order.length, scale: o.scale ?? 1});
      log(`${sized.browsers} browser${sized.browsers > 1 ? 's' : ''} (bounded by ${sized.bound})`);
      conc = sized.browsers;
    } else conc = o.concurrency ?? 1;
    // interleaved: browser c takes the frames c, c + n, c + 2n…, so each holds at most one frame while the encoder waits for an earlier one, and a
    // stretch of heavy frames is shared out rather than landing on one browser
    const chunks = Array.from({length: conc}, (_, c) => order.filter((_, j) => j % conc === c)).filter((c) => c.length);
    const hashes: string[] = new Array(total).fill('');
    const ext = format === 'jpeg' ? 'jpg' : 'png';
    const frameDir = join(out, 'frames');
    // the video is encoded while the frames are drawn: each goes to ffmpeg's stdin in order, and never to disk
    if (o.encode && (o.order === 'random' || o.frames)) throw new Error('an encoded render takes its frames in order, from `from` to `to`');
    if (o.encode && to <= from) throw new Error(`no frames to encode between ${from} and ${to} (the film has ${total})`);
    const encoder = (running = o.encode ? streamEncoder(ext, to - from, join(out, o.layer?`video.${o.layer}`:o.over?'overlay.mov':'video.mp4'), fps, from, o.layer??(o.over?'mov':undefined),o.fpsRate) : undefined);
    const inspections: Record<number, unknown> = {};
    let seekMs = 0, captureMs = 0, gpu: string | undefined;
    const t0 = performance.now();
    // progress across every browser at once, at most every `progressMs` (and at the last frame): done, rate, and the time left at that rate
    let done = 0, shown = t0;
    const progress = () => {
      done++;
      const now = performance.now();
      if (now - shown < (o.progressMs ?? 5000) && done < order.length) return;
      shown = now;
      const all = film?.total ?? order.length, at = (film?.before ?? 0) + done;
      const rate = done / ((now - t0) / 1000), left = (all - at) / rate;
      log(`frames ${at}/${all} (${Math.floor((100 * at) / all)}%) · ${rate.toFixed(1)} fps · ${at < all ? `${clock(left)} left` : film ? 'done' : `${clock((now - t0) / 1000)} in all`}`);
    };
    const browsers = await Promise.allSettled(chunks.map(async (chunk) => {
      let browser: Awaited<ReturnType<typeof launch>> | undefined;
      // the frame this browser handed the encoder last: it draws its next frame while that one waits for its turn, so it holds at most two
      let handed: Promise<void> | undefined;
      try {
        browser = await launch(chrome, [], o.scale, o.gpu);
        const d = await openDrivenPage(browser, url, meta.width, meta.height, fps, o.scale);
        // say once what the GPU flag reached: where Chrome finds no GPU it draws in software, often slower than without the flag
        if (o.gpu && chunk === chunks[0]) {
          gpu = await glRenderer(d.page);
          log(/swiftshader|llvmpipe|software|no webgl/i.test(gpu) ? `--gpu: no GPU reached, drawing in software (${gpu}); render without --gpu` : `--gpu: drawing on ${gpu}`);
        }
        for (const i of chunk) {
          const a = performance.now();
          await d.page.evaluate(`window.__visotalk.seek(${i})`);
          if (o.inspect) inspections[i] = await d.page.evaluate('window.__visotalk.inspect()');
          const b = performance.now();
          const img = (await d.frame(format === 'jpeg' ? {format: 'jpeg', quality: JPEG_QUALITY} : {format: 'png'}))!;
          seekMs += b - a;
          captureMs += performance.now() - b;
          hashes[i] = createHash('sha256').update(img).digest('hex').slice(0, 16);
          if (o.saveFrames) await writeFile(join(frameDir, `${String(i).padStart(5, '0')}.${ext}`), img);
          await handed;
          handed = encoder?.write(i, img);
          o.onFrame?.(i, img);
          progress();
        }
        await handed;
      } catch (err) {
        // the other browsers may be waiting for this one's frames: stop them too
        encoder?.fail(err as Error);
        handed?.catch(() => {});
        throw err;
      } finally {
        await browser?.close();
      }
    }));
    // every browser has stopped before the first failure is reported, so none outlives the run (or the Chrome lock)
    const failure = browsers.find((b): b is PromiseRejectedResult => b.status === 'rejected');
    if (failure) throw failure.reason;
    const wall = performance.now() - t0;
    // 3. the encoder's last frames, then the sound
    let encodeMs = 0;
    if (encoder) {
      const e0 = performance.now();
      await encoder.close();
      if(o.over){
        await run('ffmpeg',['-y','-v','error','-ss',String(from/fps),'-i',resolve(o.over),'-i',join(out,'overlay.mov'),'-filter_complex','[0:v][1:v]overlay=shortest=1:format=auto[v]','-map','[v]','-an',...X264,'-t',String((to-from)/fps),join(out,'video.mp4')]);
      }
      const video=join(out,o.layer?`video.${o.layer}`:'video.mp4');
      const output=join(out,o.layer?`final.${o.layer}`:'final.mp4');
      if (o.audio !== false && ((o.layer?0:meta.narration.length) || meta.sounds.length)) {
        log('mixing the soundtrack');
        await muxAudio(video,output,from/fps,(to-from)/fps,{...meta,...(o.layer&&{narration:[]})},resolve(o.dist));
      }
      encodeMs = performance.now() - e0;
    }
    const n = order.length;
    const report: RenderReport = {
      doc: meta.doc, chrome: version, fps, frames: n, range: [from, to], order: o.order ?? 'seq', concurrency: chunks.length,
      timings: {wallMs: Math.round(wall), seekMsPerFrame: +(seekMs / n).toFixed(1), captureMsPerFrame: +(captureMs / n).toFixed(1), fps: +(n / (wall / 1000)).toFixed(2), encodeMs: Math.round(encodeMs)},
      hashes, ...(o.inspect ? {inspections} : {}), ...(gpu && {gpu}),
    };
    writeFileSync(join(out, 'report.json'), JSON.stringify({...report, inspections: undefined}, null, 1));
    return report;
  } finally {
    running?.fail(new Error('the render stopped'));
  }
}

/** Frames in a segment of an encoded render: 100 s at 30 fps, so an interrupted render loses at most that much */
export const SEGMENT_FRAMES = 3000;

/** The segments of the frames `from` to `to`: cut at whole multiples of `size` from the film's start, so a range and the whole film share their segments' names */
export function segmentPlan(from: number, to: number, size = SEGMENT_FRAMES): Array<[number, number]> {
  const plan: Array<[number, number]> = [];
  for (let s = from; s < to; s = Math.min(to, (Math.floor(s / size) + 1) * size)) plan.push([s, Math.min(to, (Math.floor(s / size) + 1) * size)]);
  return plan;
}

/** What `build --artifact` adds beside the player, which the render never reads */
const NOT_RENDERED = new Set(['player.html', 'artifact.json']);

/**
 * What a segment's pixels and its stream depend on: every file of the built player the render reads (all but the page are named by their content, so
 * the page and the list of names stand for them), the Chrome that draws it, the options that change a frame and the encoder's own settings. Segments
 * written under another fingerprint are kept beside, not used.
 */
export function segmentFingerprint(dist: string, chrome: string, o: Pick<RenderOptions, 'fps' | 'format' | 'scale' | 'gpu' | 'theme' | 'preset' | 'reset'>): string {
  const h = createHash('sha256').update(readFileSync(join(dist, 'index.html')));
  const files = (readdirSync(dist, {recursive: true}) as string[]).map((f) => f.split(sep).join('/')).filter((f) => !NOT_RENDERED.has(f)).sort();
  h.update(files.join('\n'));
  h.update(JSON.stringify([chrome, X264, JPEG_QUALITY, o.fps ?? 30, o.format ?? 'png', o.scale ?? 1, !!o.gpu, o.theme ?? '', o.preset ?? '', o.reset ?? 'flow']));
  return h.digest('hex').slice(0, 16);
}

/** Whether a segment is whole: a file with `frames` video frames, as ffprobe counts them (a missing or broken file is not; a missing ffprobe is an error) */
export const segmentDone = (file: string, frames: number) => !existsSync(file) ? Promise.resolve(false) : new Promise<boolean>((ok, no) => {
  const p = spawn('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', file], {stdio: ['ignore', 'pipe', 'ignore']});
  let out = '';
  p.stdout!.on('data', (d) => (out += d));
  p.on('error', (e) => no(new Error(`ffprobe, which comes with ffmpeg, could not be run: ${e.message}`)));
  p.on('close', (code) => ok(code === 0 && out.trim() === String(frames)));
});

/** The segments joined into one video as they are: one encoder's settings throughout, each starting on a key frame. `faststart` when it is the file delivered */
export async function joinSegments(files: string[], out: string, faststart: boolean) {
  const dir = dirname(files[0]), list = join(dir, 'list.txt'), part = out.replace(/(\.[^.\/]+)?$/, '.part$1');
  // names relative to the list, which ffmpeg reads them against: no path to quote
  writeFileSync(list, files.map((f) => `file '${relative(dir, f).split(sep).join('/')}'\n`).join(''));
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', ...(faststart ? ['-movflags', '+faststart'] : []), part]);
  renameSync(part, out);
}

/**
 * An encoded render of a long film in segments of `segmentFrames` (`SEGMENT_FRAMES`): each is encoded on its own (an x264 stream of its own starts on
 * a key frame, so the segments join without encoding again) and kept in `out/segments/<fingerprint>/` once whole. Run again after an interruption, it
 * skips every segment there with its frame count (`segmentFingerprint`, `segmentDone`); segments made under another fingerprint stay where they are
 * until a render succeeds, so going back to the options they were made with picks them up again. A segment that fails is tried once more. The
 * segments are then joined, the soundtrack mixed once for the whole range, and every segment removed.
 */
export const renderSegmented = (o: RenderOptions & {segmentFrames?: number}): Promise<RenderReport> => withChromeLock(async () => {
  if (o.frames || o.order === 'random' || o.saveFrames) throw new Error('a render in segments takes its frames in order, from `from` to `to`, and keeps none');
  for (const [k, v] of [['from', o.from], ['to', o.to]] as const) if (v !== undefined && !(Number.isInteger(v) && v >= 0)) throw new Error(`${k} is a frame number, a whole number from 0, not ${v}`);
  const session = await openSession(o);
  try {
    const fps = o.fps ?? 30;
    // a line every segment would say again (how many browsers, which GPU) is said once
    const said = new Set<string>(), log = (line: string) => {
      if (/^\d+ browsers? \(|^--gpu: /.test(line)) {
        if (said.has(line)) return;
        said.add(line);
      }
      o.log?.(line);
    };
    const total = Math.round(session.meta.duration * fps), from = o.from ?? 0, to = Math.min(total, o.to ?? total);
    if (to <= from) throw new Error(`no frames to encode between ${from} and ${to} (the film has ${total})`);
    const out = resolve(o.out), root = join(out, 'segments'), dir = join(root, segmentFingerprint(resolve(o.dist), session.version, o)), work = join(root, '.work');
    mkdirSync(dir, {recursive: true});
    const plan = segmentPlan(from, to, o.segmentFrames);
    const file = ([s, e]: [number, number]) => join(dir, `${String(s).padStart(6, '0')}-${String(e).padStart(6, '0')}.mp4`);
    const hashes: string[] = new Array(total).fill('');
    let rendered = 0, wallMs = 0, seekMs = 0, captureMs = 0, encodeMs = 0, concurrency = 0, gpu: string | undefined, before = 0;
    const t0 = performance.now();
    for (const [k, seg] of plan.entries()) {
      const [s, e] = seg;
      if (await segmentDone(file(seg), e - s)) {
        log(`segment ${k + 1}/${plan.length} (frames ${s}–${e}): already rendered`);
        before += e - s;
        continue;
      }
      log(`segment ${k + 1}/${plan.length} (frames ${s}–${e})`);
      let r: RenderReport | undefined;
      for (let attempt = 1; !r; attempt++) {
        try {
          rmSync(work, {recursive: true, force: true, maxRetries: 5});
          r = await renderUnlocked({...o, from: s, to: e, audio: false, encode: true, out: work, log}, session, {before, total: to - from});
        } catch (err) {
          if (attempt > 1) throw err;
          log(`segment ${k + 1}/${plan.length} failed (${(err as Error).message.split('\n')[0]}): trying it once more`);
        }
      }
      renameSync(join(work, 'video.mp4'), file(seg));
      for (let i = s; i < e; i++) hashes[i] = r.hashes[i];
      rendered += r.frames;
      wallMs += r.timings.wallMs;
      seekMs += r.timings.seekMsPerFrame * r.frames;
      captureMs += r.timings.captureMsPerFrame * r.frames;
      encodeMs += r.timings.encodeMs;
      concurrency = Math.max(concurrency, r.concurrency);
      gpu ??= r.gpu;
      before += e - s;
    }
    const e0 = performance.now();
    const sound = o.audio !== false && (session.meta.narration.length || session.meta.sounds.length);
    const video = join(out, 'video.mp4');
    await joinSegments(plan.map(file), video, !sound);
    if (sound) {
      log('mixing the soundtrack');
      await muxAudio(video, join(out, 'final.mp4'), from / fps, (to - from) / fps, session.meta, resolve(o.dist));
    }
    encodeMs += performance.now() - e0;
    log(`${to - from} frames in ${clock((performance.now() - t0) / 1000)}${rendered < to - from ? ` (${to - from - rendered} rendered before)` : ''}`);
    rmSync(root, {recursive: true, force: true, maxRetries: 5});
    const n = Math.max(1, rendered);
    const report: RenderReport = {
      doc: session.meta.doc, chrome: session.version, fps, frames: rendered, range: [from, to], order: 'seq', concurrency,
      timings: {wallMs: Math.round(wallMs), seekMsPerFrame: +(seekMs / n).toFixed(1), captureMsPerFrame: +(captureMs / n).toFixed(1), fps: +(rendered / (Math.max(1, wallMs) / 1000)).toFixed(2), encodeMs: Math.round(encodeMs)},
      hashes, ...(gpu && {gpu}),
    };
    writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 1));
    return report;
  } finally {
    session.close();
  }
});

function run(cmd: string, args: string[], input?: (stdin: NodeJS.WritableStream) => Promise<void>): Promise<void> {
  return new Promise((ok, fail) => {
    const p = spawn(cmd, args, {stdio: [input ? 'pipe' : 'ignore', 'ignore', 'pipe']});
    let err = '';
    p.stderr!.on('data', (d) => (err += d));
    p.on('close', (code) => (code === 0 ? ok() : fail(new Error(`${cmd} exited ${code}: ${err.slice(-2000)}`))));
    if (input) input(p.stdin!).then(() => p.stdin!.end(), fail);
  });
}

/** How every video is encoded; segments join without encoding again only when they share it, so it is part of their fingerprint */
const X264 = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p'];
/** The quality of a JPEG frame handed to the encoder */
const JPEG_QUALITY = 90;

/**
 * An ffmpeg that encodes the frames it is handed through its stdin, in order: `write(i)` waits until frame `i - 1` has gone in (browsers finish out of
 * order) and while ffmpeg is behind (the pipe's backpressure), so a browser holds at most the one frame it drew. `fail` wakes every waiter with the
 * error and stops ffmpeg; `close` ends the input and waits for the file. The frames are numbered from `first`.
 */
export function streamEncoder(ext: 'jpg' | 'png', count: number, out: string, fps: number, first = 0, layer?:'mov'|'webm',fpsRate?:string) {
  // written beside `out` and moved over it once whole, so a failed render leaves the last good video where it was
  const part = out.replace(/(\.[^.\/]+)?$/, '.part$1');
  const p = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', fpsRate??String(fps), '-c:v', ext === 'jpg' ? 'mjpeg' : 'png', '-i', 'pipe:0',
    '-frames:v', String(count), ...(layer==='mov'?['-c:v','prores_ks','-profile:v','4','-pix_fmt','yuva444p10le']:layer==='webm'?['-c:v','libvpx-vp9','-pix_fmt','yuva420p','-auto-alt-ref','0','-b:v','0','-crf','24']:X264),...(layer==='webm'?[]:['-movflags','+faststart']), part], {stdio: ['pipe', 'ignore', 'pipe']});
  let err = '';
  p.stderr!.on('data', (d) => (err = (err + d).slice(-4000)));
  let failed: Error | undefined;
  const waiting = new Map<number, () => void>();
  let closed = false;
  let removed: Promise<void> | undefined;
  const fail = (e: Error) => {
    if (closed) return;
    failed ??= e;
    for (const wake of waiting.values()) wake();
    waiting.clear();
    p.kill('SIGKILL');
    // once ffmpeg has let go of it: on Windows a killed process holds its files for a moment
    removed ??= exited.catch(() => {}).then(() => rmSync(part, {force: true, maxRetries: 5}));
  };
  const exited = new Promise<void>((ok, no) => {
    p.on('close', (code) => (code === 0 ? ok() : no(new Error(`ffmpeg exited ${code}: ${err}`))));
    p.on('error', no); // ffmpeg missing: no process, no 'close'
  });
  exited.catch((e: Error) => fail(e));
  // a write to an ffmpeg that has died fails with EPIPE; its exit, with what it said, is the error to report
  p.stdin!.on('error', () => {});
  let next = first;
  return {
    async write(i: number, img: Buffer) {
      while (next !== i && !failed) await new Promise<void>((wake) => waiting.set(i, wake));
      if (failed) throw failed;
      if (!p.stdin!.write(img)) await Promise.race([new Promise((drained) => p.stdin!.once('drain', drained)), exited]);
      if (failed) throw failed;
      next++;
      const wake = waiting.get(next);
      waiting.delete(next);
      wake?.();
    },
    fail,
    async close() {
      if (!failed) {
        p.stdin!.end();
        await exited.catch(() => {});
      }
      if (failed) {
        await removed;
        throw failed;
      }
      renameSync(part, out);
      closed = true;
    },
  };
}

const SR = 48000;
/**
 * The soundtrack of a video that starts `offset` seconds into the film and runs `length` seconds. The narration clips each at their start, mixed and loudness-normalised
 * to −16 LUFS, as they are; then each sound of the document: its file (looped if it loops) set at its start, multiplied by its gain envelope (volume, fades, ducking: the
 * curve the player uses), and added to the narration without changing it. With a `video` it is muxed into a copy of it; without one it is written alone as an MP3 (the
 * one track a built player plays, so the page sounds as the video does).
 *
 * The narration goes through ffmpeg (it needs loudnorm); sounds are decoded once to disk at 48 kHz stereo, then mixed in bounded blocks over their active spans. Doing that in an ffmpeg graph meant padding every sound and its envelope to the whole film, which cost as many film lengths as there were sounds
 * (a five-minute film with 150 sounds took fifteen minutes to mix).
 */
export async function muxAudio(video: string | undefined, out: string, offset: number, length: number, meta: Pick<Meta, 'narration' | 'sounds' | 'envelopes'>, root: string) {
  const lines = meta.narration.map((l) => ({at: l.at - offset,duration:l.duration, src: join(root, l.src)})).filter((l) => l.at+(l.duration??length)>0&&l.at<length);
  // A continuous recording (or silence) needs no whole-film PCM buffer when there are no effects.
  if(!meta.sounds.length&&lines.length<=1){
    const line=lines[0],input=line?['-i',line.src]:['-f','lavfi','-i',`anullsrc=r=${SR}:cl=stereo`];
    const filter=line?`atrim=start=${Math.max(0,-line.at)},asetpts=PTS-STARTPTS,adelay=${Math.max(0,Math.round(line.at*1000))}:all=1,aformat=channel_layouts=mono,pan=stereo|c0=c0|c1=c0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=${SR},apad,atrim=0:${length},alimiter=limit=0.95`:`atrim=0:${length}`;
    const audio=out.endsWith('.webm')?['-c:a','libopus','-b:a','160k']:out.endsWith('.mov')?['-c:a','pcm_s24le']:video?['-c:a','aac','-b:a','160k']:['-c:a','libmp3lame','-b:a','96k'];
    await run('ffmpeg',['-y','-v','error',...(video?['-i',video]:[]),...input,'-filter_complex',`[${video?1:0}:a]${filter}[a]`,...(video?['-map','0:v','-c:v','copy']:[]),'-map','[a]',...audio,'-ar',String(SR),'-t',String(length),...(!out.endsWith('.webm')&&video?['-movflags','+faststart']:[]),out]);return;
  }
  const n = Math.round(length * SR), tmp = mkdtempSync(join(tmpdir(), 'visotalk-mix-'));
  const handles: number[] = [];
  try {
    // Decode to disk and mix bounded blocks. Even an hour-long source never becomes a whole-film JS buffer.
    const decoded = new Map<string, {fd: number; frames: number}>();
    const decode = async (src: string) => {
      if (!decoded.has(src)) {
        const file = join(tmp, `source-${decoded.size}.f32`);
        await run('ffmpeg', ['-y','-v','error','-i',src,'-f','f32le','-ar',String(SR),'-ac','2',file]);
        const fd = openSync(file,'r'); handles.push(fd);
        decoded.set(src,{fd,frames:Math.floor(fstatSync(fd).size/8)});
      }
      return decoded.get(src)!;
    };
    let narration: number | undefined;
    if (lines.length) {
      const graph = [...lines.map((l,k)=>`[${k}:a]atrim=start=${Math.max(0,-l.at).toFixed(6)},asetpts=PTS-STARTPTS,adelay=${Math.max(0,Math.round(l.at*1000))}:all=1[a${k}]`),
        `${lines.map((_,k)=>`[a${k}]`).join('')}amix=inputs=${lines.length}:normalize=0,aformat=channel_layouts=mono,pan=stereo|c0=c0|c1=c0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=${SR},apad,atrim=0:${length.toFixed(6)}[nar]`];
      const file = join(tmp,'narration.f32');
      await run('ffmpeg',['-y','-v','error',...lines.flatMap((l)=>['-i',l.src]),'-filter_complex',graph.join(';'),'-map','[nar]','-f','f32le','-ar',String(SR),'-ac','2',file]);
      narration=openSync(file,'r');handles.push(narration);
    }
    for(const sound of meta.sounds)await decode(join(root,sound.src));
    const sounds=meta.sounds.map((s)=>({...s,...decoded.get(join(root,s.src))!}));
    const raw=join(tmp,'mix.f32'),outFd=openSync(raw,'w');handles.push(outFd);
    const blockFrames=30*SR;
    for(let start=0;start<n;start+=blockFrames){
      const count=Math.min(blockFrames,n-start),buffer=Buffer.alloc(count*8),mix=new Float32Array(buffer.buffer,buffer.byteOffset,count*2);
      if(narration!==undefined)readSync(narration,buffer,0,buffer.length,start*8);
      for(const [k,s] of sounds.entries()){
        if(!s.frames)continue;
        const i0=Math.round((s.at-offset)*SR),from=Math.max(start,0,i0),to=s.loop?start+count:Math.min(start+count,i0+s.frames);
        if(to<=from)continue;
        const bytes=Buffer.alloc((to-from)*8);
        for(let at=from;at<to;){
          const pos=s.loop?(at-i0)%s.frames:at-i0,frames=Math.min(to-at,s.frames-pos);
          readSync(s.fd,bytes,(at-from)*8,frames*8,pos*8);at+=frames;
        }
        const pcm=new Float32Array(bytes.buffer,bytes.byteOffset,bytes.length/4),env=meta.envelopes[k];
        for(let i=from;i<to;i++){
          const pos=(offset+i/SR)*ENV_HZ,e=Math.floor(pos),f=pos-e,gain=(env[e]??0)*(1-f)+(env[e+1]??0)*f,j=2*(i-from),dest=2*(i-start);
          mix[dest]+=pcm[j]*gain;mix[dest+1]+=pcm[j+1]*gain;
        }
      }
      writeFileSync(outFd,buffer);
    }
    const input = ['-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', raw];
    const limit = `alimiter=limit=0.95,atrim=0:${length.toFixed(3)}`;
    const encode = video
      ? ['-i', video, ...input, '-filter_complex', `[1:a]${limit}[aout]`, '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', out.endsWith('.webm')?'libopus':out.endsWith('.mov')?'pcm_s24le':'aac',...(!out.endsWith('.mov')?['-b:a','160k']:[]),...(!out.endsWith('.webm')?['-movflags','+faststart']:[])]
      : [...input, '-af', limit, '-c:a', 'libmp3lame', '-b:a', '96k'];
    await run('ffmpeg', ['-y', '-loglevel', 'error', ...encode, '-ar', String(SR), out]);
  } finally {
    for(const fd of handles)closeSync(fd);
    rmSync(tmp, {recursive: true, force: true});
  }
}
