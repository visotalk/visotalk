/**
 * Project steps shared by the commands: load, validate, prepare (TTS), ingest assets, build the player.
 * Work files live next to the document in .visotalk/<doc-id>/.
 */
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, cpSync} from 'node:fs';
import {basename, dirname, extname, join, resolve} from 'node:path';
import {build as esbuild} from 'esbuild';
import {parseMarkup, parseSay, sayOf, validate, wordSpans, type Issue, type Loc, type VisoDoc, type VoiceManifest} from '@visotalk/ir';

const HERE = import.meta.dirname;
const RUNTIME = resolve(HERE, '../../runtime/src/index.ts');
const IR = resolve(HERE, '../../ir/src/index.ts');
/** the interpreter with the narration packages: the one `visotalk doctor --fix` made, else whichever python3 is on the PATH */
const PYTHON = () => process.env.VISOTALK_PYTHON ?? 'python3';

export interface Project {
  file: string;
  dir: string;
  work: string;
  doc: VisoDoc;
  /** where each part of the document sits in its source, to point an issue at a line */
  locs: Map<string, Loc>;
}

export function load(file: string): Project {
  const path = resolve(file);
  const text = readFileSync(path, 'utf8');
  if (extname(path) !== '.tsx') throw new Error(`a document is a .tsx file (got ${basename(path)}); JSON documents are no longer read`);
  const markup = parseMarkup(text);
  const doc = markup.doc;
  const work = join(dirname(path), '.visotalk', doc.meta.id);
  mkdirSync(work, {recursive: true});
  return {file: path, dir: dirname(path), work, doc, locs: markup.locs};
}

/**
 * A fingerprint per scene of everything that decides how it looks: the scene, the objects it mentions and the sources of the component
 * modules (every .ts file beside them). A full-size `still` records the fingerprint of the scene it looked at; `render` asks for a
 * still of every scene whose fingerprint has changed since.
 */
export function sceneFingerprints(p: Project): Record<string, string> {
  const dirs = [...new Set((p.doc.components ?? []).filter((c) => c.module.startsWith('.')).map((c) => dirname(resolve(p.dir, c.module))))].sort();
  const sources = dirs.flatMap((d) => (existsSync(d) ? readdirSync(d).filter((f) => f.endsWith('.ts')).sort().map((f) => readFileSync(join(d, f), 'utf8')) : []));
  return Object.fromEntries(p.doc.scenes.map((sc) => {
    const text = JSON.stringify(sc);
    const used = Object.keys(p.doc.objects).filter((id) => text.includes(`"${id}"`)).map((id) => [id, p.doc.objects[id]]);
    return [sc.id, createHash('sha1').update(text).update(JSON.stringify(used)).update(sources.join('\0')).digest('hex').slice(0, 12)];
  }));
}

const reviewsFile = (p: Project) => join(p.work, 'reviews.json');

interface Still {fp: string; beat: string; time: number; line?: string; text?: string; names: string[]}
interface Review {fp: string; ok: boolean; seen: string; designed: string; distinct: string; problems: string}
interface Ledger {stills: Record<string, Still>; reviews: Record<string, Review>}

const readLedger = (p: Project): Ledger => {
  const raw = existsSync(reviewsFile(p)) ? JSON.parse(readFileSync(reviewsFile(p), 'utf8')) : {};
  return {stills: raw.stills ?? {}, reviews: raw.reviews ?? {}};
};
const writeLedger = (p: Project, l: Ledger) => writeFileSync(reviewsFile(p), JSON.stringify(l, null, 1));

/** The phrases of a line that its actions are anchored on: what the sentence names, so what the picture must show at that moment */
export function namedPhrases(line?: {text: string; say?: string}): string[] {
  if (!line?.say) return [];
  const {say, marks} = parseSay(line.say);
  const spans = wordSpans(say);
  return marks.map((m) => say.slice(spans[m.from].start, spans[m.to].end).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''));
}

/** A full-size still of this scene was taken: what it showed, to be answered for with `review` */
export function recordStill(p: Project, sceneId: string, info: Omit<Still, 'fp'>) {
  const l = readLedger(p);
  l.stills[sceneId] = {fp: sceneFingerprints(p)[sceneId], ...info};
  writeLedger(p, l);
}

/**
 * The answers to the questions a still asks. `seen` must name every phrase the line is anchored on (what the picture has to show now),
 * or say something (three words) where the line has none; `designed` is yes or no; `problems` is none or what is wrong. The scene counts as
 * reviewed only with yes, `distinct` yes and none, on the scene as it is now.
 */
export function recordReview(p: Project, sceneId: string, a: {seen?: string; designed?: string; distinct?: string; problems?: string}): {ok: boolean; errors: string[]} {
  const l = readLedger(p);
  const fp = sceneFingerprints(p)[sceneId];
  const errors: string[] = [];
  if (fp === undefined) return {ok: false, errors: [`no scene "${sceneId}"; the scenes are: ${p.doc.scenes.map((x) => x.id).join(', ')}`]};
  const still = l.stills[sceneId];
  if (!still) errors.push(`no full-size still of "${sceneId}" yet: visotalk still ${basename(p.file)} --beat ${sceneId}/<beat>, read the image, then answer`);
  else if (still.fp !== fp) errors.push(`"${sceneId}" changed after its last still: take a new one, read it, then answer`);
  const seen = (a.seen ?? '').trim();
  if (still && still.fp === fp) {
    const missing = still.names.filter((n) => !seen.toLowerCase().includes(n.toLowerCase()));
    if (still.names.length && missing.length) errors.push(`--seen must say where each thing the sentence names is on the image; not mentioned: ${missing.map((m) => `"${m}"`).join(', ')}`);
    if (!still.names.length && seen.split(/\s+/).filter(Boolean).length < 3) errors.push('--seen: say in a few words what the image shows');
  }
  if (a.designed !== 'yes' && a.designed !== 'no') errors.push('--designed yes|no: is this the picture you designed for the scene?');
  if (a.distinct !== 'yes' && a.distinct !== 'no') errors.push('--distinct yes|no: is this clearly more than a slide deck\'s layout and entrance animations would give?');
  if (!(a.problems ?? '').trim()) errors.push('--problems none, or what is small, empty, clipped, overlapping or missing');
  if (errors.length) return {ok: false, errors};
  const ok = a.designed === 'yes' && a.distinct === 'yes' && a.problems!.trim().toLowerCase() === 'none';
  l.reviews[sceneId] = {fp, ok, seen, designed: a.designed!, distinct: a.distinct!, problems: a.problems!.trim()};
  writeLedger(p, l);
  return {ok, errors: []};
}

/** The scenes without a passing review since they last changed */
export function unreviewedScenes(p: Project): string[] {
  const {reviews} = readLedger(p);
  return Object.entries(sceneFingerprints(p)).filter(([id, h]) => reviews[id]?.fp !== h || !reviews[id].ok).map(([id]) => id);
}

/**
 * Words belong to the document: a component draws a picture and the labels that are part of it (node names, hashes), while a sentence or a
 * note it draws is invisible to the document, to `qa`'s word anchors and to translation. Three or more plain words in a string of a component
 * module are reported; a line ending in `// label` says the words are part of the graphic.
 */
export function componentTextIssues(p: Project): Issue[] {
  const dirs = [...new Set((p.doc.components ?? []).filter((c) => c.module.startsWith('.')).map((c) => dirname(resolve(p.dir, c.module))))];
  const issues: Issue[] = [];
  for (const d of dirs) {
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d).filter((x) => x.endsWith('.ts')).sort()) {
      readFileSync(join(d, f), 'utf8').split('\n').forEach((line, i) => {
        const code = line.trim();
        if (/^(\/\/|\*|\/\*|import |export \{)/.test(code) || /\/\/\s*label\s*$/.test(code)) return;
        for (const m of code.matchAll(/(['"])((?:\\.|(?!\1).)*)\1|`([^`$]*)`/g)) {
          const text = (m[2] ?? m[3] ?? '').trim();
          if (/^[\p{L}][\p{L}'’ ,.!?:;-]*$/u.test(text) && text.split(/\s+/).length >= 3) {
            issues.push({code: 'component.text', at: `${basename(d)}/${f}:${i + 1}`, message: `the component draws "${text}": a sentence or note belongs in the document`,
              fix: 'put it in a <Text> or <Chip> in a pattern slot and anchor it on a word with Appear or Set; if the words are part of the graphic itself, end the line with // label'} as Issue);
          }
        }
      });
    }
  }
  return issues;
}

export function check(p: Project): Issue[] {
  return validate(p.doc);
}

/**
 * Narration: normalise text → say, synthesise each line (cached by content hash), align its words (English; cached by
 * clip), write voice.json
 */
export function prepare(p: Project, models = process.env.KOKORO_DIR): VoiceManifest {
  const lines = p.doc.scenes.flatMap((s) => s.beats.flatMap((b) => (b.lines ?? []).map((l) => ({id: l.id, say: sayOf(p.doc, l)}))));
  const voicePath = join(p.work, 'voice.json');
  const audioDir = join(p.work, 'audio');
  mkdirSync(audioDir, {recursive: true});
  if (!lines.length) {
    writeFileSync(voicePath, '{}');
    return {};
  }
  if (!models) throw new Error('narration needs a TTS model: pass --tts-models DIR or set KOKORO_DIR (kokoro-v1.0.onnx + voices-v1.0.bin)');
  const speak = join(p.work, 'speak.json');
  writeFileSync(speak, JSON.stringify({voice: p.doc.voice?.voice ?? 'af_heart', speed: p.doc.voice?.speed ?? 1, lines}));
  const wavDir = join(p.dir, '.visotalk', '.tts-cache');
  const manifest = JSON.parse(execFileSync(PYTHON(), [join(HERE, 'tts_lines.py'), speak, wavDir, models]).toString()) as Record<string, {file: string; duration: number}>;
  const manifestPath = join(p.work, 'clips.json');
  writeFileSync(manifestPath, JSON.stringify(manifest));
  const words = alignWords(p.doc.meta.lang, speak, wavDir, manifestPath);
  const voice: VoiceManifest = {};
  for (const [id, m] of Object.entries(manifest)) {
    const ogg = m.file.replace('.wav', '.ogg');
    if (!existsSync(join(audioDir, ogg))) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(wavDir, m.file), '-c:a', 'libopus', '-b:a', '48k', join(audioDir, ogg)]);
    voice[id] = {duration: m.duration, audio: `audio/${ogg}`, ...(words[id] && {words: words[id]})};
  }
  writeFileSync(voicePath, JSON.stringify(voice, null, 1));
  return voice;
}

/** Word times per line id. Without them the solver places a word anchor by its character position, which is off by up to half a second. */
function alignWords(lang: string, speak: string, wavDir: string, manifest: string): Record<string, NonNullable<VoiceManifest[string]['words']>> {
  if (!lang.toLowerCase().startsWith('en')) {
    console.error(`word alignment is English only: word anchors in "${lang}" are placed by character position`);
    return {};
  }
  try {
    return JSON.parse(execFileSync(PYTHON(), [join(HERE, 'align_lines.py'), speak, wavDir, manifest], {stdio: ['ignore', 'pipe', 'inherit']}).toString());
  } catch (e) {
    console.error(`word alignment failed (${(e as Error).message.split('\n')[0]}): word anchors are placed by character position`);
    return {};
  }
}

function probe(path: string) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries',
    'stream=width,height,r_frame_rate,nb_read_frames:format=duration', '-of', 'json', path]).toString();
  const j = JSON.parse(out);
  const s = j.streams[0];
  const [a, b] = String(s.r_frame_rate).split('/').map(Number);
  return {width: s.width, height: s.height, fps: a / (b || 1), frames: Number(s.nb_read_frames), duration: Number(j.format?.duration)};
}

/**
 * Assets → dist/assets: images copied (size probed), videos ingested to a CFR proxy with ~1 s GOP,
 * analysis filled in. Returns the document with srcs relative to dist.
 */
function ingest(p: Project, dist: string): VisoDoc {
  const doc = structuredClone(p.doc);
  const outDir = join(dist, 'assets');
  mkdirSync(outDir, {recursive: true});
  for (const a of doc.assets ?? []) {
    if (/^https?:/.test(a.src)) continue;
    const src = resolve(p.dir, a.src);
    if (!existsSync(src)) throw new Error(`asset "${a.id}": file not found: ${a.src}`);
    if (a.kind === 'video') {
      const fps = Math.round(probe(src).fps) || 30;
      const proxy = join(outDir, `${a.id}.proxy.mp4`);
      const cache = join(p.dir, '.visotalk', '.ingest', `${a.id}-${basename(src)}.proxy.mp4`);
      mkdirSync(dirname(cache), {recursive: true});
      if (!existsSync(cache)) {
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-g', String(fps), '-keyint_min', String(fps),
          // x264's output depends on its thread count, which defaults to 1.5x the cores; pinned so a proxy (and every frame
          // exported from it) is the same on every machine. 3 is what the regression goldens were recorded with.
          '-sc_threshold', '0', '-fps_mode', 'cfr', '-r', String(fps), '-pix_fmt', 'yuv420p', '-an', '-threads', '3', '-movflags', '+faststart', cache]);
      }
      copyFileSync(cache, proxy);
      const m = probe(proxy);
      a.src = `assets/${a.id}.proxy.mp4`;
      a.proxy = a.src;
      a.analysis = {...(a.analysis ?? {}), width: m.width, height: m.height, fps: m.fps, frames: m.frames, duration: m.duration};
    } else if (a.kind === 'data') {
      // data assets are inlined into the objects that use them (charts render synchronously)
      const rows = JSON.parse(readFileSync(src, 'utf8'));
      for (const o of Object.values(doc.objects)) {
        if (o.type === 'chart' && !Array.isArray(o.data) && o.data.asset === a.id) o.data = rows;
      }
      continue;
    } else {
      const file = `${a.id}${extname(src)}`;
      copyFileSync(src, join(outDir, file));
      a.src = `assets/${file}`;
    }
  }
  return doc;
}

/** Bundle the runtime with this document into dist/ (index.html, app.js, fonts, audio, assets) */
export async function buildPlayer(p: Project, opts: {out?: string; minify?: boolean} = {}): Promise<string> {
  const voicePath = join(p.work, 'voice.json');
  if (!existsSync(voicePath)) prepare(p);
  const dist = resolve(opts.out ?? join(p.work, 'dist'));
  mkdirSync(dist, {recursive: true});
  const doc = ingest(p, dist);
  writeFileSync(join(p.work, 'doc.built.json'), JSON.stringify(doc));
  const entry = join(p.work, 'entry.tsx');
  // L2: each registered module is bundled with the player; its export is the component
  const comps = (p.doc.components ?? []).map((c, i) => ({id: c.id, spec: c.module.startsWith('.') ? resolve(p.dir, c.module) : c.module, name: c.export ?? 'default', i}));
  const imports = comps.map((c) => `import * as m${c.i} from ${JSON.stringify(c.spec)};`).join('\n');
  const registry = comps.map((c) => `${JSON.stringify(c.id)}: m${c.i}[${JSON.stringify(c.name)}]`).join(', ');
  writeFileSync(entry, `import {mount} from '@visotalk/runtime';\nimport doc from './doc.built.json';\nimport voice from './voice.json';\n${imports}\n// eslint-disable-next-line @typescript-eslint/no-explicit-any\nmount({doc: doc as any, voice, components: {${registry}} as any});\n`);
  await esbuild({
    entryPoints: [entry], bundle: true, outdir: dist, entryNames: 'app', format: 'esm', target: 'es2022', minify: opts.minify ?? true,
    jsx: 'automatic', loader: {'.woff2': 'file', '.woff': 'file', '.ttf': 'file'}, assetNames: 'fonts/[name]-[hash]',
    alias: {'@visotalk/runtime': RUNTIME, '@visotalk/ir': IR}, define: {'process.env.NODE_ENV': '"production"'}, logLevel: 'warning',
  });
  if (existsSync(join(p.work, 'audio'))) cpSync(join(p.work, 'audio'), join(dist, 'audio'), {recursive: true});
  const title = p.doc.meta.title.replace(/</g, '&lt;');
  writeFileSync(join(dist, 'index.html'), `<!doctype html>\n<html lang="${p.doc.meta.lang}">\n<head>\n<meta charset="utf-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n<title>${title}</title>\n<link rel="stylesheet" href="app.css" />\n<style>html,body,#root{height:100%}body{margin:0;background:#05070a}</style>\n</head>\n<body><div id="root"></div><script type="module" src="app.js"></script></body>\n</html>\n`);
  return dist;
}
