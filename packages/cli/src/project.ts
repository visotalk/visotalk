/**
 * Project steps shared by the commands: load, validate, prepare (TTS), ingest assets, build the player.
 * Work files live next to the document in .visotalk/<doc-id>/.
 */
import {execFileSync, spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {closeSync, copyFileSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {basename, dirname, extname, join, relative, resolve, sep} from 'node:path';
import {build as esbuild, type PluginBuild} from 'esbuild';
import {localImports} from '@visotalk/ir/bundle';
import {clipKey, kokoroKey} from './clip_key.ts';
import {fontPlan, writeFontFaces} from './fonts.ts';
import {checkOverlay, DEFAULT_THEME, ID_PATTERN, localize, mediaHints, type Overlay, parseMarkup, sayOf, solve, soundGain, speechTokens, themeTokens, validate, type Issue, type Line, type Loc, type Scene, type VisoDoc, type VoiceManifest} from '@visotalk/ir';
import {ENV_HZ, muxAudio} from '@visotalk/exporter';

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
  /** each tag of the skeleton and where it is first written */
  tags: Map<string, Loc>;
  /** the language overlay the document was localized with (`--lang`): its file, its text and what is wrong with it */
  overlay?: {lang: string; file: string; text: string; issues: Issue[]};
}

/** A document, in its own language or, with `lang`, in the language of its overlay `doc.<lang>.json` beside it */
export function load(file: string, lang?: string): Project {
  const path = resolve(file);
  const text = readFileSync(path, 'utf8');
  if (extname(path) !== '.tsx') throw new Error(`a document is a .tsx file (got ${basename(path)}); JSON documents are no longer read`);
  const markup = parseMarkup(text);
  let doc = markup.doc, overlay: Project['overlay'];
  // the id names the work directory, and a document may come from anywhere: never a path
  if (!ID_PATTERN.test(doc.meta.id)) throw new Error(`the document id "${doc.meta.id}" is not a valid id (${path})`);
  if (lang) {
    const of = path.replace(/\.tsx$/, `.${lang}.json`);
    if (!existsSync(of)) throw new Error(`no ${basename(of)} beside ${basename(path)}: a language of a document is an overlay file there (see the IR spec, "Languages")`);
    const ot = readFileSync(of, 'utf8');
    const o = JSON.parse(ot) as Overlay;
    const issues = checkOverlay(doc, o);
    if (o.lang !== lang) issues.unshift({code: 'overlay.lang', at: '/lang', message: `${basename(of)} says it is in "${o.lang}"`});
    overlay = {lang, file: of, text: ot, issues};
    doc = localize(doc, o);
  }
  const work = join(dirname(path), '.visotalk', doc.meta.id);
  mkdirSync(work, {recursive: true});
  return {file: path, dir: dirname(path), work, doc, locs: markup.locs, prelude: markup.prelude, tags: markup.tags, ...(overlay && {overlay})};
}

/** The source files a document's code imports from its own project (relative paths), followed through their own imports */
function localSources(p: Project): Array<{file: string; text: string}> {
  const out = new Map<string, string>();
  const isFile = (rel: string) => statSync(resolve(p.dir, rel), {throwIfNoEntry: false})?.isFile() ?? false;
  const visit = (from: string, text: string) => {
    for (const rel of localImports(relative(p.dir, from).split(sep).join('/'), text, isFile)) {
      const file = resolve(p.dir, rel);
      if (out.has(file)) continue;
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
  return [...issues, ...unboundTags(p, parts.map(({x, at}) => ({first: p.locs.get(at)?.line ?? 1, text: x.body ?? ''})))];
}

/** The names the module's own code binds: what it imports, and what it declares at the start of a statement */
function boundNames(prelude: string): Set<string> {
  const names = new Set<string>();
  for (const m of prelude.matchAll(/\bimport\s+([^;'"]*?)\s+from\s+['"]/g))
    for (const item of m[1].replace(/[{}]/g, ',').split(',')) {
      const name = /(?:^|\bas\s+)([A-Za-z_$][\w$]*)\s*$/.exec(item.trim())?.[1];
      if (name) names.add(name);
    }
  for (const m of prelude.matchAll(/\b(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  return names;
}

/**
 * The engine reads the skeleton without running it, so it knows a `<Asset>` by its name; the player runs the module, where a tag nothing imports or
 * defines stops the page ("Asset is not defined") before anything is drawn. Every capitalised tag, of the skeleton and of a part's React, must be bound.
 */
function unboundTags(p: Project, bodies: Array<{first: number; text: string}>): Issue[] {
  const bound = boundNames(p.prelude);
  const issues: Issue[] = [];
  const seen = new Set<string>();
  const report = (name: string, line: number, fix: string) => {
    if (bound.has(name) || seen.has(name)) return;
    seen.add(name);
    issues.push({code: 'code.unbound', at: `${basename(p.file)}:${line}`, message: `<${name}> is used, but nothing before \`export default\` imports or defines ${name}: the player stops with "${name} is not defined"`, fix});
  };
  for (const [name, loc] of p.tags) if (/^[A-Z]/.test(name)) report(name, loc.line, `add ${name} to the import from '@visotalk/jsx'`);
  // a tag in a part's React: `<Name` where an expression may start, not a type argument (`useRef<Name>`)
  for (const {first, text} of bodies)
    text.split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/(?<![\w$.)\]])<([A-Z][\w$]*)(?=[\s/>.])/g)) report(m[1], first + i, `import ${m[1]} or define it before \`export default\``);
    });
  return issues;
}

export function check(p: Project): Issue[] {
  return [...(p.overlay?.issues ?? []), ...validate(p.doc), ...codeIssues(p)];
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

/** MiniMax speaks Mandarin at about this many characters a second at speed 1 (two scripts: 4.42 and 4.43; Japanese ran at 5.0 on one, with `Japanese_IntellectualSenior`); the estimate until a provider has spoken */
const CHARS_PER_SECOND = 4.4;

/** Chinese, Japanese and Korean: the languages written without spaces, which Kokoro does not speak well enough to ship */
export const isCjk = (lang: string) => /^(zh|zho|chi|cmn|ja|jpn|ko|kor)([-_]|$)/i.test(lang);

/** The Kokoro voice used when the document names none. Kokoro is the English voice: a CJK document names a provider's voice (`voice="minimax:…"`). */
const KOKORO_VOICE = 'af_heart';

/** What to say when a document has nothing that can speak it yet */
export const narrationHint = (p: Project) => (isCjk(p.doc.meta.lang) && !voiceProvider(p.doc.voice?.voice)
  ? `a "${p.doc.meta.lang}" document needs a voice provider, not Kokoro (English only): voice="minimax:<a broadcaster voice of that language>" on <Doc> (the skill lists them), and MINIMAX_API_KEY in the environment`
  : 'no TTS model: --tts-models or KOKORO_DIR');

/** A line's length from its words (or, in a CJK language, its characters), until the narration is synthesised */
const estimatedDuration = (p: Project, l: Line) => {
  const say = sayOf(p.doc, l);
  const cjk = isCjk(p.doc.meta.lang);
  const perSecond = (cjk ? CHARS_PER_SECOND : WORDS_PER_SECOND) * (p.doc.voice?.speed ?? 1);
  const units = cjk ? speechTokens(say).length : say.split(/\s+/).filter(Boolean).length;
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
  if(p.doc.voice?.voice?.startsWith('recording:'))return prepare(p);
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
  const child = spawn(process.execPath, [...process.execArgv, process.argv[1], 'prepare', p.file, ...(p.overlay ? ['--lang', p.overlay.lang] : []), ...(models ? ['--tts-models', models] : [])], {detached: true, stdio: ['ignore', log, log], env: process.env});
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

/** `voice="minimax:English_Trustworthy_Man"`: a third-party provider and its voice; a bare name is a Kokoro voice */
export const voiceProvider = (voice?: string): {provider: string; voice: string} | undefined => {
  const i = voice?.indexOf(':') ?? -1;
  return voice && i > 0 ? {provider: voice.slice(0, i), voice: voice.slice(i + 1)} : undefined;
};

/** A film with no lines (music and pictures only) has nothing to speak: its narration is ready as soon as `prepare` writes the empty manifest */
export const speaks = (p: Project) => p.doc.scenes.some((s) => s.lines.length > 0);

/** What can speak this document: a Kokoro model directory (English only), or the voice provider the document names; undefined when neither, and `'none'` for a document with no lines */
export const narrationSource = (p: Project, models?: string) => (!speaks(p) ? 'none' : (isCjk(p.doc.meta.lang) ? undefined : models || process.env.KOKORO_DIR) || voiceProvider(p.doc.voice?.voice)?.provider);

/** Check the spoken words before any cache is reused: a language tag cannot make CJK speech English. */
export function checkNarrationVoice(p: Project): void {
  if (voiceProvider(p.doc.voice?.voice)) return;
  const line = p.doc.scenes.flatMap((s) => s.lines).find((l) => isCjk(p.doc.meta.lang) || /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(sayOf(p.doc, l)));
  if (line) throw new Error(`line "${line.id}" with voice "${p.doc.voice?.voice ?? KOKORO_VOICE}": Kokoro is English only; CJK narration needs a voice provider that speaks its language. Set the correct lang and a real provider voice ID (voice="minimax:<voice>"), then run prepare again; do not set lang="en" or switch to Kokoro to bypass a provider error. A local provider needs its credentials configured.`);
}

export function prepare(p: Project, models = process.env.KOKORO_DIR): VoiceManifest {
  checkNarrationVoice(p);
  if(p.doc.voice?.voice?.startsWith('recording:')){
    const issues=validate(p.doc);if(issues.length)throw new Error(issues.map((i)=>i.message).join('\n'));
    const asset=p.doc.assets!.find((a)=>a.id===p.doc.voice!.voice.slice(10))!;
    if(!existsSync(resolve(p.dir,asset.src)))throw new Error('The original recording is missing.');
    const voice:VoiceManifest=Object.fromEntries(p.doc.scenes.flatMap((s)=>s.lines.map((l)=>[l.id,{duration:l.span!.end-l.span!.start,audio:'',words:l.words,key:createHash('sha256').update(JSON.stringify([asset.src,l.say,l.span,l.words])).digest('hex')}])));
    writeFileSync(join(p.work,'voice.json'),JSON.stringify(voice));rmSync(estimateMark(p),{force:true});return voice;
  }
  const lines = p.doc.scenes.flatMap((s) => s.lines.map((l) => ({id: l.id, say: sayOf(p.doc, l)})));
  const voicePath = join(p.work, 'voice.json');
  const audioDir = join(p.work, 'audio');
  mkdirSync(audioDir, {recursive: true});
  if (!lines.length) {
    writeFileSync(voicePath, '{}');
    rmSync(estimateMark(p), {force: true});
    return {};
  }
  const third = voiceProvider(p.doc.voice?.voice);
  const kokoro = p.doc.voice?.voice ?? KOKORO_VOICE;
  const speed = p.doc.voice?.speed ?? 1;
  // a provider's own language tag (zh-CN, en) goes through as written: it is what the provider's voices are listed under
  const keyOf = (say: string) => (third ? clipKey({...third, speed, lang: p.doc.meta.lang}, say) : kokoroKey(kokoro, speed, say));
  // A line whose clip was made from these very words, voice and speed is kept as it is, whoever made it (a bundle brings its clips, and a provider bills each one).
  const before: VoiceManifest = existsSync(voicePath) ? JSON.parse(readFileSync(voicePath, 'utf8')) : {};
  const kept = (l: {id: string; say: string}) => before[l.id]?.key === keyOf(l.say) && before[l.id].audio && existsSync(join(p.work, before[l.id].audio));
  const todo = lines.filter((l) => !kept(l));
  const voice: VoiceManifest = {};
  if (todo.length) {
    if (!third && !models) throw new Error('narration needs a TTS model: pass --tts-models DIR or set KOKORO_DIR (kokoro-v1.0.onnx + voices-v1.0.bin), or name a voice provider: voice="minimax:<voice>" (also elevenlabs, volcengine, openai)');
    const speak = join(p.work, 'speak.json');
    const wavDir = join(p.dir, '.visotalk', '.tts-cache');
    let manifest: Record<string, {file: string; duration: number}>;
    if (third) {
      writeFileSync(speak, JSON.stringify({...third, lang: p.doc.meta.lang, speed, lines: todo}));
      // the package ships the script built (voice_lines.js); in the repository it is the TypeScript source, which the flags of this process can run
      const script = existsSync(join(HERE, 'voice_lines.js')) ? join(HERE, 'voice_lines.js') : join(HERE, 'voice_lines.ts');
      manifest = JSON.parse(execFileSync(process.execPath, [...process.execArgv, script, speak, wavDir], {cwd: p.dir, stdio: ['ignore', 'pipe', 'inherit']}).toString());
    } else {
      writeFileSync(speak, JSON.stringify({voice: kokoro, speed, lines: todo}));
      manifest = JSON.parse(execFileSync(PYTHON(), [join(HERE, 'tts_lines.py'), speak, wavDir, models!]).toString());
    }
    const manifestPath = join(p.work, 'clips.json');
    writeFileSync(manifestPath, JSON.stringify(manifest));
    const words = alignWords(p.doc.meta.lang, speak, wavDir, manifestPath, manifest);
    for (const [id, m] of Object.entries(manifest)) {
      const aac = m.file.replace('.wav', '.m4a'); // AAC plays everywhere; Ogg Opus does not play on every iPhone
      if (!existsSync(join(audioDir, aac))) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(wavDir, m.file), '-c:a', 'aac', '-b:a', '64k', join(audioDir, aac)]);
      voice[id] = {duration: m.duration, audio: `audio/${aac}`, key: m.file.replace(/\.wav$/, ''), ...(words[id] && {words: words[id]})};
    }
  }
  const whole: VoiceManifest = Object.fromEntries(lines.map((l) => [l.id, voice[l.id] ?? before[l.id]]));
  writeFileSync(voicePath, JSON.stringify(whole, null, 1));
  rmSync(estimateMark(p), {force: true});
  return whole;
}

type Words = NonNullable<VoiceManifest[string]['words']>;

/**
 * Word times per line id: those a provider returned (the aligner's cache entries), else the aligner's, which is English only. Without them the solver
 * places a word anchor by its character position, which is off by up to half a second.
 */
function alignWords(lang: string, speak: string, wavDir: string, manifestPath: string, manifest: Record<string, {file: string}>): Record<string, Words> {
  const cached: Record<string, Words> = {};
  for (const [id, m] of Object.entries(manifest)) {
    const file = join(wavDir, m.file.replace(/\.wav$/, '.words2.json'));
    if (existsSync(file)) cached[id] = JSON.parse(readFileSync(file, 'utf8'));
  }
  if (Object.keys(cached).length === Object.keys(manifest).length) return cached;
  if (!lang.toLowerCase().startsWith('en')) {
    console.error(`word alignment is English only: word anchors in "${lang}" are placed by character position`);
    return cached;
  }
  try {
    return JSON.parse(execFileSync(PYTHON(), [join(HERE, 'align_lines.py'), speak, wavDir, manifestPath], {stdio: ['ignore', 'pipe', 'inherit']}).toString());
  } catch (e) {
    console.error(`word alignment failed (${(e as Error).message.split('\n')[0]}): word anchors are placed by character position`);
    return cached;
  }
}

/** The length of an audio file in seconds, from ffprobe: what ends a single play of it in the solver */
function audioLength(id: string, name: string, file: string): number {
  const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], {encoding: 'utf8'}).trim());
  if (!(duration > 0)) throw new Error(`asset "${id}": cannot read the length of ${name}`);
  return duration;
}

/** The name of a built file that holds `bytes`: twelve hex digits of their SHA-256 (the play route keeps such a name for good, `playCacheControl`) */
const contentName = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex').slice(0, 12);

/**
 * Assets → dist/assets, each named by its content (`assets/<sha256:12>.<ext>`), with srcs rewritten relative to dist. Returns the document with the bodies of its parts left out (the player
 * gets them from the module), plus `x-media`: which parts show each picture and clip, and the size of each file, for the player to fetch ahead by (`mediaPlan`). An audio asset is copied too, except for an artifact, whose sounds are in its one mixed track (see `buildPlayer`). A video asset is remuxed with its index first (MP4 and MOV), and what ffprobe found about it (`fps`, `frames`: it must have a constant frame rate)
 * goes into its `analysis` and into `dist/media.json`, which the exporter decodes from.
 */
function ingest(p: Project, dist: string, artifact = false): VisoDoc {
  const doc = structuredClone(p.doc);
  for (const part of [...(doc.parts ?? []), ...doc.scenes.flatMap((s) => s.parts)]) delete part.body;
  const outDir = join(dist, 'assets');
  mkdirSync(outDir, {recursive: true});
  const media: Record<string, {src: string; fps: number; frames: number}> = {};
  const sizes: Record<string, number> = {};
  for (const a of doc.assets ?? []) {
    if (/^https?:/.test(a.src)) continue;
    const src = resolve(p.dir, a.src);
    if (!existsSync(src)) throw new Error(`asset "${a.id}": file not found: ${a.src}`);
    if (artifact && a.kind === 'audio') {
      // an artifact's sounds are in its one mixed track, but the document still needs their lengths: a single play ends with its file
      a.analysis = {...a.analysis, duration: audioLength(a.id, a.src, src)};
      continue;
    }
    // built under a name of its own, then named by what it holds: a file that is the same in two builds has the same name in both, and a browser keeps it
    const tmp = join(outDir, `${a.id}.tmp${extname(src)}`);
    // A video is remuxed, not re-encoded, so its index (moov) comes before its frames: a host that does not answer range requests,
    // a Claude artifact among them, otherwise never gives the browser the index, and the video stays blank.
    if (a.kind === 'video' && /\.(mp4|m4v|mov)$/i.test(src)) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-map', '0:v:0', '-map', '0:a?', '-c', 'copy', '-movflags', '+faststart', tmp]);
    else copyFileSync(src, tmp);
    const file = `${contentName(readFileSync(tmp))}${extname(src)}`;
    renameSync(tmp, join(outDir, file));
    a.src = `assets/${file}`;
    sizes[a.id] = statSync(join(outDir, file)).size;
    // an audio file's length is what ends a single play of it in the solver
    if (a.kind === 'audio') a.analysis = {...a.analysis, duration: audioLength(a.id, a.src, src)};
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
  // what the player fetches ahead by: which parts show each picture and clip (read from the bodies deleted above) and how big each file is
  const hints = mediaHints(p.doc, p.prelude, sizes);
  if (hints.uses || hints.sizes) doc['x-media'] = hints;
  return doc;
}

/**
 * The film's whole soundtrack, as `render` mixes it (`muxAudio`): every narration clip at its line, every sound with its gain envelope from `soundGain`, written as
 * `soundtrack.<hash>.mp3` in `dist`. A page plays it as one track: one file to fetch, every sound already in its place, and the page sounds as the video does. Returns its
 * name, or undefined when the film is silent.
 */
async function mixSoundtrack(p: Project, doc: VisoDoc, voice: VoiceManifest, dist: string): Promise<string | undefined> {
  const c = solve(doc, voice);
  const narration = c.recording?[{at:0,duration:c.duration,src:resolve(p.dir,p.doc.assets!.find((a)=>a.id===p.doc.voice!.voice.slice(10))!.src)}]:c.scenes.flatMap((s) => s.lines).filter((l) => l.audio).map((l) => ({at: l.from, duration: l.duration, src: join(p.work, l.audio!)}));
  const files = Object.fromEntries((p.doc.assets ?? []).map((a) => [a.id, resolve(p.dir, a.src)]));
  const sounds = c.sounds.map((s) => ({src: files[s.asset], at: s.start, end: s.end, loop: s.loop}));
  if (!narration.length && !sounds.length) return undefined;
  const count = Math.ceil(c.duration * ENV_HZ);
  const envelopes = c.sounds.map((s) => Array.from({length: count}, (_, k) => soundGain(c, s, k / ENV_HZ)));
  const tmp = join(dist, 'soundtrack.mp3');
  await muxAudio(undefined, tmp, 0, c.duration, {narration, sounds, envelopes}, '');
  const name = `soundtrack.${contentName(readFileSync(tmp))}.mp3`;
  renameSync(tmp, join(dist, name));
  return name;
}

/** Export the same narration, effects and mixed buses used by the player, without drawing frames. */
export async function exportAudio(p:Project,doc:VisoDoc,voice:VoiceManifest,out:string,bus:'narration'|'mix'|'effects'){
 const c=solve(doc,voice),narration=c.recording?[{at:0,duration:c.duration,src:resolve(p.dir,p.doc.assets!.find((a)=>a.id===p.doc.voice!.voice.slice(10))!.src)}]:c.scenes.flatMap((s)=>s.lines).filter((l)=>l.audio).map((l)=>({at:l.from,duration:l.duration,src:join(p.work,l.audio!)}));
 const sounds=c.sounds.map((s)=>({src:resolve(p.dir,p.doc.assets!.find((a)=>a.id===s.asset)!.src),at:s.start,end:s.end,loop:s.loop}));
 const envelopes=c.sounds.map((s)=>Array.from({length:Math.ceil(c.duration*ENV_HZ)},(_,k)=>soundGain(c,s,k/ENV_HZ)));
 await muxAudio(undefined,out,0,c.duration,{narration:bus==='effects'?[]:narration,sounds:bus==='narration'?[]:sounds,envelopes:bus==='narration'?[]:envelopes},'');return c;
}

/** An artifact page has no query string of its own: the theme it plays in is set before the player reads it */
const artifactQuery = (o: {theme?: string}) => (o.theme ? `<script>history.replaceState(null, '', '?${new URLSearchParams({theme: o.theme})}')</script>\n` : '');

/**
 * three.js is the engine's, pinned beside React: a part that imports `three` or `three/addons/…` gets the engine's copy, wherever the
 * document lives and whatever it has installed, so a style that draws in 3D works in every work, the hosted worker and a bundle. It joins the document's
 * bundle only when the document imports it, and is not in the runtime file every player loads. Being a package, its code is not a project file, so
 * the clock check (`codeIssues`) does not read it: a part still draws each frame from the clock, never from three's own loop.
 */
const THREE = {
  name: 'three',
  setup(build: PluginBuild) {
    const base = dirname(RUNTIME);
    build.onResolve({filter: /^three(\/|$)/}, (args) => args.resolveDir === base ? undefined : build.resolve(args.path, {kind: args.kind, resolveDir: base}));
  },
};

/** What the runtime entry puts in `globalThis.__visotalkRuntime`, and the packages the document's bundle takes from it: the key, the package, and whether it is a CommonJS package (a `default` that is the whole of it) */
const SHARED = [
  {key: 'runtime', spec: '@visotalk/runtime', cjs: false},
  {key: 'jsx', spec: '@visotalk/jsx', cjs: false},
  {key: 'react', spec: 'react', cjs: true},
  {key: 'jsxRuntime', spec: 'react/jsx-runtime', cjs: true},
  {key: 'reactDom', spec: 'react-dom', cjs: true},
  {key: 'reactDomClient', spec: 'react-dom/client', cjs: true},
] as const;

/**
 * The runtime is built once per engine, apart from any document, and the document's bundle must still import from it by name (`import {Video} from '@visotalk/runtime'`):
 * the entry of the runtime bundle (everything in `SHARED` in `globalThis.__visotalkRuntime`) and, for each package, a shim that exports every name the package has from
 * that global. Returns the entry, the aliases that give the runtime bundle one copy of React (`alias`), and the shims the document's bundle is aliased to (`shimmed`).
 */
async function runtimeShims(work: string): Promise<{entry: string; alias: Record<string, string>; shimmed: Record<string, string>}> {
  const req = createRequire(RUNTIME);
  // one copy of React for the runtime and for the parts, wherever the document lives
  const alias = {'@visotalk/runtime': RUNTIME, '@visotalk/ir': IR, '@visotalk/jsx': JSX, ...Object.fromEntries(['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client'].map((n) => [n, req.resolve(n)]))};
  const dir = join(work, 'shims');
  mkdirSync(dir, {recursive: true});
  const entry = join(dir, 'runtime.ts');
  writeFileSync(entry, `${SHARED.map((m) => `import * as ${m.key} from '${m.spec}';`).join('\n')}\nObject.assign(globalThis, {__visotalkRuntime: {${SHARED.map((m) => m.key).join(', ')}}});\n`);
  const shimmed: Record<string, string> = {};
  for (const m of SHARED) {
    // the names of a package of ours are what its entry exports (esbuild says); a CommonJS package's are what it has
    let names: string[];
    if (m.cjs) names = Object.keys(req(m.spec)).filter((n) => n !== 'default');
    else {
      const probe = await esbuild({entryPoints: [alias[m.spec]], bundle: true, write: false, metafile: true, outdir: join(dir, 'probe'), format: 'esm', jsx: 'automatic', loader: {'.woff2': 'empty', '.woff': 'empty', '.ttf': 'empty', '.css': 'empty'}, alias, logLevel: 'silent'});
      names = Object.values(probe.metafile.outputs)[0].exports.filter((n) => n !== 'default');
    }
    const file = join(dir, `${m.key}.js`);
    writeFileSync(file, `const m = globalThis.__visotalkRuntime.${m.key};\nexport const {${names.join(', ')}} = m;\n${m.cjs ? 'export default m.default;\n' : ''}`);
    shimmed[m.spec] = file;
  }
  return {entry, alias, shimmed};
}

/**
 * Bundle the runtime with this document into dist/. Every file but the page is named by its content (`assets/<hash>.<ext>`, `audio/<hash>.m4a`,
 * `fonts/<name>-<hash>.woff2`), and the code is two files: `runtime.<hash>.js`, the runtime with React and the IR, the same for every document one engine version builds,
 * and `app.<hash>.js`, this document's module and data (with `app.<hash>.css` beside it). A file that is the same in two builds has the same name in both,
 * so a browser, or a store, that has it needs it no more. The page (`index.html`, or `player.html` for an artifact) is the one fixed name.
 */
export async function buildPlayer(p: Project, opts: {out?: string; minify?: boolean; artifact?: boolean; theme?: string} = {}): Promise<string> {
  checkNarrationVoice(p);
  const voicePath = join(p.work, 'voice.json');
  if (!existsSync(voicePath)) prepare(p);
  const dist = resolve(opts.out ?? join(p.work, 'dist'));
  mkdirSync(dist, {recursive: true});
  // what an earlier build left under names of its own would be published with this one
  for (const dir of ['assets', 'audio', 'fonts']) rmSync(join(dist, dir), {recursive: true, force: true});
  for (const f of readdirSync(dist)) if (/^(app|runtime|soundtrack)\.[0-9a-f]{12}\.(js|css|mp3)$/.test(f)) rmSync(join(dist, f));
  const doc = ingest(p, dist, opts.artifact);
  // the embedded faces: the families the document names, or its language's default, cut to the document's characters and embedded (an artifact page loads no stylesheet: its rules go inline in player.html)
  const faces = fontPlan(p.doc);
  if (faces.fonts.length) {
    if (!process.env.VISOTALK_FONTS) throw new Error(`the font "${faces.fonts[0].family}" is not installed: run visotalk doctor --fix`);
    writeFontFaces(faces.fonts, process.env.VISOTALK_FONTS, PYTHON(), [readFileSync(p.file, 'utf8'), p.overlay?.text ?? '', ...localSources(p).map((x) => x.text)].join('\n'), p.work);
    doc.theme = {id: doc.theme?.id ?? DEFAULT_THEME, tokens: {...doc.theme?.tokens, fonts: {...themeTokens(doc.theme).fonts, sans: faces.sans, ...(faces.display && {display: faces.display})}}};
  }
  writeFileSync(join(p.work, 'doc.built.json'), JSON.stringify(doc));
  const entry = join(p.work, 'entry.tsx');
  const voice = JSON.parse(readFileSync(voicePath, 'utf8')) as VoiceManifest;
  // every player plays one track, the film's whole soundtrack mixed as the video's is; the clips and sounds stay beside it for what plays without a build (the web editor's edits)
  const mix = await mixSoundtrack(p, doc, voice, dist);
  // the document is also a module: its parts' React runs in the player
  writeFileSync(entry, `${faces.fonts.length && !opts.artifact ? "import './fonts.css';\n" : ''}import {mount} from '@visotalk/runtime';\nimport doc from './doc.built.json';\nimport voice from './voice.json';\nimport * as module from ${JSON.stringify(p.file)};\n// eslint-disable-next-line @typescript-eslint/no-explicit-any\nmount({doc: doc as any, voice, module: module as any${mix ? `, mix: '${mix}'` : ''}});\n`);
  const shims = await runtimeShims(p.work);
  // classic scripts, not modules: a module script is refused from file://, so the page would not play when opened from a folder. The runtime file sets
  // `globalThis.__visotalkRuntime` and the document's file reads it, so they run in that order as two plain scripts.
  const common = {bundle: true, outdir: dist, format: 'iife', target: 'es2022', minify: opts.minify ?? true, jsx: 'automatic', loader: {'.woff2': 'file', '.woff': 'file', '.ttf': 'file'}, assetNames: 'fonts/[name]-[hash]', define: {'process.env.NODE_ENV': '"production"'}, logLevel: 'warning'} as const;
  // the runtime with React and the IR is a file of its own that does not depend on the document, so it is the same bytes in every build of one engine; it puts what the document imports in `globalThis.__visotalkRuntime`
  await esbuild({...common, entryPoints: {runtime: shims.entry}, alias: shims.alias});
  // the document's bundle takes those imports from there (a shim per package, listing the names it exports) and holds only the document
  await esbuild({...common, entryPoints: {app: entry}, alias: {...shims.shimmed, '@visotalk/ir': IR}, plugins: [THREE]});
  // every file is named by what it holds
  const named = (file: string) => {
    if (!existsSync(join(dist, file))) return undefined;
    const bytes = readFileSync(join(dist, file));
    const out = file.replace(/(\.[a-z]+)$/, `.${contentName(bytes)}$1`);
    writeFileSync(join(dist, out), bytes);
    rmSync(join(dist, file));
    return out;
  };
  const runtimeJs = named('runtime.js')!, runtimeCss = named('runtime.css')!, appJs = named('app.js')!, appCss = named('app.css');
  // only the clips this document's voice manifest names: the work directory also holds those of earlier versions of the lines
  if (!opts.artifact) for (const v of Object.values(voice)) {
    if (!v.audio) continue;
    mkdirSync(dirname(join(dist, v.audio)), {recursive: true});
    copyFileSync(join(p.work, v.audio), join(dist, v.audio));
  }
  const title = p.doc.meta.title.replace(/</g, '&lt;');
  if (opts.artifact) {
    // what the Artifact tool publishes: `player.html` as the page and `artifact.json` listing the files beside it (the stylesheet stays out, since an artifact loads none of its own: the embedded faces are inline rules in the page and files beside it)
    const faceCss = faces.fonts.length ? readFileSync(join(p.work, 'fonts.css'), 'utf8').replaceAll('url(./fonts/', 'url(fonts/') : '';
    // the faces are named by what they hold like every other file
    const faceFiles: string[] = [];
    let faceRules = faceCss;
    mkdirSync(join(dist, 'fonts'), {recursive: true});
    for (const f of new Set([...faceCss.matchAll(/url\((fonts\/[^)]+)\)/g)].map((m) => m[1]))) {
      const face = `fonts/${basename(f, extname(f))}-${contentName(readFileSync(join(p.work, f)))}${extname(f)}`;
      copyFileSync(join(p.work, f), join(dist, face));
      faceRules = faceRules.replaceAll(`url(${f})`, `url(${face})`);
      faceFiles.push(face);
    }
    for (const sheet of [runtimeCss, appCss]) if (sheet) rmSync(join(dist, sheet));
    writeFileSync(join(dist, 'player.html'), `<meta charset="utf-8">\n<title>${title}</title>\n<style>html,body,#root{height:100%}body{margin:0;background:#05070a}\n${faceRules}</style>\n${artifactQuery(opts)}<div id="root"></div>\n<script src="${runtimeJs}"></script>\n<script src="${appJs}"></script>\n`);
    const files = [appJs, runtimeJs, ...faceFiles, ...(mix ? [mix] : []), ...(existsSync(join(dist, 'assets')) ? readdirSync(join(dist, 'assets')).map((f) => `assets/${f}`) : [])];
    writeFileSync(join(dist, 'artifact.json'), JSON.stringify({page: 'player.html', title: p.doc.meta.title, files}, null, 1));
    return dist;
  }
  writeFileSync(join(dist, 'index.html'), `<!doctype html>\n<html lang="${p.doc.meta.lang}">\n<head>\n<meta charset="utf-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n<title>${title}</title>\n<link rel="stylesheet" href="${runtimeCss}" />\n${appCss ? `<link rel="stylesheet" href="${appCss}" />\n` : ''}<style>html,body,#root{height:100%}body{margin:0;background:#05070a}</style>\n</head>\n<body><div id="root"></div><script src="${runtimeJs}"></script><script src="${appJs}"></script></body>\n</html>\n`);
  return dist;
}
