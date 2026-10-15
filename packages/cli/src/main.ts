#!/usr/bin/env -S node --experimental-strip-types
/**
 * visotalk — validate, prepare, build, render, play, check.
 *
 *   visotalk doctor   [--fix] [--json]   what rendering needs and where it stands; --fix installs the pinned Chrome, the Kokoro model, the Python packages and the aligner weights into ~/.visotalk
 *   visotalk validate <doc.tsx> [--json] [--limit 30]   issues carry a `fix` where there is a standard answer
 *   visotalk prepare  <doc.tsx> [--tts-models DIR]
 *   visotalk build    <doc.tsx> [--out DIR]
 *   visotalk render   <doc.tsx> [--out DIR] [--fps 30] [--jpeg] [--concurrency N] [--from F --to T] [--frames] [--preset ID] [--chrome PATH] [--skip-review]
 *   visotalk play     <doc.tsx> [--port 4800]
 *   visotalk check    <doc.tsx> [--samples 40]   render sampled frames twice (second run in random order) and compare
 *   visotalk qa       <doc.tsx> [--per-beat 3] [--frames] [--json] [--limit 30]   layout checks on sampled frames + static checks; writes qa.json and sheet.png
 *   visotalk sheet    <doc.tsx> [--at 0.85] [--out FILE]   contact sheet: one frame per beat at that fraction
 *   visotalk design   <doc.tsx> <scene> [--step NAME --answer TEXT]   the next of four design questions for a scene, or record its answer; still needs all six
 *   visotalk still    <doc.tsx> --beat SCENE/BEAT [--at 0.85] | --time SECONDS  [--out FILE.png]   one full-size frame (1920x1080) and the questions to answer about it
 *   visotalk review   <doc.tsx> <scene> --seen TEXT --designed yes|no --distinct yes|no --problems none|TEXT   the answers; render needs a passing one for every scene
 *   visotalk preview  <doc.tsx> <Component> [--at 0,0.5,1] [--props JSON] [--out FILE.png]   a component alone, at those times, in the box a slot gives it
 *   visotalk schema   [object <type> | motions | patterns | icons | <type>] [--json]   the vocabulary, read from the same source the validator uses
 */
import {existsSync, readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {basename, dirname, join, resolve} from 'node:path';
import {alignmentIssues, creditsMarkdown, locate, MarkupError, revealIssues, type Loc, sampleFrames, solve, staticQa, withCredits, wordAt, type VoiceManifest} from '@visotalk/ir';
import {contactSheet, frameIssues, renderBuilt, servePlayer, type FrameInspection} from '@visotalk/exporter';
import {design, designOf} from './design.ts';
import {applyDefaults, doctor} from './doctor.ts';
import {buildPlayer, check, componentTextIssues, load, namedPhrases, prepare, recordReview, recordStill, unreviewedScenes, type Project} from './project.ts';

const [cmd, file, ...rest] = process.argv.slice(2);
const COMMANDS = ['doctor', 'schema', 'design', 'validate', 'prepare', 'build', 'render', 'play', 'check', 'qa', 'sheet', 'still', 'review', 'preview'];
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

type Field = {name: string; type: string; optional: boolean; doc: string};
const fieldLine = (f: Field) => `  ${f.name}${f.optional ? '?' : ''}: ${f.type}${f.doc ? `   // ${f.doc}` : ''}`;

/** `visotalk schema`: the committed vocabulary (scripts/generate-vocabulary.mjs), so the agent never reads the source to learn a field. */
function schema(topic?: string, name?: string) {
  const v = JSON.parse(readFileSync(new URL('../../ir/src/vocabulary.json', import.meta.url), 'utf8'));
  const out = (x: unknown, text: string) => console.log(flag('json') ? JSON.stringify(x, null, 1) : text);
  if (!topic) {
    return out(v, [
      `spec ${v.spec}, theme ${v.theme}`,
      `objects:  ${Object.keys(v.objects).join(' ')}   (visotalk schema object <type>)`,
      `motions:  ${Object.keys(v.motions).join(' ')}   (visotalk schema motions)`,
      `patterns: ${Object.keys(v.patterns).join(' ')}   (visotalk schema patterns)`,
      `types:    ${Object.keys(v.types).join(' ')}   (visotalk schema <type>)`,
    ].join('\n'));
  }
  if (topic === 'object') {
    const o = v.objects[name ?? ''];
    if (!o) return void (console.error(`unknown object type "${name}"; one of: ${Object.keys(v.objects).join(' ')}`), process.exit(1));
    const styles = o.styles?.length ? `\nstyles: ${o.styles.join(' ')}` : '';
    return out(o, `${name}${o.doc ? ` \u2014 ${o.doc}` : ''}\n${o.fields.map(fieldLine).join('\n')}${styles}`);
  }
  if (topic === 'icons') {
    const names = Object.keys(JSON.parse(readFileSync(new URL('../../ir/src/icons.json', import.meta.url), 'utf8')));
    return out(names, `${names.length} icons for <Shape shape="icon" icon="name"/>:\n${names.join(' ')}`);
  }
  if (topic === 'motions') {
    return out(v.motions, Object.entries(v.motions).map(([k, m]: [string, any]) => `${k.padEnd(12)} ${m.dur}s${m.entrance ? '  entrance' : ''}${m.hidesUntilStart ? '  hidden until it starts' : ''}`).join('\n'));
  }
  if (topic === 'patterns') {
    return out(v.patterns, Object.entries(v.patterns).map(([k, p]: [string, any]) => `${k}: slots ${p.slots.join(', ')}\n  ${p.doc}`).join('\n'));
  }
  const t = v.types[topic];
  if (!t) return void (console.error(`unknown type "${topic}"; one of: ${Object.keys(v.types).join(' ')}`), process.exit(1));
  out(t, `${topic}${t.doc ? ` \u2014 ${t.doc}` : ''}\n${t.fields.map(fieldLine).join('\n')}`);
}

/** `render` stops for a reveal this far (seconds) from the word that names it; a smaller one is only reported by `qa` */
const REVEAL_BLOCKS = 0.75;

function usage(): never {
  console.error('usage: visotalk <doctor|validate|prepare|build|render|play|check|qa|sheet|still|review|preview> <doc.tsx> [options]\n       visotalk schema [object <type> | motions | patterns | icons | <type>] [--json]');
  process.exit(2);
}

/**
 * A component alone: a throwaway one-beat document with the component in the `full` pattern (the box an agent will get from a slot of that size), its props
 * those of its first use in the document with `--props` over them, rendered at each `--at` time (seconds since the component's scene started, `ctx.local`).
 */
async function preview(p: Project) {
  const comps = p.doc.components ?? [];
  const name = rest[0] && !rest[0].startsWith('--') ? rest[0] : undefined;
  const comp = comps.find((c) => c.export === name || c.id === name);
  if (!comp) {
    console.error(`usage: visotalk preview <doc.tsx> <Component> [--at 0,0.5,1] [--props '{"phase":0.5}'] [--out file.png]\ncomponents imported by this document: ${comps.map((c) => c.export ?? c.id).join(', ') || "none (import one: import {Moon} from './components/moon.ts';)"}`);
    process.exit(2);
  }
  const times = opt('at', '0,0.5,1')!.split(',').map(Number);
  if (!times.length || times.some((t) => !Number.isFinite(t) || t < 0)) throw new Error(`--at is seconds, comma separated: --at 0,0.5,1 (got ${opt('at')})`);
  const out = resolve(opt('out', join(p.work, 'preview', 'preview.png'))!);
  if (!out.endsWith('.png')) throw new Error(`--out for preview is the image file and must end in .png (got ${opt('out')})`);
  const used = Object.values(p.doc.objects).find((o) => o.type === 'component' && o.component === comp.id) as {props?: Record<string, unknown>} | undefined;
  let extra: Record<string, unknown>;
  try {
    extra = JSON.parse(opt('props', '{}')!);
  } catch {
    throw new Error(`--props is a JSON object: --props '{"phase":0.5}' (got ${opt('props')})`);
  }
  const fps = 30;
  const doc = {
    spec: p.doc.spec, meta: {id: `preview-${comp.id}`, title: `Preview of ${comp.export ?? comp.id}`, lang: 'en'},
    canvas: {presets: [{id: '16x9', width: 1920, height: 1080}]}, ...(p.doc.theme && {theme: p.doc.theme}), components: [comp],
    objects: {view: {type: 'component', component: comp.id, props: {...used?.props, ...extra}}},
    scenes: [{id: 's', pattern: {kind: 'full', slots: {main: 'view'}}, beats: [{id: 'b', duration: Math.max(...times) + 1}]}],
    exports: {variants: [{preset: '16x9'}], fps, captions: 'none', credits: 'none'},
  } as unknown as Project['doc'];
  const work = join(p.work, 'preview');
  mkdirSync(work, {recursive: true});
  const pp: Project = {...p, doc, work, locs: new Map()};
  const dist = await buildPlayer(pp);
  const frames = times.map((t) => Math.floor(t * fps));
  const images = new Map<number, Buffer>();
  await renderBuilt({dist, out: join(work, 'frames'), fps, frames, inspect: false, concurrency: 1, encode: false, chrome: opt('chrome'), onFrame: (i, img) => void images.set(i, img)});
  mkdirSync(dirname(out), {recursive: true});
  contactSheet(frames.map((f) => images.get(f)!), out, {cols: Math.min(3, frames.length), cellW: 640});
  times.forEach((t, k) => console.log(`${String(k + 1).padStart(3)}  ${t.toFixed(2).padStart(6)} s`));
  console.log(`preview: ${out}`);
}

async function main() {
  // a mistyped command must not fall through to being read as a document path
  if (cmd && !cmd.startsWith('-') && !COMMANDS.includes(cmd)) {
    console.error(`unknown command "${cmd}"; one of: ${COMMANDS.join(' ')}`);
    process.exit(2);
  }
  applyDefaults();
  if (cmd === 'doctor') return doctor(process.argv.slice(3));
  if (cmd === 'schema') return schema(file, rest[0]);
  if (cmd === 'design') {
    if (!file || !rest[0] || rest[0].startsWith('--')) throw new Error('design needs the scene: visotalk design doc.tsx <scene> --step NAME --answer "…"');
    const r = design(file, rest[0], {answer: opt('answer'), step: opt('step')});
    (r.ok ? console.log : console.error)(r.text);
    if (!r.ok) process.exit(1);
    return;
  }
  if (!cmd || !file) usage();
  const p = load(file);

  const issues = check(p);
  if (issues.length) {
    report(issues, console.error, {name: basename(p.file), locs: p.locs});
    if (!flag('json')) console.error(`${issues.length} issue(s)`);
    process.exit(1);
  }
  if (cmd === 'validate') return void (flag('json') ? report([], console.log) : console.log(`valid: ${p.doc.meta.id} (spec ${p.doc.spec})`));

  if (cmd === 'prepare') {
    const v = prepare(p, opt('tts-models'));
    return void console.log(`narration: ${Object.keys(v).length} line(s), ${Object.values(v).reduce((s, x) => s + x.duration, 0).toFixed(1)} s`);
  }
  if ((cmd === 'qa' || cmd === 'sheet' || cmd === 'still') && opt('out') && !opt('out')!.endsWith('.png')) {
    console.error(`--out for ${cmd} is the image file and must end in .png (got ${opt('out')})`);
    process.exit(1);
  }
  if (cmd === 'preview') return preview(p);
  if (cmd === 'review') {
    const scene = rest[0] && !rest[0].startsWith('--') ? rest[0] : undefined;
    if (!scene) throw new Error(`review needs the scene: visotalk review ${basename(p.file)} <scene> --seen "…" --designed yes|no --problems none|"…"\nthe scenes: ${p.doc.scenes.map((x) => x.id).join(', ')}`);
    const r = recordReview(p, scene, {seen: opt('seen'), designed: opt('designed'), distinct: opt('distinct'), problems: opt('problems')});
    if (r.errors.length) {
      console.error(r.errors.join('\n'));
      process.exit(1);
    }
    console.log(r.ok ? `scene ${scene}: reviewed, nothing to change` : `scene ${scene}: not done. You found something to change: change it, take a new still of it, read it and answer again`);
    const open = unreviewedScenes(p);
    return void console.log(open.length ? `still to review: ${open.join(', ')}` : 'every scene is reviewed: render');
  }
  if (cmd === 'render' && !flag('skip-review')) {
    const open = unreviewedScenes(p);
    if (open.length) {
      console.error(`render needs every scene reviewed on a full-size still as it is now (a sheet shows a third of the size and hides small text and empty space).\nnot reviewed, or reviewed with something left to change, since they last changed: ${open.join(', ')}\nfor each: visotalk still ${basename(p.file)} --beat <scene>/<beat>, read the image, then visotalk review ${basename(p.file)} <scene> --seen … --designed … --problems …   (--skip-review renders anyway)`);
      process.exit(1);
    }
  }
  // Narration is cached per clip, so preparing again is cheap when nothing changed and keeps durations in step with the text.
  if (opt('tts-models') || process.env.KOKORO_DIR) prepare(p, opt('tts-models'));
  else if (existsSync(join(p.work, 'voice.json'))) console.error('no TTS model (--tts-models or KOKORO_DIR): reusing voice.json, so durations may not match the current text');

  if (cmd === 'render' && !flag('skip-review') && existsSync(join(p.work, 'voice.json'))) {
    const voice = JSON.parse(readFileSync(join(p.work, 'voice.json'), 'utf8')) as VoiceManifest;
    const late = revealIssues(withCredits(p.doc), solve(withCredits(p.doc), voice, 30)).filter((i) => Math.abs(i.off ?? 0) > REVEAL_BLOCKS);
    if (late.length) {
      console.error(`render stops: ${late.length} thing(s) are not on screen at the word that names them, off by more than ${REVEAL_BLOCKS} s (the viewer sees the word with no picture, or the picture before the word):\n${late.map((i) => `  ${i.code}  ${i.at}  ${i.message}`).join('\n')}\nanchor each on its word (visotalk qa shows the same reports and their fixes), or --skip-review renders anyway`);
      process.exit(1);
    }
  }
  const dist = await buildPlayer(p, {out: cmd === 'build' ? opt('out') : undefined});
  if (cmd === 'build') return void console.log(`built ${dist}`);

  if (cmd === 'play') {
    const s = await servePlayer(dist, join(p.work, '.media-cache'), Number(opt('port', '4800')));
    return void console.log(`playing ${p.doc.meta.title} at ${s.url}`);
  }

  if (cmd === 'render') {
    const out = resolve(opt('out', join(p.work, 'out'))!);
    const r = await renderBuilt({dist, out, fps: Number(opt('fps', '30')), format: flag('jpeg') ? 'jpeg' : 'png', concurrency: Number(opt('concurrency', '1')),
      from: opt('from') ? Number(opt('from')) : undefined, to: opt('to') ? Number(opt('to')) : undefined, saveFrames: flag('frames'),
      encode: !flag('no-encode'), audio: !flag('no-audio'), preset: opt('preset'), chrome: opt('chrome'), log: (s) => console.error(s),});
    writeFileSync(join(out, 'credits.md'), creditsMarkdown(withCredits(p.doc)));
    console.log(JSON.stringify({...r, hashes: undefined}, null, 1));
    return void console.log(`video: ${join(out, r.frames && !flag('no-audio') ? 'final.mp4' : 'video.mp4')}`);
  }

  if (cmd === 'still') {
    const voice = JSON.parse(readFileSync(join(p.work, 'voice.json'), 'utf8')) as VoiceManifest;
    const fps = Number(opt('fps', '30'));
    const c = solve(withCredits(p.doc), voice, fps);
    const beats = c.scenes.flatMap((sc) => sc.beats.map((b) => ({at: `${sc.id}/${b.id}`, from: b.from, end: b.end})));
    let frame: number;
    if (opt('time') !== undefined) frame = Math.round(Number(opt('time')) * fps);
    else {
      const b = beats.find((x) => x.at === opt('beat') || x.at.endsWith(`/${opt('beat')}`));
      if (!b) throw new Error(`still needs --beat SCENE/BEAT or --time SECONDS; the beats are: ${beats.map((x) => x.at).join(', ')}`);
      frame = Math.floor((b.from + Number(opt('at', '0.85')) * (b.end - b.from)) * fps);
    }
    if (!Number.isFinite(frame) || frame < 0) throw new Error(`--time is seconds from the start (got ${opt('time')})`);
    const img = new Map<number, Buffer>();
    await renderBuilt({dist, out: join(p.work, 'still'), fps, frames: [frame], encode: false, chrome: opt('chrome'), onFrame: (i, b) => void img.set(i, b)});
    const png = resolve(opt('out', join(p.work, 'still', 'still.png'))!);
    mkdirSync(dirname(png), {recursive: true});
    writeFileSync(png, img.get(frame)!);
    const sceneOf = c.scenes.find((sc) => sc.beats.some((b) => frame / fps >= b.from && frame / fps < b.end)) ?? c.scenes[c.scenes.length - 1];
    const t = frame / fps;
    const active = c.scenes.flatMap((sc) => sc.beats.flatMap((b) => b.lines)).find((l) => t >= l.from && t < l.from + l.duration);
    const rawLine = active ? p.doc.scenes.flatMap((sc) => sc.beats.flatMap((b) => b.lines ?? [])).find((l) => l.id === active.id) : undefined;
    const names = namedPhrases(rawLine);
    const beatId = c.scenes.flatMap((sc) => sc.beats.map((b) => ({sc: sc.id, id: b.id, from: b.from, end: b.end}))).find((b) => t >= b.from && t < b.end)?.id ?? '';
    const planned = designOf(p.file, sceneOf.id);
    if (planned.missing) {
      console.error(`${planned.missing}\nThe design comes before the picture: answer the questions for this scene, then change the document to match.`);
      process.exit(1);
    }
    recordStill(p, sceneOf.id, {beat: beatId, time: t, line: active?.id, text: rawLine?.text, names});
    console.log(`still: ${png}  (${t.toFixed(2)} s, scene ${sceneOf.id})`);
    console.log(`\nThe design you recorded for scene "${sceneOf.id}":\n${planned.text}`);
    console.log([
      '',
      `Read the image (Read tool) before you answer. The scene "${sceneOf.id}" counts as looked at only when you have answered:`,
      `  visotalk review ${basename(p.file)} ${sceneOf.id} --seen "…" --designed yes|no --distinct yes|no --problems none|"…"`,
      active ? `1. The sentence at this moment: "${active.say}"${names.length ? `\n   It is anchored on: ${names.map((n) => `"${n}"`).join(', ')}. In --seen, say where each of those is on the image, or that it is missing.` : '\n   In --seen, say what the image shows and what the sentence needs from it.'}` : '1. No sentence is spoken here. In --seen, say what the image shows.',
      '2. Is this the picture and the layout you designed for the scene (the design above)? Go through the BOARD answer sentence by sentence (what is on stage, what arrives or leaves, which word fires it): is each one in the document, on that word? Anything missing or on another word: --designed no, and fix the document or change the answer. --designed yes or no.',
      '3. Could a slide deck, with its layout and entrance animations, have made this? --distinct yes only if it is clearly more: a visual idea of its own, real hierarchy and composition, motion that means something. Is what is on screen the thing the sentence points at (the real command and what it prints, the real contents, the real values), or only labels about it? Labels only: say no and redesign.',
      '4. Is anything small, empty, clipped, overlapping, wrong or missing, or is something the sentence says moves, grows, replaces or becomes (an action, not a thing) only a pop-in? --problems none, or what (then change it and take a new still; the answer you give now stays on record).',
    ].join('\n'));
    return;
  }

  if (cmd === 'qa' || cmd === 'sheet') {
    const voice = JSON.parse(readFileSync(join(p.work, 'voice.json'), 'utf8')) as VoiceManifest;
    const doc = withCredits(p.doc);
    const fps = Number(opt('fps', '30'));
    const c = solve(doc, voice, fps);
    const out = join(p.work, cmd);
    mkdirSync(out, {recursive: true});
    const samples = cmd === 'qa'
      ? sampleFrames(c, fps, Number(opt('per-beat', '3')))
      : c.scenes.flatMap((s) => s.beats.map((b) => ({frame: Math.floor((b.from + Number(opt('at', '0.85')) * (b.end - b.from)) * fps), at: `${s.id}/${b.id}`})));
    const images = new Map<number, Buffer>();
    const r = await renderBuilt({dist, out, fps, frames: samples.map((x) => x.frame), inspect: cmd === 'qa', concurrency: Number(opt('concurrency', '2')), saveFrames: flag('frames'),
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
      ...[...staticQa(doc, c), ...alignmentIssues(doc, c), ...componentTextIssues(p)].map((i) => ({...i, frame: -1})),
      ...samples.flatMap((x) => frameIssues(r.inspections![x.frame] as FrameInspection, x.frame, x.at)),
    ];
    writeFileSync(join(out, 'qa.json'), JSON.stringify({samples: samples.length, issues}, null, 1));
    report(issues, console.log);
    if (!flag('json')) console.log(`${issues.length} issue(s) in ${samples.length} sampled frames · sheet: ${sheet}`);
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
