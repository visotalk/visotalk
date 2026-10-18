/**
 * Project steps shared by the commands: load, validate, prepare (TTS), ingest assets, build the player.
 * Work files live next to the document in .visotalk/<doc-id>/.
 */
import {execFileSync, spawn} from 'node:child_process';
import {closeSync, copyFileSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {basename, dirname, extname, join, resolve} from 'node:path';
import {build as esbuild} from 'esbuild';
import {parseMarkup, sayOf, speechTokens, validate, type Issue, type Line, type Loc, type Scene, type VisoDoc, type VoiceManifest} from '@visotalk/ir';

const HERE = import.meta.dirname;
const RUNTIME = resolve(HERE, '../../runtime/src/index.ts');
const IR = resolve(HERE, '../../ir/src/index.ts');
const JSX = resolve(HERE, '../../jsx/index.ts');
/** the interpreter with the narration packages: the one `visotalk doctor --fix` made, else whichever python3 is on the PATH */
const PYTHON = () => process.env.VISOTALK_PYTHON ?? 'python3';

export interface Project {
  file: string;
  dir: string;
  work: string;
  doc: VisoDoc;
  /** where each part of the document sits in its source, to point an issue at a line */
  locs: Map<string, Loc>;
  /** the module's own code before `export default`: what the parts' React may use */
  prelude: string;
}

export function load(file: string): Project {
  const path = resolve(file);
  const text = readFileSync(path, 'utf8');
  if (extname(path) !== '.tsx') throw new Error(`a document is a .tsx file (got ${basename(path)}); JSON documents are no longer read`);
  const markup = parseMarkup(text);
  const doc = markup.doc;
  const work = join(dirname(path), '.visotalk', doc.meta.id);
  mkdirSync(work, {recursive: true});
  return {file: path, dir: dirname(path), work, doc, locs: markup.locs, prelude: markup.prelude};
}

/** The source files a document's code imports from its own project (relative paths), followed through their own imports */
function localSources(p: Project): Array<{file: string; text: string}> {
  const out = new Map<string, string>();
  const visit = (from: string, text: string) => {
    for (const m of text.matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const base = resolve(dirname(from), m[1]);
      const file = ['', '.ts', '.tsx', '.js', '/index.ts', '/index.tsx'].map((e) => base + e).concat(base.replace(/\.jsx?$/, '.ts'), base.replace(/\.jsx?$/, '.tsx')).find((f) => existsSync(f) && extname(f) !== '' && !out.has(f));
      if (!file) continue;
      const t = readFileSync(file, 'utf8');
      out.set(file, t);
      visit(file, t);
    }
  };
  visit(p.file, p.prelude);
  return [...out].sort(([a], [b]) => (a < b ? -1 : 1)).map(([file, text]) => ({file, text}));
}

/** The words of a line that the scene's animations are anchored on: what the sentence names, so what the picture must show at that moment */
export function anchoredWords(scene: Pick<Scene, 'animations'>, lineId: string): string[] {
  const words = scene.animations.flatMap((a) => ('line' in a.at && a.at.line === lineId && a.at.word !== undefined ? [a.at.word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')] : []));
  return [...new Set(words)];
}

/**
 * A part draws by the engine's clock and by nothing else, or a frame stops being a function of its time: the sources of time and randomness the engine does
 * not control are refused in the module's code and in the project files it imports, and so are CSS animations and transitions (the engine cannot seek them
 * exactly). `useTime` and `random` (from '@visotalk/runtime') are the replacements; a line ending in `// allow` is let through.
 */
const FORBIDDEN: Array<{re: RegExp; what: string; use: string}> = [
  {re: /\bMath\.random\b/, what: 'Math.random', use: "random('key')() from '@visotalk/runtime': the same key gives the same numbers"},
  {re: /\bDate\.now\b|\bnew Date\b|\bperformance\.now\b/, what: 'the wall clock', use: 'useTime() from @visotalk/runtime: seconds since the scene started'},
  {re: /\bsetTimeout\b|\bsetInterval\b|\brequestAnimationFrame\b|\brequestIdleCallback\b/, what: 'a timer', use: 'useTime(): draw as a function of time, never by scheduling'},
  {re: /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b/, what: 'a network call', use: 'an import of the data into the module, or an <Asset> read with useAsset(id)'},
  {re: /@keyframes|\banimation\s*:|\banimationName\b|\banimation-name\b|\btransition\s*:|\btransition(Property|Duration)\b|\btransition-(property|duration)\b/, what: 'a CSS animation or transition', use: 'a <Tween> on the target, or draw by useTime()'},
];

export function codeIssues(p: Project): Issue[] {
  // each chunk knows the line of its file it starts on, so an issue points at the line to edit: a part's body starts where its tag does
  const parts = [...(p.doc.parts ?? []).map((x) => ({x, at: `/parts/${x.id}`})), ...p.doc.scenes.flatMap((s) => s.parts.map((x) => ({x, at: `/scenes/${s.id}/parts/${x.id}`})))];
  const files = [{file: p.file, first: 1, text: p.prelude}, ...parts.map(({x, at}) => ({file: p.file, first: p.locs.get(at)?.line ?? 1, text: x.body ?? ''})),
    ...localSources(p).map((x) => ({...x, first: 1}))];
  const issues: Issue[] = [];
  for (const {file, first, text} of files) {
    text.split('\n').forEach((line, i) => {
      const code = line.trim();
      if (/^(\/\/|\*|\/\*)/.test(code) || /\/\/\s*allow\s*$/.test(code)) return;
      for (const f of FORBIDDEN) if (f.re.test(code)) issues.push({code: 'code.nondeterministic', at: `${basename(file)}:${first + i}`, message: `${f.what} in ${code.slice(0, 60)}: a frame must be a function of its time`, fix: f.use});
    });
  }
  return issues;
}

export function check(p: Project): Issue[] {
  return [...validate(p.doc), ...codeIssues(p)];
}

/**
 * Narration: normalise text → say, synthesise each line (cached by content hash), align its words (English; cached by
 * clip), write voice.json
 */
/**
 * Narration takes minutes the first time (synthesis, then word times), and a picture needs only each line's length: until the real narration exists,
 * `voice.json` holds lengths estimated from the words, marked by `voice.estimated`, and `prepare` replaces it.
 */
const estimateMark = (p: Project) => join(p.work, 'voice.estimated');
/** Written whole or not at all: looks run in parallel, and one that reads while another writes must not see half a file */
const writeWhole = (path: string, text: string) => {
  writeFileSync(`${path}.${process.pid}.tmp`, text);
  renameSync(`${path}.${process.pid}.tmp`, path);
};
const preparePid = (p: Project) => join(p.work, 'prepare.pid');
/** Kokoro speaks about this many words a second at speed 1 (25 lines of two scripts: 2.87) */
const WORDS_PER_SECOND = 2.8;

export const narrationPending = (p: Project) => !existsSync(join(p.work, 'voice.json')) || existsSync(estimateMark(p));

/** Kokoro speaks Mandarin at about this many characters a second at speed 1 (measured: 25 characters in 6.6 s) */
const CHARS_PER_SECOND = 3.8;

/**
 * How a document is spoken: Kokoro's language code and the voice used when the document names none. A voice the document names decides
 * the language (Kokoro's `z` voices are Mandarin, `a` and `b` English), since a voice read in the wrong language is garbled; otherwise
 * the document's `lang` does. English and Mandarin (`zh`, `zh-CN`, `zho`, `cmn`, …) are the languages with a voice; any other
 * is spoken by the English one, as it always was.
 */
export function narrationLanguage(lang: string, voice?: string): {tts: 'en-us' | 'cmn'; voice: string} {
  const mandarin = voice ? voice.startsWith('z') : /^(zh|zho|chi|cmn)([-_]|$)/i.test(lang);
  return mandarin ? {tts: 'cmn', voice: voice ?? 'zf_xiaobei'} : {tts: 'en-us', voice: voice ?? 'af_heart'};
}

/** A line's length from its words (or, in Mandarin, its characters), until the narration is synthesised */
const estimatedDuration = (p: Project, l: Line) => {
  const say = sayOf(p.doc, l);
  const mandarin = narrationLanguage(p.doc.meta.lang, p.doc.voice?.voice).tts === 'cmn';
  const perSecond = (mandarin ? CHARS_PER_SECOND : WORDS_PER_SECOND) * (p.doc.voice?.speed ?? 1);
  const units = mandarin ? speechTokens(say).length : say.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round((units / perSecond) * 100) / 100);
};

/**
 * `voice.estimated` says which lengths in `voice.json` are estimates: empty, all of them; else a list of line ids (lines added after the narration was
 * prepared; the others keep their real lengths). No file: all are real.
 */
const estimatedLines = (p: Project): Set<string> | 'all' | undefined => {
  if (!existsSync(estimateMark(p))) return undefined;
  const text = readFileSync(estimateMark(p), 'utf8').trim();
  return text ? new Set<string>(JSON.parse(text)) : 'all';
};

export function estimateVoice(p: Project): VoiceManifest {
  const path = join(p.work, 'voice.json');
  const marked = estimatedLines(p);
  const kept = existsSync(path) && marked instanceof Set ? (JSON.parse(readFileSync(path, 'utf8')) as Record<string, {duration: number}>) : {};
  const voice: Record<string, {duration: number}> = {};
  const estimated: string[] = [];
  for (const l of p.doc.scenes.flatMap((s) => s.lines)) {
    if (kept[l.id] && !(marked as Set<string>).has(l.id)) voice[l.id] = kept[l.id];
    else {
      voice[l.id] = {duration: estimatedDuration(p, l)};
      estimated.push(l.id);
    }
  }
  writeWhole(path, JSON.stringify(voice, null, 1));
  writeWhole(estimateMark(p), estimated.length === Object.keys(voice).length ? '' : JSON.stringify(estimated));
  return voice as VoiceManifest; // a length and no audio, as the regression suite times its frames
}

/**
 * Lines added since the narration was prepared have no entry in `voice.json`, and a picture cannot be drawn without a length: give them an estimate and mark them
 * estimated, so that `render` waits for `prepare` (the other lines keep their real lengths). Returns the lines filled.
 */
export function estimateMissingVoice(p: Project): string[] {
  const path = join(p.work, 'voice.json');
  if (!existsSync(path)) return [];
  const voice = JSON.parse(readFileSync(path, 'utf8')) as Record<string, {duration: number}>;
  const before = estimatedLines(p);
  const lines = p.doc.scenes.flatMap((s) => s.lines);
  const missing = lines.filter((l) => !voice[l.id]);
  // an estimated line may have been edited since: its length follows its words again
  const redo = lines.filter((l) => voice[l.id] && (before === 'all' || before?.has(l.id)));
  if (!missing.length) {
    if (redo.length) {
      for (const l of redo) voice[l.id] = {duration: estimatedDuration(p, l)};
      writeFileSync(path, JSON.stringify(voice, null, 1));
    }
    return [];
  }
  for (const l of [...missing, ...redo]) voice[l.id] = {duration: estimatedDuration(p, l)};
  writeFileSync(path, JSON.stringify(voice, null, 1));
  writeFileSync(estimateMark(p), before === 'all' ? '' : JSON.stringify([...(before ?? []), ...missing.map((l) => l.id)]));
  return missing.map((l) => l.id);
}

/** The process preparing this project's narration in the background, if it is alive */
export function preparing(p: Project): number | undefined {
  if (!existsSync(preparePid(p))) return undefined;
  const pid = Number(readFileSync(preparePid(p), 'utf8'));
  try {
    process.kill(pid, 0);
    return pid;
  } catch {
    rmSync(preparePid(p), {force: true});
    return undefined;
  }
}

/** `prepare` run by the CLI itself: marks the project as being prepared for as long as it runs */
export function prepareMarked(p: Project, models?: string): VoiceManifest {
  writeFileSync(preparePid(p), String(process.pid));
  try {
    return prepare(p, models);
  } finally {
    rmSync(preparePid(p), {force: true});
  }
}

/** Start `prepare` in a process of its own, logging to `prepare.log`: the picture does not wait for the narration */
export function startPrepare(p: Project, models?: string): number {
  const log = openSync(join(p.work, 'prepare.log'), 'w');
  const child = spawn(process.execPath, [...process.execArgv, process.argv[1], 'prepare', p.file, ...(models ? ['--tts-models', models] : [])], {detached: true, stdio: ['ignore', log, log], env: process.env});
  child.unref();
  closeSync(log);
  writeFileSync(preparePid(p), String(child.pid));
  return child.pid!;
}

/** Block until the background `prepare` is done (at most ten minutes) */
export function waitForPrepare(p: Project) {
  const end = Date.now() + 600_000;
  while (preparing(p) && Date.now() < end) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
}

export function prepare(p: Project, models = process.env.KOKORO_DIR): VoiceManifest {
  const lines = p.doc.scenes.flatMap((s) => s.lines.map((l) => ({id: l.id, say: sayOf(p.doc, l)})));
  const voicePath = join(p.work, 'voice.json');
  const audioDir = join(p.work, 'audio');
  mkdirSync(audioDir, {recursive: true});
  if (!lines.length) {
    writeFileSync(voicePath, '{}');
    return {};
  }
  if (!models) throw new Error('narration needs a TTS model: pass --tts-models DIR or set KOKORO_DIR (kokoro-v1.0.onnx + voices-v1.0.bin)');
  const speak = join(p.work, 'speak.json');
  const spoken = narrationLanguage(p.doc.meta.lang, p.doc.voice?.voice);
  writeFileSync(speak, JSON.stringify({voice: spoken.voice, lang: spoken.tts, speed: p.doc.voice?.speed ?? 1, lines}));
  const wavDir = join(p.dir, '.visotalk', '.tts-cache');
  const manifest = JSON.parse(execFileSync(PYTHON(), [join(HERE, 'tts_lines.py'), speak, wavDir, models]).toString()) as Record<string, {file: string; duration: number}>;
  const manifestPath = join(p.work, 'clips.json');
  writeFileSync(manifestPath, JSON.stringify(manifest));
  const words = alignWords(p.doc.meta.lang, speak, wavDir, manifestPath);
  const voice: VoiceManifest = {};
  for (const [id, m] of Object.entries(manifest)) {
    const aac = m.file.replace('.wav', '.m4a'); // AAC plays everywhere; Ogg Opus does not play on every iPhone
    if (!existsSync(join(audioDir, aac))) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(wavDir, m.file), '-c:a', 'aac', '-b:a', '64k', join(audioDir, aac)]);
    voice[id] = {duration: m.duration, audio: `audio/${aac}`, ...(words[id] && {words: words[id]})};
  }
  writeFileSync(voicePath, JSON.stringify(voice, null, 1));
  rmSync(estimateMark(p), {force: true});
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

/**
 * Assets → dist/assets: files copied, with srcs rewritten relative to dist. Returns the document with the bodies of its parts left out (the player
 * gets them from the module). A video asset is copied like an image, and what ffprobe found about it (`fps`, `frames`: it must have a constant frame rate)
 * goes into its `analysis` and into `dist/media.json`, which the exporter decodes from.
 */
function ingest(p: Project, dist: string): VisoDoc {
  const doc = structuredClone(p.doc);
  for (const part of [...(doc.parts ?? []), ...doc.scenes.flatMap((s) => s.parts)]) delete part.body;
  const outDir = join(dist, 'assets');
  mkdirSync(outDir, {recursive: true});
  const media: Record<string, {src: string; fps: number; frames: number}> = {};
  for (const a of doc.assets ?? []) {
    if (/^https?:/.test(a.src)) continue;
    const src = resolve(p.dir, a.src);
    if (!existsSync(src)) throw new Error(`asset "${a.id}": file not found: ${a.src}`);
    const file = `${a.id}${extname(src)}`;
    copyFileSync(src, join(outDir, file));
    a.src = `assets/${file}`;
    if (a.kind === 'video') {
      const probe = Object.fromEntries(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate,nb_frames,duration', '-of', 'default=nw=1', src], {encoding: 'utf8'}).trim().split('\n').map((l) => l.split('=')));
      const [num, den] = String(probe.r_frame_rate).split('/').map(Number);
      const fps = num / (den || 1);
      const frames = Number(probe.nb_frames) || Math.round(Number(probe.duration) * fps);
      if (!(fps > 0) || !(frames > 0)) throw new Error(`asset "${a.id}": cannot read the frame rate and length of ${a.src}`);
      a.analysis = {...a.analysis, fps, frames};
      media[a.id] = {src: a.src, fps, frames};
    }
  }
  if (Object.keys(media).length) writeFileSync(join(dist, 'media.json'), JSON.stringify(media));
  return doc;
}

/** Bundle the runtime with this document into dist/ (index.html, app.js, fonts, audio, assets) */
export async function buildPlayer(p: Project, opts: {out?: string; minify?: boolean; artifact?: boolean} = {}): Promise<string> {
  const voicePath = join(p.work, 'voice.json');
  if (!existsSync(voicePath)) prepare(p);
  const dist = resolve(opts.out ?? join(p.work, 'dist'));
  mkdirSync(dist, {recursive: true});
  const doc = ingest(p, dist);
  writeFileSync(join(p.work, 'doc.built.json'), JSON.stringify(doc));
  const entry = join(p.work, 'entry.tsx');
  // an artifact page serves no .m4a: its narration is MP3, under the same names
  const artifactVoice = opts.artifact ? Object.fromEntries(Object.entries(JSON.parse(readFileSync(voicePath, 'utf8')) as VoiceManifest).map(([id, v]) => [id, v.audio ? {...v, audio: v.audio.replace(/\.m4a$/, '.mp3')} : v])) : undefined;
  if (artifactVoice) writeFileSync(join(p.work, 'voice.artifact.json'), JSON.stringify(artifactVoice));
  // the document is also a module: its parts' React runs in the player
  writeFileSync(entry, `import {mount} from '@visotalk/runtime';\nimport doc from './doc.built.json';\nimport voice from './${artifactVoice ? 'voice.artifact.json' : 'voice.json'}';\nimport * as module from ${JSON.stringify(p.file)};\n// eslint-disable-next-line @typescript-eslint/no-explicit-any\nmount({doc: doc as any, voice, module: module as any});\n`);
  // one copy of React for the runtime and for the parts, wherever the document lives
  const req = createRequire(RUNTIME);
  const react = Object.fromEntries(['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client'].map((n) => [n, req.resolve(n)]));
  await esbuild({
    entryPoints: [entry], bundle: true, outdir: dist, entryNames: 'app', format: 'esm', target: 'es2022', minify: opts.minify ?? true,
    jsx: 'automatic', loader: {'.woff2': 'file', '.woff': 'file', '.ttf': 'file'}, assetNames: 'fonts/[name]-[hash]',
    alias: {'@visotalk/runtime': RUNTIME, '@visotalk/ir': IR, '@visotalk/jsx': JSX, ...react}, define: {'process.env.NODE_ENV': '"production"'}, logLevel: 'warning',
  });
  // only the clips this document's voice manifest names: the work directory also holds those of earlier versions of the lines
  const voice = JSON.parse(readFileSync(voicePath, 'utf8')) as VoiceManifest;
  for (const v of Object.values(voice)) {
    if (!v.audio) continue;
    mkdirSync(dirname(join(dist, v.audio)), {recursive: true});
    if (opts.artifact) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(p.work, v.audio), '-c:a', 'libmp3lame', '-b:a', '64k', join(dist, v.audio.replace(/\.m4a$/, '.mp3'))]);
    else copyFileSync(join(p.work, v.audio), join(dist, v.audio));
  }
  const title = p.doc.meta.title.replace(/</g, '&lt;');
  if (opts.artifact) {
    // what the Artifact tool publishes: `player.html` as the page and `artifact.json` listing the files beside it (fonts and the stylesheet stay out: an artifact loads no stylesheet of its own)
    writeFileSync(join(dist, 'player.html'), `<title>${title}</title>\n<style>html,body,#root{height:100%}body{margin:0;background:#05070a}</style>\n<div id="root"></div>\n<script type="module" src="app.js"></script>\n`);
    const files = ['app.js', ...Object.values(artifactVoice!).flatMap((v) => (v.audio ? [v.audio] : [])), ...(existsSync(join(dist, 'assets')) ? readdirSync(join(dist, 'assets')).map((f) => `assets/${f}`) : [])];
    writeFileSync(join(dist, 'artifact.json'), JSON.stringify({page: 'player.html', title: p.doc.meta.title, files}, null, 1));
    return dist;
  }
  writeFileSync(join(dist, 'index.html'), `<!doctype html>\n<html lang="${p.doc.meta.lang}">\n<head>\n<meta charset="utf-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n<title>${title}</title>\n<link rel="stylesheet" href="app.css" />\n<style>html,body,#root{height:100%}body{margin:0;background:#05070a}</style>\n</head>\n<body><div id="root"></div><script type="module" src="app.js"></script></body>\n</html>\n`);
  return dist;
}
