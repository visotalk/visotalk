/** Transcribe an owned recording once; the source media and measured speech are copied into the project. */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, copyFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, resolve, relative } from 'node:path';
import { isFiller, parseMarkup, recordingLang, recordingLines, SPEC_VERSION, trimLines, trimPlan, type Line, type RecordedUnit, type TrimOptions } from '@visotalk/ir';
export function recordingProbe(file: string) {
  const p = JSON.parse(
    execFileSync('ffprobe', ['-v', 'error', '-count_packets', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' }),
  );
  const audio = p.streams.find((s: { codec_type: string }) => s.codec_type === 'audio'),
    video = p.streams.find((s: { codec_type: string }) => s.codec_type === 'video');
  if (!audio) throw new Error('The recording has no audio stream');
  const duration = Number(p.format.duration);
  if (!Number.isFinite(duration) || duration <= 0 || duration > 3600) throw new Error('Recording duration must be at most one hour');
  if (video && video.avg_frame_rate !== video.r_frame_rate)
    throw new Error('Variable frame rate recordings must be converted to constant frame rate before import');
  const rate = video?.avg_frame_rate as string | undefined;
  const [n, d] = rate?.split('/').map(Number) ?? [];
  if (video && (!(n / d > 0) || !Number.isFinite(n / d))) throw new Error('The recording has no valid fixed frame rate');
  const frames=video?Number(video.nb_read_packets):undefined;
    // a camera's file is as long as its longer stream, and its picture often ends a frame or two before its sound: a quarter of a second apart is one take, more is not
  if(video&&(!Number.isInteger(frames)||frames!<=0||Math.abs(frames!/(n/d)-duration)>0.25))throw new Error(`The recording's picture (${frames} frames, ${(frames!/(n/d)).toFixed(2)} s) and its sound (${duration.toFixed(2)} s) are not one take`);
  if(video&&(Number(video.tags?.rotate??0)!==0||video.side_data_list?.some((item:{rotation?:number})=>item.rotation)))throw new Error('Normalize video rotation before importing the recording');
  return {duration,...(video&&{width:Number(video.width),height:Number(video.height),fps:n/d,frameRate:rate,frames})};
}
/** Where the recording speaks and where it does not, as comments above the document: the shape its scenes are planned on */
export function recordingOutline(lines: Line[], duration: number, cuts: number[] = []): string {
  const f = (t: number) => t.toFixed(1);
  const first = lines[0].span!, last = lines.at(-1)!.span!;
  const gaps = lines.slice(1).map((l, i) => ({ after: lines[i].id, from: lines[i].span!.end, to: l.span!.start })).filter((g) => g.to - g.from >= 2);
  // what a trim would cut, so the person can be told before they choose: the hesitations, and the silences between words past 0.8 s
  const words = lines.flatMap((l) => (l.words ?? []).map((w) => ({ w: w.w, start: l.span!.start + w.t0, end: l.span!.start + w.t1 })));
  const hesitations = words.filter((w) => isFiller(w.w)).length;
  const long = words.slice(1).map((w, i) => w.start - words[i].end).filter((g) => g > 0.8);
  return [
    `// The recording, ${f(duration)} s: speech ${f(first.start)}–${f(last.end)} s in ${lines.length} lines.`,
    ...(first.start >= 2 ? [`// Before the first word: ${f(first.start)} s without speech (0–${f(first.start)} s).`] : []),
    ...gaps.map((g) => `// A pause of ${f(g.to - g.from)} s after ${g.after} (${f(g.from)}–${f(g.to)} s).`),
    ...(duration - last.end >= 2 ? [`// After the last word: ${f(duration - last.end)} s without speech (${f(last.end)}–${f(duration)} s).`] : []),
    ...(cuts.length ? [`// The picture cuts to a new shot at ${cuts.map(f).join(', ')} s (${cuts.length + 1} shots).`] : []),
    ...(hesitations || long.length ? [`// A trim, only if the person asks, would cut ${hesitations} hesitation(s) and shorten ${long.length} silence(s) of over 0.8 s between words (${f(long.reduce((t, g) => t + g - 0.8, 0))} s in all).`] : []),
    '',
  ].join('\n');
}
/**
 * Where a filmed video cuts from one shot to the next: ffmpeg's scene score on a small copy of the picture, a cut where it passes 0.2 (0.3 missed
 * a cut to a profile against the same trees, a jump cut and a close-up of moss in a brand film), and none within half a second of the last.
 */
export function videoCuts(file: string): number[] {
  // showinfo reports on stderr
  const run = spawnSync('ffmpeg', ['-v', 'info', '-i', file, '-an', '-vf', "scale=320:-2,select='gt(scene,0.2)',showinfo", '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64 << 20 });
  if (run.status !== 0) throw new Error(`ffmpeg could not read the recording's picture: ${run.stderr.slice(-500)}`);
  const out = run.stderr;
  return out.split('\n').filter((l) => l.includes('Parsed_showinfo')).map((l) => Number(/pts_time:([0-9.]+)/.exec(l)?.[1]))
    .filter((t) => Number.isFinite(t) && t >= 0.5).reduce<number[]>((a, t) => (a.length && t - a.at(-1)! < 0.5 ? a : [...a, t]), []);
}
/** Measured words of a recording from MiniMax `asr-1.0`, in chunks of at most 470 s; kept beside the work by the file's hash, so asking again (a trim decided later) is free */
export async function transcribeRecording(file: string, duration: number, lang: string, cache: string): Promise<RecordedUnit[]> {
  if (existsSync(cache)) return JSON.parse(readFileSync(cache, 'utf8')) as RecordedUnit[];
  const key = process.env.MINIMAX_API_KEY;
  if (!key) throw new Error('MINIMAX_API_KEY is needed for measured recording transcription');
  const temp = mkdtempSync(join(tmpdir(), 'visotalk-recording-'));
  const units: RecordedUnit[] = [];
  try {
    for (let offset = 0; offset < duration; offset += 470) {
      const audio = join(temp, 'take.flac'),
        seconds = Math.min(470, duration - offset);
      const segment = `${cache}.${offset}-${seconds}.json`;
      if (existsSync(segment)) {
        const kept = JSON.parse(readFileSync(segment, 'utf8')) as RecordedUnit[];
        if (kept.length) recordingLines(kept, seconds);
        units.push(...kept.map((u) => ({ ...u, start: u.start + offset, end: u.end + offset })));
        continue;
      }
      execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(offset), '-i', file, '-t', String(seconds), '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'flac', audio]);
      const bytes = readFileSync(audio);
      if (bytes.length > 50_000_000) throw new Error('The transcription segment exceeds 50 MB');
      const body = new FormData();
      body.set('file', new Blob([bytes], { type: 'audio/flac' }), 'recording.flac');
      body.set('model', 'asr-1.0');
      body.set('response_format', 'verbose_json');
      body.set('timestamp_level', 'word');
      const base = (process.env.MINIMAX_BASE_URL ?? 'https://api.minimax.io').replace(/\/$/, '');
      const response = await fetch(`${base}/v1/speech_to_text?language=${encodeURIComponent(lang.split('-')[0])}`, {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'x-visotalk-segment-start': String(offset) },
        body,
        signal: AbortSignal.timeout(180_000),
      });
      if (!response.ok) throw new Error(`Recording transcription failed (${response.status})`);
      const data = (await response.json()) as { segments?: RecordedUnit[] };
      if (!Array.isArray(data.segments)) throw new Error('The provider returned no measured word units');
      if (data.segments.length) recordingLines(data.segments, seconds);
      mkdirSync(dirname(cache), { recursive: true });
      writeFileSync(`${segment}.${process.pid}.tmp`, JSON.stringify(data.segments));
      renameSync(`${segment}.${process.pid}.tmp`, segment);
      units.push(...data.segments.map((u) => ({ ...u, start: u.start + offset, end: u.end + offset })));
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
  mkdirSync(dirname(cache), { recursive: true });
  writeFileSync(`${cache}.${process.pid}.tmp`, JSON.stringify(units));
  renameSync(`${cache}.${process.pid}.tmp`, cache);
  return units;
}

/**
 * The stretches of a recording kept, joined into a new file: picture and sound cut at the same frame edges so they stay together, each joint
 * faded over 5 ms so it does not click. The picture is encoded again at the same size and exact frame rate.
 */
export function cutRecording(file: string, out: string, keep: Array<[number, number]>, video: boolean, frameRate?: string) {
  const parts = keep.map(([a, b], i) => [
    ...(video ? [`[0:v]trim=start=${a}:end=${b},setpts=PTS-STARTPTS[v${i}]`] : []),
    `[0:a]atrim=start=${a}:end=${b},asetpts=PTS-STARTPTS,afade=t=in:d=0.005,afade=t=out:st=${Math.max(0, b - a - 0.005).toFixed(4)}:d=0.005[a${i}]`,
  ].join(';'));
  const inputs = keep.map((_, i) => `${video ? `[v${i}]` : ''}[a${i}]`).join('');
  const graph = `${parts.join(';')};${inputs}concat=n=${keep.length}:v=${video ? 1 : 0}:a=1${video ? '[v]' : ''}[a]`;
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', file, '-filter_complex', graph, ...(video ? ['-map', '[v]', '-r', frameRate ?? '30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p'] : []),
    // the sound in the codec its file's kind holds: PCM in a WAV, MP3 in an MP3, AAC in an MP4 or M4A (the trimmed file is named for one of these)
    '-map', '[a]', ...(out.endsWith('.wav') ? ['-c:a', 'pcm_s16le'] : out.endsWith('.mp3') ? ['-c:a', 'libmp3lame', '-q:a', '2'] : ['-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart']), out], { stdio: ['ignore', 'ignore', 'pipe'] });
}

/** `--trim fillers,pauses=0.8`: what the person asked to have cut; nothing is cut unless they asked */
function trimOptions(spec: string | undefined, fps: number): TrimOptions | undefined {
  if (spec === undefined) return undefined;
  const o: TrimOptions = { fps };
  for (const item of spec.split(',').map((x) => x.trim()).filter(Boolean)) {
    const [name, value] = item.split('=');
    if (name === 'fillers') o.fillers = true;
    else if (name === 'pauses') {
      o.pauses = value === undefined ? 0.8 : Number(value);
      if (!(o.pauses >= 0.2)) throw new Error(`--trim pauses=SECONDS keeps that much of each silence between words, at least 0.2 (got ${value})`);
    } else throw new Error(`--trim takes fillers and pauses[=SECONDS], separated by commas (got ${item})`);
  }
  if (!o.fillers && o.pauses === undefined) throw new Error('--trim takes fillers and pauses[=SECONDS], separated by commas');
  return o;
}

export async function recordingCmd(args: string[]) {
  const input = args[0],
    opt = (name: string, fallback?: string) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
  if (!input) throw new Error('recording <audio-or-video> --out doc.tsx [--lang en|zh-CN] [--trim fillers,pauses[=0.8]]');
  const target = resolve(opt('out', 'doc.tsx')!);
  // a transcript nothing is drawn on yet may be made again (a trim decided after it); a document with pictures on its times may not
  // a transcript with nothing drawn on it is written again (a trim decided after it), keeping how its lines were grouped into scenes and the captions corrected
  let earlier: { scenes: { id: string; title?: string; lines: string[] }[]; captions: Map<string, string> } | undefined;
  if (existsSync(target)) {
    const doc = parseMarkup(readFileSync(target, 'utf8')).doc;
    const drawn = (doc.parts?.length ?? 0) + doc.scenes.reduce((n, s) => n + s.parts.length + s.animations.length + (s.sounds?.length ?? 0), 0);
    if (!doc.voice?.voice.startsWith('recording:') || drawn) throw new Error('The output document already exists and has pictures timed on its words: trim a recording before drawing on it');
    earlier = {
      scenes: doc.scenes.map((s) => ({ id: s.id, ...(s.title !== undefined && { title: s.title }), lines: s.lines.map((l) => l.id) })),
      captions: new Map(doc.scenes.flatMap((s) => s.lines.filter((l) => l.say !== undefined && l.text !== l.say).map((l) => [l.id, l.text] as [string, string]))),
    };
  }
  const file = resolve(input),
    info = recordingProbe(file),
    lang = opt('lang', 'en')!;
  if (!['en', 'zh', 'zh-CN'].includes(lang)) throw new Error('Recording recognition supports en and zh-CN');
  const trim = trimOptions(opt('trim'), info.fps ?? 100);
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  const hash = digest.digest('hex').slice(0, 16);
  const work = dirname(target);
  // Recognition settings belong in the cache key: a language/provider change needs a fresh transcript.
  const recognition = createHash('sha256').update(JSON.stringify(['asr-1.0', lang.split('-')[0], process.env.MINIMAX_BASE_URL ?? 'https://api.minimax.io', 'word', 1])).digest('hex').slice(0, 16);
  const units = await transcribeRecording(file, info.duration, lang, join(work, '.visotalk', 'recordings', `${hash}-${recognition}.json`));
  let lines = recordingLines(units, info.duration);
  const spoken = recordingLang(lines.map((l) => l.say).join(' '));
  const own = relative(work, file).split('\\').join('/');
  const media = /^media\/[a-z0-9][a-z0-9-]*\.[a-z0-9]+$/.test(own) ? own : `media/recording-${hash}${extname(file).toLowerCase()}`,
    id = `recording-${hash}`;
  mkdirSync(join(work, 'media'), { recursive: true });
  const dest = join(work, media);
  if (resolve(file) !== resolve(dest) && !existsSync(dest)) copyFileSync(file, dest);
  let asset = { src: media, info, cut: undefined as undefined | { source: string; keep: Array<[number, number]> } };
  if (trim) {
    const keep = trimPlan(lines, info.duration, trim);
    if (keep.length === 1 && keep[0][0] === 0 && Math.abs(keep[0][1] - info.duration) < 0.05) console.error('nothing to trim: no hesitation or silence of that length between words');
    else {
      // a video is cut into an MP4; a sound keeps a WAV or an MP3 as it was, and anything else becomes an M4A
      const src = media.replace(/\.[a-z0-9]+$/, (ext) => `-trimmed${info.width ? '.mp4' : ['.wav', '.mp3', '.m4a'].includes(ext) ? ext : '.m4a'}`);
      cutRecording(dest, join(work, src), keep, !!info.width, info.frameRate);
      const cut = recordingProbe(join(work, src));
      const before = lines.reduce((n, l) => n + (l.words?.length ?? 0), 0);
      lines = trimLines(lines, keep);
      console.error(`trimmed ${(info.duration - cut.duration).toFixed(1)} s (${info.duration.toFixed(1)} s to ${cut.duration.toFixed(1)} s) and ${before - lines.reduce((n, l) => n + (l.words?.length ?? 0), 0)} hesitation(s); the original is ${media}`);
      asset = { src, info: cut, cut: { source: media, keep } };
    }
  }
  const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const a = asset.info;
  const byId = new Map(lines.map((l) => [l.id, l]));
  const scenes = (earlier?.scenes ?? [{ id: 'recorded', lines: lines.map((l) => l.id) }]).map((s) => ({ ...s, lines: s.lines.filter((id) => byId.has(id)) })).filter((s) => s.lines.length);
  const placed = new Set(scenes.flatMap((s) => s.lines));
  if (!scenes.length) scenes.push({ id: 'recorded', lines: [] });
  scenes.at(-1)!.lines.push(...lines.map((l) => l.id).filter((id) => !placed.has(id)));
  const line = (id: string) => {
    const l = byId.get(id)!, caption = earlier?.captions.get(id);
    return `<Line id="${l.id}" span={${JSON.stringify(l.span)}} words={${JSON.stringify(l.words)}}${caption ? ` text={${JSON.stringify(caption)}}` : ''}>${xml(l.say!)}</Line>`;
  };
  const body = scenes.map((s) => `<Scene id="${s.id}"${s.title !== undefined ? ` title={${JSON.stringify(s.title)}}` : ''}>\n${s.lines.map(line).join('\n')}\n</Scene>`).join('\n');
  const canvas = a.width ? `<Canvas><Preset id="recording" width={${a.width}} height={${a.height}}/></Canvas>` : '';
  const source = `${recordingOutline(lines, a.duration, a.width ? videoCuts(join(work, asset.src)) : [])}import {Doc,Scene,Line,Asset,Canvas,Preset} from '@visotalk/jsx';\nexport default <Doc spec="${SPEC_VERSION}" id="${id}" title={${JSON.stringify(basename(file, extname(file)))}} lang={${JSON.stringify(spoken)}} voice="recording:take" exports={{fps:${a.fps ?? 30}}}>\n${canvas}\n<Asset id="take" kind="${a.width ? 'video' : 'audio'}" src={${JSON.stringify(asset.src)}} analysis={${JSON.stringify(a)}}${asset.cut ? ` trim={${JSON.stringify(asset.cut)}}` : ''} license={{id:'user-owned',obligations:[]}}/>\n${body}\n</Doc>;\n`;
  writeFileSync(target, source);
  if (opt('lang') && spoken !== (lang === 'zh' ? 'zh-CN' : lang)) console.error(`the recording speaks ${spoken === 'en' ? 'English' : 'Chinese'}, not ${lang}: the document is lang="${spoken}"`);
  console.log(`Transcribed ${lines.length} lines into ${target}; original recording preserved${asset.cut ? `, the trimmed one is ${asset.src}` : ''}.`);
}
