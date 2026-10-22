/**
 * Regression suite over the example documents (uv, population, moon-phases, liftoff):
 *
 *   1. validate     the document passes the validator with no issues
 *   2. determinism  sampled frames rendered twice — in order in one browser, then shuffled across two — are identical
 *   3. golden       the sampled frames match the stored hashes (tests/regression/golden/<id>.json)
 *   4. qa           layout checks on the sampled frames + static checks report no issue beyond the golden's accepted list
 *
 * Then one check of its own, on a small document built here: a picture wider than its box (shown a slice at a time, as a map cut
 * into tiles is) renders the same on its own page and on a host page whose stylesheet caps pictures at their box's width, as a
 * Claude artifact's page and Tailwind's preflight both do.
 *
 * Narration timing comes from the golden file, so no TTS is needed: the suite builds with those durations and no audio.
 * Pixel hashes depend on the Chrome build and fonts; when the browser differs from the one that recorded the golden,
 * step 3 is reported as skipped (steps 1–2 still run).
 *
 *   node --experimental-strip-types tests/regression/run.ts [example ...] [--update] [--per-line 3]
 *
 * --update records new goldens from the current renders; narration durations are taken from the example's prepared
 * voice manifest (run `visotalk prepare` first) or, failing that, from the existing golden.
 */
import {cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sampleFrames, solve, staticQa, type VoiceManifest} from '../../packages/ir/src/index.ts';
import {frameIssues, issueKey, renderBuilt, type FrameInspection} from '../../packages/exporter/src/index.ts';
import {buildPlayer, check, load} from '../../packages/cli/src/project.ts';
import {applyDefaults} from '../../packages/cli/src/doctor.ts';

applyDefaults(); // the Chrome that `visotalk doctor --fix` installed, unless VISOTALK_CHROME says otherwise

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GOLDEN = join(ROOT, 'tests', 'regression', 'golden');
const EXAMPLES = ['uv', 'moon-phases', 'population', 'liftoff'];
const FPS = 30;

interface Golden {
  doc: string;
  chrome: string;
  fps: number;
  frames: number;
  voice: Record<string, number>;
  samples: Array<{frame: number; at: string; hash: string}>;
  /** accepted QA issues (keys); new ones fail the run */
  qa: string[];
}

const args = process.argv.slice(2);
const update = args.includes('--update');
const perLine = Number(args[args.indexOf('--per-line') + 1]) || 3;
const only = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--per-line');
const examples = only.length ? only : EXAMPLES;

function shuffled<T>(xs: T[], seed = 11): T[] {
  const a = [...xs];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function runExample(name: string): Promise<{name: string; ok: boolean; lines: string[]}> {
  const lines: string[] = [];
  const file = join(ROOT, 'examples', name, 'doc.tsx');
  const p = load(file);
  const goldenPath = join(GOLDEN, `${p.doc.meta.id}.json`);
  const golden: Golden | undefined = existsSync(goldenPath) ? JSON.parse(readFileSync(goldenPath, 'utf8')) : undefined;

  // 1. validate
  const issues = check(p);
  lines.push(`validate      ${issues.length ? `FAIL ${issues.length} issue(s): ${issues.slice(0, 3).map((i) => i.code).join(', ')}` : 'ok'}`);
  if (issues.length) return {name, ok: false, lines};

  // narration timing: the prepared manifest when updating, else the golden's
  const prepared = join(p.work, 'voice.json');
  let durations: Record<string, number> | undefined;
  if (update && existsSync(prepared)) {
    durations = Object.fromEntries(Object.entries(JSON.parse(readFileSync(prepared, 'utf8')) as VoiceManifest).map(([k, v]) => [k, v.duration]));
  } else durations = golden?.voice;
  if (!durations) {
    lines.push('timing        FAIL no golden and no prepared voice manifest (run `visotalk prepare`, then --update)');
    return {name, ok: false, lines};
  }
  const voice: VoiceManifest = Object.fromEntries(Object.entries(durations).map(([k, d]) => [k, {duration: d}])) as VoiceManifest;
  const c = solve(p.doc, voice, FPS);
  const lineIds = c.scenes.flatMap((s) => s.lines.map((l) => l.id));
  const missing = lineIds.filter((id) => !(id in durations!));
  if (missing.length) {
    lines.push(`timing        FAIL golden has no duration for ${missing.slice(0, 5).join(', ')} (narration changed: prepare, then --update)`);
    return {name, ok: false, lines};
  }

  // build in a separate work dir with the fixed timing and no audio
  const work = join(p.dir, '.visotalk', `${p.doc.meta.id}-regression`);
  mkdirSync(work, {recursive: true});
  writeFileSync(join(work, 'voice.json'), JSON.stringify(voice));
  const dist = await buildPlayer({...p, work});
  const samples = sampleFrames(c, FPS, perLine);
  const frames = samples.map((s) => s.frame);

  // 2. determinism: in order, one browser — then shuffled, two browsers
  const t0 = performance.now();
  const a = await renderBuilt({dist, out: join(work, 'a'), fps: FPS, frames, encode: false, saveFrames: true, inspect: true});
  const b = await renderBuilt({dist, out: join(work, 'b'), fps: FPS, frames: shuffled(frames), concurrency: 2, encode: false});
  const unstable = samples.filter((s) => a.hashes[s.frame] !== b.hashes[s.frame]);
  const secs = ((performance.now() - t0) / 1000).toFixed(0);
  lines.push(`determinism   ${unstable.length ? `FAIL ${unstable.length}/${samples.length} differ: ${unstable.slice(0, 4).map((s) => s.at).join(', ')}` : `ok ${samples.length}/${samples.length} identical`} (${secs} s)`);

  // 4. qa (computed before the golden step so --update records it)
  const qaIssues = [...staticQa(p.doc, c), ...samples.flatMap((x) => frameIssues(a.inspections![x.frame] as FrameInspection, x.frame, x.at))];
  const keys = [...new Set(qaIssues.map(issueKey))].sort();

  // 3. golden
  const current: Golden = {doc: p.doc.meta.id, chrome: a.chrome, fps: FPS, frames: Math.round(c.duration * FPS), voice: durations,
    samples: samples.map((s) => ({...s, hash: a.hashes[s.frame]})), qa: keys};
  let goldenOk = true;
  if (update) {
    mkdirSync(GOLDEN, {recursive: true});
    writeFileSync(goldenPath, JSON.stringify(current, null, 1) + '\n');
    lines.push(`golden        updated (${samples.length} samples, ${a.chrome})`);
  } else if (!golden) {
    lines.push('golden        FAIL missing (run with --update)');
    goldenOk = false;
  } else if (golden.chrome !== a.chrome) {
    lines.push(`golden        skipped: recorded with ${golden.chrome}, running ${a.chrome}`);
  } else {
    const want = new Map(golden.samples.map((s) => [s.frame, s]));
    const changed = current.samples.filter((s) => want.get(s.frame)?.hash !== s.hash);
    const lengthChanged = golden.frames !== current.frames;
    goldenOk = !changed.length && !lengthChanged;
    lines.push(`golden        ${goldenOk ? `ok ${current.samples.length}/${current.samples.length} match` : `FAIL ${lengthChanged ? `length ${golden.frames} → ${current.frames}; ` : ''}${changed.length} frame(s) changed: ${changed.slice(0, 4).map((s) => s.at).join(', ')}`}`);
    if (changed.length) writeFileSync(join(work, 'changed.json'), JSON.stringify(changed, null, 1));
  }
  const accepted = new Set(update ? keys : golden?.qa ?? []);
  const fresh = qaIssues.filter((i) => !accepted.has(issueKey(i)));
  const fixed = [...accepted].filter((k) => !keys.includes(k));
  lines.push(`qa            ${fresh.length ? `FAIL ${fresh.length} new issue(s): ${fresh.slice(0, 3).map((i) => `${i.code} ${i.objects.join('+')} @${i.at}`).join('; ')}` : `ok ${keys.length} accepted`}${fixed.length ? ` (${fixed.length} accepted issue(s) gone: run --update)` : ''}`);
  if (fresh.length) writeFileSync(join(work, 'qa.json'), JSON.stringify(fresh, null, 1));
  return {name, ok: !unstable.length && goldenOk && !fresh.length, lines};
}

/** The rule a host page brings that a film must not feel: pictures and videos capped at their box's width */
const HOST_CSS = '<style>img,video{max-width:100%;height:auto}</style>';

async function hostPage(): Promise<{name: string; ok: boolean; lines: string[]}> {
  const dir = mkdtempSync(join(tmpdir(), 'visotalk-host-'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=1600x400', '-frames:v', '1', join(dir, 'wide.png')]);
  // a 400 px window onto the middle of a 1600 px picture
  writeFileSync(join(dir, 'doc.tsx'), `import {Doc, Scene, Part, Asset, Animation, Appear} from '@visotalk/jsx';
import {useAsset} from '@visotalk/runtime';
const Slice = () => <div style={{position: 'absolute', left: 760, top: 340, width: 400, height: 400, overflow: 'hidden'}}>
  <img src={useAsset('wide')} style={{position: 'absolute', left: -600, top: 0, width: 1600, height: 400}} />
</div>;
export default <Doc id="host-page" title="Host page" lang="en" theme="visotalk/dark" canvas="16x9">
  <Asset id="wide" kind="image" src="wide.png" license={{id: "user-owned", obligations: []}} />
  <Scene id="s" duration={1}><Part id="slice"><Slice /></Part><Animation><Appear on="slice" at="start" dur={0.01} /></Animation></Scene>
</Doc>;`);
  const dist = await buildPlayer(load(join(dir, 'doc.tsx')));
  const hosted = join(dir, 'hosted');
  cpSync(dist, hosted, {recursive: true});
  writeFileSync(join(hosted, 'index.html'), HOST_CSS + readFileSync(join(hosted, 'index.html'), 'utf8'));
  const own = await renderBuilt({dist, out: join(dir, 'own'), fps: FPS, frames: [15], encode: false});
  const host = await renderBuilt({dist: hosted, out: join(dir, 'host'), fps: FPS, frames: [15], encode: false});
  const ok = own.hashes[15] === host.hashes[15];
  return {name: 'host page', ok, lines: [`pictures      ${ok ? 'ok the same on a host page that caps them' : `FAIL a host page's img { max-width: 100% } changes the frame (${dir})`}`]};
}

const results = [];
if (!only.length) {
  const r = await hostPage().catch((e: Error) => ({name: 'host page', ok: false, lines: [`error         ${e.message}`]}));
  console.log(`\n${r.ok ? '✓' : '✗'} ${r.name}\n${r.lines.map((l) => `  ${l}`).join('\n')}`);
  results.push(r);
}
for (const name of examples) {
  const r = await runExample(name).catch((e: Error) => ({name, ok: false, lines: [`error         ${e.message}`]}));
  console.log(`\n${r.ok ? '✓' : '✗'} ${name}\n${r.lines.map((l) => `  ${l}`).join('\n')}`);
  results.push(r);
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
