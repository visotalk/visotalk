#!/usr/bin/env -S node --experimental-strip-types
/**
 * visotalk — validate, prepare, build, render, play, check.
 *
 *   visotalk doctor   [--fix] [--json]   what rendering needs and where it stands; --fix installs the pinned Chrome, the Kokoro model, the Python packages and the aligner weights into ~/.visotalk
 *   visotalk init     <doc.tsx> [--lines lines.json] [--id ID] [--tts-models DIR]   a valid skeleton of the narration, nothing drawn; starts the narration in the background
 *   visotalk validate <doc.tsx> [--json] [--limit 30] [--anchors]   issues carry a `fix` where there is a standard answer; --anchors lists each word anchor with the words it finds marked in the line
 *   visotalk prepare  <doc.tsx> [--tts-models DIR]
 *   visotalk build    <doc.tsx> [--out DIR] [--artifact]   the player as static files; --artifact: MP3 narration, no fonts and a player.html + artifact.json to publish as a Claude artifact
 *   visotalk render   <doc.tsx> [--out DIR] [--fps 30] [--jpeg] [--concurrency N] [--from F --to T] [--frames] [--preset ID] [--chrome PATH]
 *   visotalk play     <doc.tsx | FILE.visotalk> [--port 4800]   a document, or a player bundle (`export --player`), served as a page
 *   visotalk check    <doc.tsx> [--samples 40]   render sampled frames twice (second run in random order) and compare
 *   visotalk qa       <doc.tsx> [--per-line 3] [--frames] [--json] [--limit 30]   layout checks on sampled frames + static checks; writes qa.json and sheet.png
 *   visotalk sheet    <doc.tsx> [--at 0.85] [--out FILE]   contact sheet: one frame per line at that fraction
 *   visotalk still    <doc.tsx> --line SCENE/LINE [--at 0.85] | --time SECONDS  [--out FILE.png]   one full-size frame (1920x1080), what was measured on it, and what the sentence names
 *   visotalk export   <doc.tsx> [--out FILE.visotalk] [--cover FILE] [--player]   the talk as one file: its source, its voice if it is prepared, captions and credits; --player: the built talk instead, which plays and has no document to open
 *   visotalk import   <FILE.visotalk> [DIR] [--remix] [--allow-voice-module]   unpack a source bundle into a new directory, checked as any document is; --remix starts a talk of its own
 *   visotalk schema   [tags | hooks | motions] [--json]   what a document is made of and the hooks a part calls
 */
import {existsSync, readFileSync, statSync, writeFileSync, mkdirSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, dirname, join, resolve} from 'node:path';
import {alignmentIssues, captionsSrt, creditsMarkdown, locate, markPhrase, MarkupError, sayOf, type Compiled, type Loc, sampleFrames, solve, staticQa, wordAt, type VoiceManifest} from '@visotalk/ir';
import {contactSheet, frameFacts, frameIssues, frameMeasured, renderBuilt, servePlayer, type FrameInspection} from '@visotalk/exporter';
import {lineWindows, targetFrames, targetIssues} from './targets.ts';
import {applyDefaults, doctor} from './doctor.ts';
import {skeleton, type Script} from './init.ts';
import {BundleError, openBundle} from '@visotalk/ir/bundle';
import {exportBundle, importBundle} from './bundle.ts';
import {narrationSource, anchoredWords, buildPlayer, check, estimateMissingVoice, estimateVoice, load, narrationPending, prepare, prepareMarked, preparing, startPrepare, waitForPrepare} from './project.ts';

const [cmd, file, ...rest] = process.argv.slice(2);
const COMMANDS = ['doctor', 'init', 'schema', 'validate', 'prepare', 'build', 'render', 'play', 'check', 'qa', 'sheet', 'still', 'export', 'import'];
const opt = (n: string, d?: string) => (rest.includes(`--${n}`) ? rest[rest.indexOf(`--${n}`) + 1] : d);
const flag = (n: string) => rest.includes(`--${n}`);

/** Issues for a person (one line each, then its fix) or, with --json, one envelope: {ok, issues, omitted}. At most --limit are shown. */
function report(issues: Array<{code: string; at: string; message: string; fix?: string}>, log: (s: string) => void, src?: {name: string; locs: Map<string, Loc>}) {
  const where = (at: string) => {
    const l = src && at.startsWith('/') ? locate(src.locs, at) : undefined;
    return l ? `${src!.name}:${l.line}:${l.col}` : at;
  };
  const shown = issues.slice(0, Number(opt('limit', '30'))).map((i) => ({...i, at: where(i.at)}));
  if (flag('json')) return void console.log(JSON.stringify({ok: !issues.length, issues: shown, omitted: issues.length - shown.length}, null, 1));
  for (const i of shown) {
    log(`${i.code.padEnd(18)} ${i.at}  ${i.message}`);
    if (i.fix) log(`${' '.repeat(18)} fix: ${i.fix}`);
  }
  if (issues.length > shown.length) log(`… ${issues.length - shown.length} more not shown (--limit N)`);
}

const SCHEMA = {
  tags: {
    Doc: 'id title lang  [description sources generator created updated spec theme tokens voice speed lexicon canvas pacing exports]   the root; children: Canvas, Asset, Part (global: outlives the scenes), Scene',
    Scene: 'id  [title duration]   lines, parts, one Animation and any Sounds; a scene without lines needs duration (seconds)',
    Line: 'id  [text hold i18n]   the words spoken are the children (<Mark id="x">phrase</Mark> names a phrase an action can hang on); text is the caption when it differs (digits for numbers spoken as words); hold is silence after the line',
    Part: 'id  [x y w h z]   a box (default: the whole canvas) holding React: elements, or a function that returns them (hooks run inside it). Invisible until an Appear; in a Scene it ends with the scene, in Doc it stays',
    Animation: 'the actions of the scene, in any order',
    Sound: 'asset  + where it starts  [id dur volume loop fadeIn fadeOut duck]   music or an effect of an <Asset kind="audio">, in a Scene: volume and duck are dB (the narration is never changed), fadeIn/fadeOut/dur seconds; loop without dur lasts to the end of the film; fadeOut needs dur or loop; duck steps it back while the narration speaks',
    Asset: 'id kind src license  [source analysis proxy]   a file the document uses; read in a part with useAsset(id)',
  },
  motions: {
    Appear: 'on  + where it starts  [dur stagger easing id]   easing: linear, easeIn/easeOut/easeInOut (cubic), those with Sine Quad Quart Quint Back (easeOutQuart, easeOutBack(2.2)), cubic-bezier(x1, y1, x2, y2); every part is invisible until an Appear shows it; so is any other target whose first appear or disappear is an appear',
    Disappear: 'on  + where it starts  [dur stagger easing id]',
    Tween: 'on  + where it starts  [dur stagger easing repeat yoyo id]  + props (numbers, colours, lengths)   reach their values over dur, from the value they have then; repeat plays it again (-1: for the whole film), yoyo back and forth; x y (px) scale rotate (deg) move the target itself',
    Set: 'on  + where it starts  [id]  + props (numbers, strings, true/false)   at once',
    'where it starts': 'exactly one of: line="l1" word="phrase" [nth={2}] [edge="end"] (any substring of the spoken text; in Chinese, Japanese and Thai any characters) · line="l1" mark="name" [edge="end"] (a <Mark> in the line) · line="l1" [edge="end"] (the start of the line, or its end) · after="action-id" [edge="start"] · at={1.5} (seconds into the scene) · at="start" | at="end";  offset={s} adds to any',
  },
  hooks: {
    'useTarget(id)': "props to spread on the element that is the target `id` (data-vt and a style: opacity, visibility, transform). Merge your own style over it, never replace it",
    '<Obj id as? style?>': 'a div (or as="g", "span") that is a target: useTarget in a tag',
    'useProp(name, base)': 'a prop of the part it runs in that <Tween> and <Set> change (<Set on="note" text="…"/> for <Part id="note">): its value now, `base` before the first',
    'useProp(id, name, base)': 'the same for the target `id`',
    'useTime()': 'seconds since the scene on screen started: draw by it, never by a timer',
    'useDocTime()': 'seconds since the start of the video',
    'useFrame()': 'the frame the clock is on',
    'useCanvas()': '{width, height, preset}: the canvas it is drawn on',
    'useTheme()': 'the theme tokens {colors, fonts, radius, space}; also CSS variables var(--vt-data), var(--vt-sans)',
    'useAsset(id)': 'the URL of an <Asset>',
    'random(key)': 'a deterministic random generator: the same key gives the same numbers; Math.random is refused',
  },
};

/** `visotalk schema`: what a document is made of and the hooks a part calls */
function schema(arg?: string) {
  const topic = arg && !arg.startsWith('--') ? arg : undefined;
  const json = process.argv.includes('--json');
  const topics = Object.keys(SCHEMA);
  if (topic && !topics.includes(topic)) return void (console.error(`unknown topic "${topic}"; one of: ${topics.join(' ')}`), process.exit(1));
  if (json) return void console.log(JSON.stringify(topic ? SCHEMA[topic as keyof typeof SCHEMA] : SCHEMA, null, 1));
  for (const t of topic ? [topic] : topics) {
    console.log(`${t}:`);
    for (const [k, v] of Object.entries(SCHEMA[t as keyof typeof SCHEMA])) console.log(`  ${k.padEnd(26)} ${v}`);
  }
}

function usage(): never {
  console.error('usage: visotalk <doctor|init|validate|prepare|build|render|play|check|qa|sheet|still|export> <doc.tsx> [options]\n       visotalk import <file.visotalk> [dir] [--remix] [--allow-voice-module]\n       visotalk schema [tags | hooks | motions] [--json]');
  process.exit(2);
}

/** `init`: the skeleton from a script, validated, with the narration started in the background */
function init() {
  if (!file) throw new Error('init needs the document: visotalk init doc.tsx --lines lines.json');
  const path = resolve(file);
  if (existsSync(path)) throw new Error(`${basename(path)} exists: init writes a new document and never overwrites one`);
  const linesFile = opt('lines', 'lines.json')!;
  if (!existsSync(linesFile)) throw new Error(`no script at ${linesFile}: {"title": "…", "lang": "en", "lines": [{"id": "l1", "text": "caption", "say": "spoken form", "intent": "what it shows"}]} (--lines FILE)`);
  const script = JSON.parse(readFileSync(linesFile, 'utf8')) as Script;
  writeFileSync(path, skeleton(script, opt('id')));
  const p = load(path);
  const issues = check(p);
  if (issues.length) {
    report(issues, console.error, {name: basename(p.file), locs: p.locs});
    process.exit(1);
  }
  console.log(`${basename(path)}: document id "${p.doc.meta.id}" (work files in .visotalk/${p.doc.meta.id}/; changing the id prepares the narration again, so set it now with --id), ${script.lines.length} lines, one line each, all in the scene "draft" (split it into the scenes you design); nothing is drawn yet`);
  const tts = narrationSource(p, opt('tts-models'));
  if (tts) console.log(`narration started in the background (${startPrepare(p, opt('tts-models'))}); log: ${join(p.work, 'prepare.log')}. Until it is ready a picture is timed from the words.`);
  else console.log('no TTS model (--tts-models or KOKORO_DIR): the lines will be timed from their words; run prepare when you have one');
}

/** `play` of a player bundle: its page, served as it is; a source bundle is imported first */
async function playBundle() {
  const {manifest, entries} = await openBundle(readFileSync(resolve(file!))).catch((e) => {
    if (!(e instanceof BundleError)) throw e;
    console.error(`refused: ${e.message}`);
    return process.exit(1);
  });
  if (manifest.kind !== 'player') {
    console.error(`this is a source bundle: unpack it with "visotalk import ${basename(file!)}", then play its document`);
    process.exit(1);
  }
  const dir = mkdtempSync(join(tmpdir(), 'visotalk-play-'));
  for (const [name, data] of entries) {
    if (!name.startsWith('player/')) continue;
    mkdirSync(dirname(join(dir, name.slice('player/'.length))), {recursive: true});
    writeFileSync(join(dir, name.slice('player/'.length)), data);
  }
  const s = await servePlayer(dir, Number(opt('port', '4800')));
  console.log(`playing ${manifest.summary.title} at ${s.url}`);
}

/** `import`: a bundle into a new directory; a refused bundle is a message, not a stack */
async function importCmd() {
  const dir = rest.find((a) => !a.startsWith('--')) ?? basename(file!, '.visotalk');
  try {
    const r = await importBundle(resolve(file!), dir, {remix: flag('remix'), allowVoiceModule: flag('allow-voice-module')});
    console.log(`imported "${r.manifest.summary.title}" into ${r.dir}: ${basename(r.entry)}${r.manifest.voice ? ', with its voice' : ' (no voice: run prepare)'}`);
  } catch (e) {
    if (!(e instanceof BundleError)) throw e;
    console.error(`refused: ${e.message}`);
    process.exit(1);
  }
}

async function main() {
  // a mistyped command must not fall through to being read as a document path
  if (cmd && !cmd.startsWith('-') && !COMMANDS.includes(cmd)) {
    console.error(`unknown command "${cmd}"; one of: ${COMMANDS.join(' ')}`);
    process.exit(2);
  }
  applyDefaults();
  if (cmd === 'doctor') return doctor(process.argv.slice(3));
  if (cmd === 'schema') return schema(file);
  if (cmd === 'init') return init();
  if (cmd === 'import') return importCmd();
  if (cmd === 'play' && file?.endsWith('.visotalk')) return playBundle();
  if (!cmd || !file) usage();
  const p = load(file);

  const issues = check(p);
  if (issues.length) {
    report(issues, console.error, {name: basename(p.file), locs: p.locs});
    if (!flag('json')) console.error(`${issues.length} issue(s)`);
    process.exit(1);
  }
  if (cmd === 'validate') {
    if (flag('json')) return void report([], console.log);
    console.log(`valid: ${p.doc.meta.id} (spec ${p.doc.spec})`);
    if (flag('anchors')) for (const sc of p.doc.scenes) for (const a of sc.animations) {
      if (!('line' in a.at) || a.at.word === undefined) continue;
      const line = sc.lines.find((l) => l.id === (a.at as {line: string}).line)!;
      console.log(`${sc.id}/${line.id}  ${a.motion} ${[a.on].flat().join(',')}  ${markPhrase(sayOf(p.doc, line), a.at.word, a.at.nth) ?? '(not found)'}`);
    }
    return;
  }

  if (cmd === 'export') {
    const out = opt('out', `${p.doc.meta.id}${flag('player') ? '-player' : ''}.visotalk`)!;
    const r = await exportBundle(p, out, {cover: opt('cover'), player: flag('player')}).catch((e) => {
      if (!(e instanceof BundleError)) throw e;
      console.error(`cannot export: ${e.message}`);
      process.exit(1);
    });
    return void console.log(`wrote ${out}: ${(r.bytes / 1e6).toFixed(1)} MB, ${Object.keys(r.manifest.files).length} files, revision ${r.manifest.revision.slice(0, 19)}…${r.voice ? '' : ' (no voice: the narration is not prepared yet, so whoever opens it speaks the lines)'}${r.manifest.cover ? '' : ' (no cover: pass --cover FILE)'}${r.manifest.kind === 'player' && r.manifest.summary.obligations ? ` (terms of its media, kept in credits.md: ${r.manifest.summary.obligations.join(', ')})` : ''}`);
  }

  if (cmd === 'prepare') {
    const v = prepareMarked(p, opt('tts-models'));
    return void console.log(`narration: ${Object.keys(v).length} line(s), ${Object.values(v).reduce((s, x) => s + x.duration, 0).toFixed(1)} s`);
  }
  if ((cmd === 'qa' || cmd === 'sheet' || cmd === 'still') && opt('out') && !opt('out')!.endsWith('.png')) {
    console.error(`--out for ${cmd} is the image file and must end in .png (got ${opt('out')})`);
    process.exit(1);
  }
  // A look never waits for narration: until it exists the lengths are estimated from the words, and it is started in the background if nobody has.
  const tts = narrationSource(p, opt('tts-models'));
  if ((cmd === 'qa' || cmd === 'sheet' || cmd === 'still') && narrationPending(p)) {
    if (tts && !preparing(p)) console.error(`narration started in the background (${startPrepare(p, opt('tts-models'))}); log: ${join(p.work, 'prepare.log')}`);
    estimateVoice(p);
    console.error(`narration is not ready${tts ? '' : ' (no TTS model: --tts-models or KOKORO_DIR)'}: the lines are timed from their words (about 2.8 a second), so what a word anchor shows will move when it is`);
  } else {
    if (preparing(p)) {
      console.error('waiting for the narration that is being prepared');
      waitForPrepare(p);
    }
    // Narration is cached per clip, so preparing again is cheap when nothing changed and keeps durations in step with the text.
    if (tts) prepare(p, opt('tts-models'));
    else if (existsSync(join(p.work, 'voice.json'))) console.error('no TTS model (--tts-models or KOKORO_DIR): reusing voice.json, so durations may not match the current text');
    const added = estimateMissingVoice(p);
    if (added.length) console.error(`no narration length yet for ${added.map((x) => `"${x}"`).join(', ')} (added since it was prepared): timed from their words until prepare runs`);
    if (cmd === 'render' && narrationPending(p)) {
      console.error('render needs the real narration, and voice.json holds lengths estimated from the words: run prepare with a TTS model (--tts-models or KOKORO_DIR)');
      process.exit(1);
    }
  }

  const dist = await buildPlayer(p, {out: cmd === 'build' ? opt('out') : undefined, artifact: cmd === 'build' && flag('artifact')});
  if (cmd === 'build' && flag('artifact')) {
    const {files} = JSON.parse(readFileSync(join(dist, 'artifact.json'), 'utf8')) as {files: string[]};
    const big = files.find((f) => statSync(join(dist, f)).size > 16e6);
    if (big) throw new Error(`${big} is over the 16 MB an artifact allows for one file`);
    const bytes = files.reduce((n, f) => n + statSync(join(dist, f)).size, 0);
    return void console.log(`built ${dist}: publish player.html with the ${files.length} files of artifact.json (${(bytes / 1e6).toFixed(1)} MB; no fonts: the player uses the system's)`);
  }
  if (cmd === 'build') return void console.log(`built ${dist}`);

  if (cmd === 'play') {
    const s = await servePlayer(dist, Number(opt('port', '4800')));
    return void console.log(`playing ${p.doc.meta.title} at ${s.url}`);
  }

  if (cmd === 'render') {
    {
      const fps = Number(opt('fps', '30'));
      const c = solve(p.doc, JSON.parse(readFileSync(join(p.work, 'voice.json'), 'utf8')) as VoiceManifest, fps);
      const frames = targetFrames(c, fps);
      const probe = await renderBuilt({dist, out: join(p.work, 'targets'), fps, frames, inspect: true, concurrency: 1, encode: false, chrome: opt('chrome')});
      const missing = targetIssues(p, c, fps, probe.inspections!);
      if (missing.length) {
        report(missing, console.error, {name: basename(p.file), locs: p.locs});
        console.error(`render stops: ${missing.length} animation target(s) are on no page; fix them`);
        process.exit(1);
      }
    }
    const out = resolve(opt('out', join(p.work, 'out'))!);
    const r = await renderBuilt({dist, out, fps: Number(opt('fps', '30')), format: flag('jpeg') ? 'jpeg' : 'png', concurrency: Number(opt('concurrency', '1')),
      from: opt('from') ? Number(opt('from')) : undefined, to: opt('to') ? Number(opt('to')) : undefined, saveFrames: flag('frames'),
      encode: !flag('no-encode'), audio: !flag('no-audio'), preset: opt('preset'), chrome: opt('chrome'), log: (s) => console.error(s),});
    writeFileSync(join(out, 'credits.md'), creditsMarkdown(p.doc));
    if (p.doc.exports?.captions === 'sidecar') writeFileSync(join(out, 'captions.srt'), captionsSrt(solve(p.doc, JSON.parse(readFileSync(join(p.work, 'voice.json'), 'utf8')) as VoiceManifest, Number(opt('fps', '30')))));
    console.log(JSON.stringify({...r, hashes: undefined}, null, 1));
    return void console.log(`video: ${join(out, r.frames && !flag('no-audio') ? 'final.mp4' : 'video.mp4')}`);
  }

  if (cmd === 'still') {
    const voice = JSON.parse(readFileSync(join(p.work, 'voice.json'), 'utf8')) as VoiceManifest;
    const fps = Number(opt('fps', '30'));
    const c = solve(p.doc, voice, fps);
    const windows = lineWindows(c);
    let frame: number;
    if (opt('time') !== undefined) frame = Math.round(Number(opt('time')) * fps);
    else {
      const at = Number(opt('at', '0.85'));
      if (!(at >= 0 && at <= 1)) throw new Error(`--at is how far through the line, 0 to 1 (got ${opt('at')}); a moment after the words (the pause or hold) is --time SECONDS`);
      const w = windows.find((x) => x.at === opt('line') || x.at.endsWith(`/${opt('line')}`));
      if (!w) throw new Error(`still needs --line SCENE/LINE or --time SECONDS; the lines are: ${windows.map((x) => x.at).join(', ')}`);
      frame = Math.min(Math.floor((w.from + at * (w.end - w.from)) * fps), Math.ceil(w.end * fps) - 1);
    }
    if (!Number.isFinite(frame) || frame < 0) throw new Error(`--time is seconds from the start (got ${opt('time')})`);
    // the last frame is the final state of the last scene, held after its narration: a time at or just past the end asks for it
    const lastFrame = Math.round(c.duration * fps) - 1;
    if (frame > lastFrame + fps) throw new Error(`--time is seconds from the start, and the video ends at ${c.duration.toFixed(2)} s (got ${opt('time')})`);
    if (frame > lastFrame) {
      console.error(`the video ends at ${c.duration.toFixed(2)} s: taking its last frame (${(lastFrame / fps).toFixed(2)} s)`);
      frame = lastFrame;
    }
    const img = new Map<number, Buffer>();
    const taken = await renderBuilt({dist, out: join(p.work, 'still'), fps, frames: [frame], encode: false, inspect: true, chrome: opt('chrome'), onFrame: (i, b) => void img.set(i, b)});
    const png = resolve(opt('out', join(p.work, 'still', 'still.png'))!);
    mkdirSync(dirname(png), {recursive: true});
    writeFileSync(png, img.get(frame)!);
    const t = frame / fps;
    const sceneOf = c.scenes.find((sc) => t >= sc.from && t < sc.end) ?? c.scenes[c.scenes.length - 1];
    const active = sceneOf.lines.find((l) => t >= l.from && t < l.from + l.duration);
    const names = active ? anchoredWords(p.doc.scenes.find((sc) => sc.id === sceneOf.id)!, active.id) : [];
    const inspection = taken.inspections![frame] as FrameInspection;
    const measured = frameMeasured(inspection);
    const facts = frameFacts(inspection);
    console.log(`still: ${png}  (${t.toFixed(2)} s, scene ${sceneOf.id})`);
    console.log([
      ...(active?.say ? [`Spoken now: "${active.say}"${names.length ? `  (anchored on: ${names.map((n) => `"${n}"`).join(', ')})` : ''}`] : [`No sentence is spoken at this moment.`]),
      ...(facts ? [`Measured on this frame: ${facts}.`] : []),
      ...Object.entries(measured).flatMap(([k, found]) => (found as string[]).map((m) => `Measured (${k}): ${m}`)),
    ].join('\n'));
    return;
  }

  if (cmd === 'qa' || cmd === 'sheet') {
    const voice = JSON.parse(readFileSync(join(p.work, 'voice.json'), 'utf8')) as VoiceManifest;
    const doc = p.doc;
    const fps = Number(opt('fps', '30'));
    const c = solve(doc, voice, fps);
    const out = join(p.work, cmd);
    mkdirSync(out, {recursive: true});
    const samples = cmd === 'qa'
      ? sampleFrames(c, fps, Number(opt('per-line', '3')))
      : lineWindows(c).map((w) => ({frame: Math.floor((w.from + Number(opt('at', '0.85')) * (w.end - w.from)) * fps), at: w.at}));
    // `qa` also looks at the frames where every animation target should be on the page
    const extra = cmd === 'qa' ? targetFrames(c, fps).filter((f) => !samples.some((x) => x.frame === f)).map((f) => ({frame: f, at: `target@${(f / fps).toFixed(2)}s`})) : [];
    const images = new Map<number, Buffer>();
    const r = await renderBuilt({dist, out, fps, frames: [...samples, ...extra].map((x) => x.frame), inspect: cmd === 'qa', concurrency: Number(opt('concurrency', '2')), saveFrames: flag('frames'),
      encode: false, chrome: opt('chrome'), onFrame: (i, img) => void images.set(i, img)});
    const sheet = resolve(opt('out', join(out, 'sheet.png'))!);
    contactSheet(samples.map((x) => images.get(x.frame)!), sheet, {cols: cmd === 'qa' ? 4 : 3, cellW: cmd === 'qa' ? 480 : 640});
    if (cmd === 'sheet') {
      samples.forEach((x, k) => {
        const t = x.frame / fps, w = wordAt(c, t);
        console.log(`${String(k + 1).padStart(3)}  ${x.at.padEnd(24)} ${t.toFixed(2).padStart(7)} s${w ? `  ${w.line}: "${w.word}"` : ''}`);
      });
      return void console.log(`sheet: ${sheet}`);
    }
    const issues = [
      ...[...staticQa(doc, c), ...alignmentIssues(doc, c), ...targetIssues(p, c, fps, r.inspections!)].map((i) => ({...i, frame: -1})),
      ...[...samples, ...extra].flatMap((x) => frameIssues(r.inspections![x.frame] as FrameInspection, x.frame, x.at)),
    ];
    writeFileSync(join(out, 'qa.json'), JSON.stringify({samples: samples.length, issues}, null, 1));
    report(issues, console.log);
    if (!flag('json')) console.log(`${issues.length} issue(s) in ${samples.length + extra.length} sampled frames · sheet: ${sheet}`);
    if (issues.length) process.exit(1);
    return;
  }

  if (cmd === 'check') {
    const samples = Number(opt('samples', '40'));
    const out = join(p.work, 'check');
    const a = await renderBuilt({dist, out: join(out, 'a'), encode: false, chrome: opt('chrome')});
    const total = a.hashes.length;
    const pick = Array.from({length: Math.min(samples, total)}, (_, i) => Math.floor(((i + 0.5) * total) / Math.min(samples, total)));
    const b: string[] = [];
    // second pass: the sampled frames in reverse order, each from a cold seek
    for (const i of [...pick].reverse()) {
      const r = await renderBuilt({dist, out: join(out, 'b'), from: i, to: i + 1, encode: false, chrome: opt('chrome')});
      b[i] = r.hashes[i];
    }
    const bad = pick.filter((i) => a.hashes[i] !== b[i]);
    console.log(JSON.stringify({frames: total, sampled: pick.length, mismatches: bad}, null, 1));
    if (bad.length) process.exit(1);
  }
}

main().then(() => {
  if (cmd !== 'play') process.exit(0);
}, (e) => {
  if (e instanceof MarkupError) console.error(`${basename(file ?? '')}:${e.line}:${e.col}  syntax  ${e.message}`);
  else console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
