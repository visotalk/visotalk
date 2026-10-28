#!/usr/bin/env -S node --experimental-strip-types
/**
 * visotalk — validate, prepare, build, render, play, check.
 *
 *   visotalk doctor   [--fix] [--json]   what rendering needs and where it stands; --fix installs the pinned Chrome, the Kokoro model, the Python packages and the aligner weights into ~/.visotalk
 *   visotalk init     <doc.tsx> [--lines lines.json] [--id ID] [--tts-models DIR]   a valid skeleton of the narration, nothing drawn; starts the narration in the background
 *   visotalk validate <doc.tsx> [--json] [--limit 30] [--anchors]   issues carry a `fix` where there is a standard answer; --anchors lists each word anchor with the words it finds marked in the line
 *   visotalk prepare  <doc.tsx> [--tts-models DIR]
 *   visotalk build    <doc.tsx> [--out DIR] [--artifact [--theme ID]]   the player as static files; --artifact: MP3 narration, no Latin fonts (a CJK document's faces go with it) and a player.html + artifact.json to publish as a Claude artifact
 *   visotalk render   <doc.tsx> [--out DIR] [--fps 30] [--png] [--concurrency N] [--from F --to T] [--frames] [--preset ID] [--theme ID] [--scale 2] [--gpu] [--chrome PATH]
 *   visotalk play     <doc.tsx | FILE.visotalk> [--port 4800]   a document, or a player bundle (`export --player`), served as a page
 *   visotalk check    <doc.tsx> [--samples 40]   render sampled frames twice (second run in random order) and compare
 *   visotalk qa       <doc.tsx> [--per-line 3] [--theme ID] [--frames] [--json] [--full] [--limit 12]   layout checks on sampled frames of every output the document lists in `exports.variants` (else each canvas), or the one named + static checks; writes qa.json and sheet.jpg
 *   visotalk sheet    <doc.tsx> [--at 0.85] [--theme ID] [--out FILE.jpg]   contact sheet (JPEG, about 1280 wide): one frame per line at that fraction
 *   visotalk still    <doc.tsx> --line SCENE/LINE[,SCENE/LINE…] [--at 0.85] | --time SECONDS[,SECONDS…]  [--theme ID] [--png] [--out FILE.jpg]   frames as 1280x720 JPEG (--png: full-size 1920x1080 PNG), one Chrome run for all of them: each with what was measured on it and what the sentence names
 *   visotalk asset    search "<words>" [--limit 8] | get <N> --id NAME   openly licensed pictures (Wikimedia Commons, Openverse): candidates as text, then one saved to media/ with its <Asset> declaration
 *   visotalk export   <doc.tsx> [--out FILE.visotalk] [--cover FILE] [--player]   the talk as one file: its source, its voice if it is prepared, captions and credits; --player: the built talk instead, which plays and has no document to open
 *   visotalk import   <FILE.visotalk> [DIR] [--remix] [--allow-voice-module]   unpack a source bundle into a new directory, checked as any document is; --remix starts a talk of its own
 *   visotalk schema   [tags | hooks | motions] [--json]   what a document is made of and the hooks a part calls
 *
 * Every command that reads a document but export takes --lang LANG: the document in the language of the overlay doc.<lang>.json beside it.
 */
import {existsSync, readFileSync, statSync, writeFileSync, mkdirSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, dirname, join, resolve} from 'node:path';
import {alignmentIssues, captionsSrt, creditsMarkdown, locate, markPhrase, MarkupError, sayOf, type Compiled, type Loc, sampleFrames, solve, staticQa, wordAt, type VoiceManifest} from '@visotalk/ir';
import {contactSheet, lookImage, frameFacts, frameIssues, frameMeasured, renderBuilt, renderSegmented, servePlayer, type FrameInspection, type RenderOptions} from '@visotalk/exporter';
import {blockFrames, emptyAppearIssues, lineWindows, targetFrames, targetIssues} from './targets.ts';
import {applyDefaults, doctor} from './doctor.ts';
import {skeleton, type Script} from './init.ts';
import {BundleError, openBundle} from '@visotalk/ir/bundle';
import {exportBundle, importBundle} from './bundle.ts';
import {SCHEMA} from './schema.ts';
import {assetCmd} from './asset.ts';
import {Looks} from './looks.ts';
import {narrationHint, narrationSource, anchoredWords, buildPlayer, check, estimateMissingVoice, estimateVoice, load, narrationPending, prepare, speaks, prepareMarked, preparing, startPrepare, waitForPrepare} from './project.ts';

const [cmd, file, ...rest] = process.argv.slice(2);
const COMMANDS = ['doctor', 'init', 'schema', 'asset', 'validate', 'prepare', 'build', 'render', 'play', 'check', 'qa', 'sheet', 'still', 'export', 'import'];
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

/**
 * `qa` for a person, by default: the same problem on the same objects is one group, with how many sampled frames show it and where it is first
 * seen, so a fix is chosen once instead of read once per frame. At most --limit groups (12). Every issue stays in qa.json; --full prints them all.
 */
function summarize(issues: Array<{code: string; at: string; message: string; fix?: string; objects?: string[]; frame?: number}>, log: (s: string) => void, file: string) {
  const groups = new Map<string, {code: string; objects: string; first: string; message: string; fix?: string; n: number}>();
  for (const i of issues) {
    const objects = (i.objects ?? []).join(' + ');
    const key = `${i.code}|${objects}|${i.frame === -1 || !objects ? i.message : ''}`;
    const g = groups.get(key);
    if (g) g.n++;
    else groups.set(key, {code: i.code, objects, first: i.at, message: i.message, fix: i.fix, n: 1});
  }
  const all = [...groups.values()].sort((a, b) => b.n - a.n);
  const shown = all.slice(0, Number(opt('limit', '12')));
  for (const g of shown) {
    log(`${g.code.padEnd(18)} ${g.objects ? `"${g.objects}" ` : ''}${g.n > 1 ? `on ${g.n} frames, first ${g.first}` : g.first}  ${g.message}`);
    if (g.fix) log(`${' '.repeat(18)} fix: ${g.fix}`);
  }
  if (all.length > shown.length) log(`… ${all.length - shown.length} more group(s); every issue is in ${file} (--full prints them)`);
}

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
  else console.log(`${narrationHint(p)}: the lines will be timed from their words; run prepare when you have one`);
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
  if (cmd === 'asset') return assetCmd(file, rest);
  if (cmd === 'init') return init();
  if (cmd === 'import') return importCmd();
  if (cmd === 'play' && file?.endsWith('.visotalk')) return playBundle();
  if (!cmd || !file) usage();
  if (cmd === 'export' && opt('lang')) throw new Error('export writes the document in its own language: a bundle does not carry its language overlays yet');
  const p = load(file, opt('lang'));

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
      console.log(`${sc.id}/${line.id}  ${a.motion} ${[a.target].flat().join(',')}  ${markPhrase(sayOf(p.doc, line), a.at.word, a.at.nth) ?? '(not found)'}`);
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
  if ((cmd === 'qa' || cmd === 'sheet' || cmd === 'still') && opt('out') && !/\.(png|jpg)$/.test(opt('out')!)) {
    console.error(`--out for ${cmd} is the image file and must end in .jpg or .png (got ${opt('out')})`);
    process.exit(1);
  }
  // A look never waits for narration: until it exists the lengths are estimated from the words, and it is started in the background if nobody has.
  const tts = narrationSource(p, opt('tts-models'));
  if ((cmd === 'qa' || cmd === 'sheet' || cmd === 'still') && narrationPending(p) && speaks(p)) {
    if (tts && !preparing(p)) console.error(`narration started in the background (${startPrepare(p, opt('tts-models'))}); log: ${join(p.work, 'prepare.log')}`);
    estimateVoice(p);
    console.error(`narration is not ready${tts ? '' : ` (${narrationHint(p)})`}: the lines are timed from their words (about 2.8 a second), so what a word anchor shows will move when it is`);
  } else {
    if (preparing(p)) {
      console.error('waiting for the narration that is being prepared');
      waitForPrepare(p);
    }
    // Narration is cached per clip, so preparing again is cheap when nothing changed and keeps durations in step with the text.
    if (tts) prepare(p, opt('tts-models'));
    else if (existsSync(join(p.work, 'voice.json'))) console.error(`${narrationHint(p)}: reusing voice.json, so durations may not match the current text`);
    const added = estimateMissingVoice(p);
    if (added.length) console.error(`no narration length yet for ${added.map((x) => `"${x}"`).join(', ')} (added since it was prepared): timed from their words until prepare runs`);
    if (cmd === 'render' && narrationPending(p)) {
      console.error('render needs the real narration, and voice.json holds lengths estimated from the words: ' + narrationHint(p));
      process.exit(1);
    }
  }

  const dist = await buildPlayer(p, {out: cmd === 'build' ? opt('out') : undefined, artifact: cmd === 'build' && flag('artifact'), theme: opt('theme')});
  if (cmd === 'build' && flag('artifact')) {
    const {files} = JSON.parse(readFileSync(join(dist, 'artifact.json'), 'utf8')) as {files: string[]};
    const big = files.find((f) => statSync(join(dist, f)).size > 16e6);
    if (big) throw new Error(`${big} is over the 16 MB an artifact allows for one file`);
    const bytes = files.reduce((n, f) => n + statSync(join(dist, f)).size, 0);
    return void console.log(`built ${dist}: publish player.html with the ${files.length} files of artifact.json (${(bytes / 1e6).toFixed(1)} MB; a face the document names, or its CJK default, goes with it; otherwise the player uses the system's)`);
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
      // a render of part of the film (--from, --to: a segment) looks for the targets of that part only, so a long film in segments is checked once, not once a segment
      const range: [number, number] = [opt('from') ? Number(opt('from')) : 0, opt('to') ? Number(opt('to')) : Math.round(c.duration * fps)];
      const whole = range[0] === 0 && range[1] >= Math.round(c.duration * fps);
      const frames = targetFrames(c, fps).filter((f) => f >= range[0] && f < range[1]);
      console.error(`looking for the animation targets at ${frames.length} frames`);
      // it reads what the parts register, not pixels: as many browsers as the machine allows, and the GPU when the render takes it
      const probe = await renderBuilt({dist, out: join(p.work, 'targets'), fps, frames, inspect: true, concurrency: 'auto', gpu: flag('gpu'), encode: false, chrome: opt('chrome')});
      const missing = targetIssues(p, c, fps, probe.inspections!, whole ? undefined : range);
      if (missing.length) {
        report(missing, console.error, {name: basename(p.file), locs: p.locs});
        console.error(`render stops: ${missing.length} animation target(s) are on no page; fix them`);
        process.exit(1);
      }
    }
    const out = resolve(opt('out', join(p.work, 'out'))!);
    // the frames only feed the encoder, which compresses them again: JPEG is cheaper to make and to pass on
    const options = {dist, out, fps: Number(opt('fps', '30')), format: flag('png') ? 'png' : 'jpeg', concurrency: opt('concurrency') ? Number(opt('concurrency')) : 'auto',
      from: opt('from') ? Number(opt('from')) : undefined, to: opt('to') ? Number(opt('to')) : undefined, saveFrames: flag('frames'),
      encode: !flag('no-encode'), audio: !flag('no-audio'), preset: opt('preset'), theme: opt('theme'), scale: opt('scale') ? Number(opt('scale')) : undefined, gpu: flag('gpu'), chrome: opt('chrome'), log: renderLog, progressMs: process.stderr.isTTY ? 1000 : 5000} satisfies RenderOptions;
    // a video is rendered in segments, so the same command run again after an interruption picks up where it stopped; kept frames or no video, in one pass
    const r = options.encode && !options.saveFrames ? await renderSegmented(options) : await renderBuilt(options);
    endProgress();
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
    // the last frame is the final state of the last scene, held after its narration: a time at or just past the end asks for it
    const lastFrame = Math.round(c.duration * fps) - 1;
    // several moments in one call (`--time 5,20,40` or `--line a/l1,b/l2`): one Chrome run renders all of them
    const frames: number[] = [];
    if (opt('time') !== undefined) {
      for (const v of opt('time')!.split(',')) {
        let frame = Math.round(Number(v) * fps);
        if (!Number.isFinite(frame) || frame < 0) throw new Error(`--time is seconds from the start, or several separated by commas (got ${opt('time')})`);
        if (frame > lastFrame + fps) throw new Error(`--time is seconds from the start, and the video ends at ${c.duration.toFixed(2)} s (got ${v})`);
        if (frame > lastFrame) {
          console.error(`the video ends at ${c.duration.toFixed(2)} s: taking its last frame (${(lastFrame / fps).toFixed(2)} s)`);
          frame = lastFrame;
        }
        frames.push(frame);
      }
    } else {
      const at = Number(opt('at', '0.85'));
      if (!(at >= 0 && at <= 1)) throw new Error(`--at is how far through the line, 0 to 1 (got ${opt('at')}); a moment after the words (the pause or hold) is --time SECONDS`);
      for (const name of (opt('line') ?? '').split(',').filter(Boolean)) {
        const w = windows.find((x) => x.at === name || x.at.endsWith(`/${name}`));
        if (!w) throw new Error(`still needs --line SCENE/LINE[,SCENE/LINE…] or --time SECONDS[,SECONDS…]; "${name}" is not a line; the lines are: ${windows.map((x) => x.at).join(', ')}`);
        frames.push(Math.min(Math.floor((w.from + at * (w.end - w.from)) * fps), Math.ceil(w.end * fps) - 1));
      }
      if (!frames.length) throw new Error(`still needs --line SCENE/LINE or --time SECONDS; the lines are: ${windows.map((x) => x.at).join(', ')}`);
    }
    const unique = [...new Set(frames)];
    const img = new Map<number, Buffer>();
    const taken = await renderBuilt({dist, out: join(p.work, 'still'), fps, frames: unique, encode: false, inspect: true, theme: opt('theme'), chrome: opt('chrome'), onFrame: (i, b) => void img.set(i, b)});
    // What a model looks at. Every picture stays in its conversation, so: a frame unchanged since it was shown is answered in words; the new
    // ones go into one picture (1280 wide, two per row, up to six), not one file each; past the document's look budget no picture is made
    // unless --image asks. `--png` writes each frame full size, lossless, for the smallest print.
    // `--out FILE` is a caller asking for that file (a cover, a script): it is always written, and a .png name gets the full-size frame
    const big = flag('png') || /\.png$/.test(opt('out') ?? '');
    const force = flag('image') || opt('out') !== undefined;
    const L = new Looks(p.work);
    const hashOf = new Map(unique.map((f) => [f, Looks.hash(img.get(f)!)]));
    const fresh = unique.filter((f) => force || !L.was(hashOf.get(f)!));
    const over = !force && L.left() <= 0;
    const where = new Map<number, string>();
    let made = 0;
    if (fresh.length && !over) {
      const dir = join(p.work, 'still');
      mkdirSync(dir, {recursive: true});
      const named = (ext: string) => resolve(p.work, opt('out') && made === 0 ? opt('out')!.replace(/\.(png|jpg)$/, `.${ext}`) : join(dir, `look-${L.images + 1}.${ext}`));
      if (big) {
        for (const f of fresh) {
          const file = named('png');
          writeFileSync(file, img.get(f)!);
          L.spend(file, [{h: hashOf.get(f)!, t: f / fps}]);
          where.set(f, file);
          made++;
        }
      } else {
        for (let i = 0; i < fresh.length; i += 6) {
          const group = fresh.slice(i, i + 6);
          const file = named('jpg');
          if (group.length === 1) lookImage(img.get(group[0])!, file);
          else contactSheet(group.map((f) => img.get(f)!), file, {cols: 2, cellW: 640});
          L.spend(file, group.map((f) => ({h: hashOf.get(f)!, t: f / fps})));
          group.forEach((f, k) => where.set(f, group.length === 1 ? file : `${file}, picture ${k + 1} (row ${Math.floor(k / 2) + 1}, ${k % 2 ? 'right' : 'left'})`));
          made++;
        }
      }
    }
    for (const frame of unique) {
      const t = frame / fps;
      const sceneOf = c.scenes.find((sc) => t >= sc.from && t < sc.end) ?? c.scenes[c.scenes.length - 1];
      const active = sceneOf.lines.find((l) => t >= l.from && t < l.from + l.duration);
      const names = active ? anchoredWords(p.doc.scenes.find((sc) => sc.id === sceneOf.id)!, active.id) : [];
      const inspection = taken.inspections![frame] as FrameInspection;
      const measured = frameMeasured(inspection);
      const facts = frameFacts(inspection);
      const before = L.was(hashOf.get(frame)!);
      const shown = where.get(frame)
        ?? (before && !fresh.includes(frame) ? `unchanged since you looked at it ${Looks.ago(before)}${before.t !== undefined && Math.abs(before.t - t) > 0.05 ? ` (as ${before.t.toFixed(1)} s)` : ''} in ${before.file}: no new picture` : 'no picture (look budget used)');
      console.log(`still ${t.toFixed(2)} s, scene ${sceneOf.id}: ${shown}`);
      console.log([
        ...(active?.say ? [`Spoken now: "${active.say}"${names.length ? `  (anchored on: ${names.map((n) => `"${n}"`).join(', ')})` : ''}`] : [`No sentence is spoken at this moment.`]),
        ...(facts ? [`Measured on this frame: ${facts}.`] : []),
        ...Object.entries(measured).flatMap(([k, found]) => (found as string[]).map((m) => `Measured (${k}): ${m}`)),
      ].join('\n'));
    }
    console.log(L.tally(made));
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
    const extra = cmd === 'qa' ? [...targetFrames(c, fps).map((f) => ({frame: f, at: `target@${(f / fps).toFixed(2)}s`})), ...blockFrames(doc, c, fps)].filter((f, i, all) => !samples.some((x) => x.frame === f.frame) && all.findIndex((g) => g.frame === f.frame) === i) : [];
    // `qa` looks at every output the document means to make (`exports.variants`): `--theme ID` looks at one, and `sheet` at the first or the one named
    const variants: Array<{preset?: string; theme?: string}> = cmd === 'qa' && !opt('theme') && doc.exports?.variants?.length ? doc.exports.variants : [{theme: opt('theme')}];
    const nameOf = (v: {preset?: string; theme?: string}) => [v.preset, v.theme?.replace(/^visotalk\//, '')].filter(Boolean).join(' ') || 'default';
    const frames = [...samples, ...extra].map((x) => x.frame);
    const looks = [];
    const ledger = new Looks(p.work);
    let made = 0;
    for (const v of variants) {
      const images = new Map<number, Buffer>();
      const r = await renderBuilt({dist, out, fps, frames, inspect: cmd === 'qa', concurrency: Number(opt('concurrency', '2')), saveFrames: flag('frames'),
        encode: false, preset: v.preset, theme: v.theme, chrome: opt('chrome'), onFrame: (i, img) => void images.set(i, img)});
      // about 1280 wide in all, as JPEG: an overview to find the frames worth a closer look, not to read small print on. The same sheet as one
      // already shown is not made again, and past the look budget none is made unless --image asks
      const cells = samples.map((x) => images.get(x.frame)!);
      const h = Looks.hash(cells.map((b) => Looks.hash(b)).join(cmd));
      const force = flag('image') || opt('out') !== undefined;
      const before = force ? undefined : ledger.was(h);
      let sheet: string;
      if (before) sheet = `unchanged since you looked at it ${Looks.ago(before)} (${before.file}): no new picture`;
      else if (!force && ledger.left() <= 0) sheet = 'no picture (look budget used)';
      else {
        sheet = resolve(p.work, opt('out', join(out, `${cmd}-${ledger.images + 1}${looks.length ? `-${nameOf(v).replace(/\W+/g, '-')}` : ''}.jpg`))!);
        contactSheet(cells, sheet, {cols: cmd === 'qa' ? 4 : 3, cellW: cmd === 'qa' ? 320 : 424});
        ledger.spend(sheet, [{h}]);
        made++;
      }
      looks.push({name: nameOf(v), r, sheet});
    }
    const {r, sheet} = looks[0];
    if (cmd === 'sheet') {
      samples.forEach((x, k) => {
        const t = x.frame / fps, w = wordAt(c, t);
        console.log(`${String(k + 1).padStart(3)}  ${x.at.padEnd(24)} ${t.toFixed(2).padStart(7)} s${w ? `  ${w.line}: "${w.word}"` : ''}`);
      });
      console.log(`sheet: ${sheet}`);
      return void console.log(ledger.tally(made));
    }
    const issues = [
      ...[...staticQa(doc, c), ...alignmentIssues(doc, c), ...targetIssues(p, c, fps, r.inspections!), ...emptyAppearIssues(p, c, fps, r.inspections!)].map((i) => ({...i, frame: -1})),
      ...looks.flatMap((l) => [...samples, ...extra].flatMap((x) => frameIssues(l.r.inspections![x.frame] as FrameInspection, x.frame, looks.length > 1 ? `${l.name} ${x.at}` : x.at))),
    ];
    writeFileSync(join(out, 'qa.json'), JSON.stringify({samples: samples.length, variants: looks.map((l) => l.name), issues}, null, 1));
    if (flag('json') || flag('full')) report(issues, console.log);
    else summarize(issues, console.log, join(out, 'qa.json'));
    if (!flag('json')) console.log(`${issues.length} issue(s) in ${(samples.length + extra.length) * looks.length} sampled frames${looks.length > 1 ? ` (${looks.map((l) => l.name).join(', ')})` : ''} · sheet: ${looks.map((l) => l.sheet).join(', ')}`);
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

/** On a terminal, render's progress line is rewritten in place (`\r`, then erase to the end of the line); any other output ends it first. Piped to a file, every line stays */
let progressOpen = false;
const endProgress = () => {
  if (progressOpen) process.stderr.write('\n');
  progressOpen = false;
};
const renderLog = (s: string) => {
  if (process.stderr.isTTY && s.startsWith('frames ')) {
    process.stderr.write(`\r${s}\x1b[K`);
    progressOpen = true;
  } else {
    endProgress();
    console.error(s);
  }
};

main().then(() => {
  if (cmd !== 'play') process.exit(0);
}, (e) => {
  endProgress();
  if (e instanceof MarkupError) console.error(`${basename(file ?? '')}:${e.line}:${e.col}  syntax  ${e.message}`);
  else console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
