import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {parseMarkup, validate} from '../../packages/ir/src/index.ts';
import type {Project} from '../../packages/cli/src/project.ts';

/** A project as `load` makes one: the file's own directory, work files beside it, the document parsed from its text */
const project = (dir: string, text: string, work = dir): Project => ({file: dir + '/doc.tsx', dir, work, ...parseMarkup(text)});

const TWO = `import {Doc, Scene, Line, Part, Animation, Appear} from '@visotalk/jsx';
const COLOUR = 'red';
export default <Doc id="d" title="t" lang="en">
  <Scene id="bars-scene">
    <Line id="l1">Bars that grow, like a red apple and pears.</Line>
    <Part id="bars">{() => <div>bars</div>}</Part>
    <Animation><Appear on="bars" line="l1" word="red apple"/><Appear on="bars" line="l1" word="pears"/><Appear on="bars" line="l1" word="red apple" edge="end"/></Animation>
  </Scene>
  <Scene id="chain-scene">
    <Line id="l2">Cards that change.</Line>
    <Part id="cards">{() => <div>cards</div>}</Part>
  </Scene>
</Doc>;`;

test('anchoredWords: the phrases a line is anchored on, once each', async () => {
  const {anchoredWords} = await import('../../packages/cli/src/project.ts');
  const p = project(mkdtempSync('/tmp/vt-anchors-'), TWO);
  assert.deepEqual(anchoredWords(p.doc.scenes[0], 'l1'), ['red apple', 'pears']);
  assert.deepEqual(anchoredWords(p.doc.scenes[1], 'l2'), []);
});

test('init: a script becomes a valid skeleton, and a picture is timed from the words until the narration exists', async () => {
  const {skeleton} = await import('../../packages/cli/src/init.ts');
  const {estimateVoice, narrationPending, preparing} = await import('../../packages/cli/src/project.ts');
  const src = skeleton({title: 'The eight billion', lines: [
    {text: 'How fast is the population growing? Count it in billions.', intent: 'measure growth */ by time'},
    {id: 'second', text: 'It took 123 years, arriving in 1927.', say: 'It took one hundred and twenty three years, arriving in nineteen twenty seven.'},
  ]});
  const doc = parseMarkup(src).doc;
  assert.deepEqual(validate(doc), []);
  assert.equal(doc.meta.id, 'the-eight-billion');
  assert.deepEqual(doc.scenes.map((s) => [s.id, s.lines.map((l) => [l.id, l.text])]), [['draft', [['l1', 'How fast is the population growing? Count it in billions.'], ['second', 'It took 123 years, arriving in 1927.']]]]);
  assert.match(src, /intent: measure growth \* \/ by time/);
  assert.equal(parseMarkup(skeleton({title: 'The "eight" billion', lines: [{text: 'x'}]})).doc.meta.title, 'The "eight" billion'); // a title is a JS string, not a JSX attribute
  assert.throws(() => skeleton({lines: [{text: 'a { b'}]}), /may not hold/);
  assert.throws(() => skeleton({lines: [{id: 'a', text: 'x'}, {id: 'a', text: 'y'}]}), /used twice/);
  assert.throws(() => skeleton({lines: []}), /no lines/);

  const dir = mkdtempSync('/tmp/vt-init-');
  const work = dir + '/.visotalk/the-eight-billion';
  mkdirSync(work, {recursive: true});
  const p = project(dir, src, work);
  assert.equal(narrationPending(p), true);
  const v = estimateVoice(p);
  assert.deepEqual(Object.keys(v), ['l1', 'second']);
  assert.equal(v.l1.duration, 3.57); // 10 words at 2.8 a second
  assert.equal(v.second.duration, 4.64); // 13 words
  assert.equal(narrationPending(p), true); // an estimate is still pending
  p.doc.voice = {speed: 2} as never;
  assert.equal(estimateVoice(p).l1.duration, 1.79); // twice as fast
  // a narration that is being prepared is a live process; a pid that is gone is not
  assert.equal(preparing(p), undefined);
  writeFileSync(work + '/prepare.pid', String(process.pid));
  assert.equal(preparing(p), process.pid);
  writeFileSync(work + '/prepare.pid', '999999');
  assert.equal(preparing(p), undefined);
});

test('targets: an action target no part registers is a typo, one registered twice is a clash, and a hidden one still counts', async () => {
  const {lineWindows, targetFrames, targetIssues} = await import('../../packages/cli/src/targets.ts');
  const {solve} = await import('../../packages/ir/src/index.ts');
  const src = `import {Doc, Scene, Line, Part, Animation, Appear, Tween} from '@visotalk/jsx';
export default <Doc id="d" title="t" lang="en"><Scene id="s"><Line id="l">One two three.</Line><Part id="p">{() => null}</Part>
  <Animation><Appear on="p" line="l" word="two"/><Tween on="bar" w={4} line="l" word="three"/><Appear on="barr" at="end"/></Animation></Scene></Doc>;`;
  const p = project(mkdtempSync('/tmp/vt-targets-'), src);
  const c = solve(p.doc, {l: {duration: 3, audio: 'l.wav'}}, 30);
  assert.deepEqual(lineWindows(c).map((w) => [w.at, w.from, w.end]), [['s/l', 0.4, 3.4]]);
  const frames = targetFrames(c, 30);
  assert.ok(frames.length >= 3 && frames.every((f) => f >= 0 && f < Math.round(c.duration * 30)));
  const page = (registered: string[]) => ({width: 1920, height: 1080, objects: [], texts: [], registered, caption: null});
  const at = (registered: string[]) => Object.fromEntries(frames.map((f) => [f, page(registered)]));
  assert.deepEqual(targetIssues(p, c, 30, at(['p', 'bar', 'barr'])), []);
  const typo = targetIssues(p, c, 30, at(['p', 'bar']));
  assert.deepEqual(typo.map((i) => [i.code, i.at]), [['target.unregistered', '/scenes/s/animations/2']]);
  assert.match(typo[0].message, /"barr" is not on the page/);
  const clash = targetIssues(p, c, 30, at(['p', 'bar', 'barr', 'bar']));
  assert.deepEqual(clash.map((i) => i.code), ['target.duplicate']);
  // a part that threw is named once, and the targets that were inside it are not reported as typos as well
  const threw = Object.fromEntries(frames.map((f) => [f, {...page(['bar']), partErrors: [{part: 'p', scene: 's', message: 't.map is not a function'}]}]));
  const crash = targetIssues(p, c, 30, threw);
  assert.deepEqual(crash.map((i) => [i.code, i.at]), [['part.error', '/scenes/s/parts/p']]);
  assert.match(crash[0].message, /part "p" of scene "s" threw: t\.map is not a function/);
});

test('check: the engine\'s clock is the only one a part may draw by, in the document and in the files it imports', async () => {
  const {codeIssues} = await import('../../packages/cli/src/project.ts');
  const dir = mkdtempSync('/tmp/vt-code-');
  mkdirSync(dir + '/lib');
  writeFileSync(dir + '/lib/noise.ts', "export const noise = () => Math.random();\nexport const ok = () => Math.random(); // allow\n");
  const text = `import {Doc, Scene, Part} from '@visotalk/jsx';
import {noise} from './lib/noise';
const spin = {animation: 'spin 2s linear infinite'};
// Date.now() in a comment is not code
export default <Doc id="d" title="t" lang="en"><Scene id="s" duration={3}>
  <Part id="p">{() => <div style={{transition: 'opacity 1s'}} onClick={() => setTimeout(noise, 1)}>{String(new Date())}</div>}</Part>
</Scene></Doc>;`;
  const found = codeIssues(project(dir, text));
  assert.deepEqual(found.map((i) => `${i.at} ${i.message.split(' in ')[0]}`).sort(), [
    'doc.tsx:3 a CSS animation or transition', 'doc.tsx:6 a CSS animation or transition', 'doc.tsx:6 a timer', 'doc.tsx:6 the wall clock', 'noise.ts:1 Math.random'].sort());
  assert.ok(found.every((i) => i.code === 'code.nondeterministic' && i.fix));
});

test('narration: a line added after the narration was prepared gets an estimate, and the real lengths of the others are kept', async () => {
  const {estimateMissingVoice, estimateVoice, narrationPending} = await import('../../packages/cli/src/project.ts');
  const {existsSync, readFileSync} = await import('node:fs');
  const dir = mkdtempSync('/tmp/vt-voice-');
  const p = project(dir, TWO);
  writeFileSync(dir + '/voice.json', JSON.stringify({l1: {duration: 7.5, audio: 'l1.ogg'}}));
  assert.equal(narrationPending(p), false, 'real narration, nothing estimated');
  assert.deepEqual(estimateMissingVoice(p), ['l2']);
  const voice = () => JSON.parse(readFileSync(dir + '/voice.json', 'utf8'));
  assert.equal(voice().l1.duration, 7.5, 'the prepared line keeps its length and its clip');
  assert.ok(voice().l2.duration >= 1, 'the new line is timed from its words');
  assert.equal(narrationPending(p), true, 'render waits for prepare');
  assert.equal(JSON.parse(readFileSync(dir + '/voice.estimated', 'utf8') || '[]').join(), 'l2');
  // a later look re-estimates only what is estimated
  estimateVoice(p);
  assert.equal(voice().l1.duration, 7.5);
  assert.deepEqual(estimateMissingVoice(p), [], 'nothing missing now');
  // everything estimated: all lines are re-estimated and the mark says all
  const fresh = mkdtempSync('/tmp/vt-voice-');
  estimateVoice(project(fresh, TWO));
  assert.equal(readFileSync(fresh + '/voice.estimated', 'utf8'), '');
  assert.ok(existsSync(fresh + '/voice.json'));
});

test('chrome lock: runs one at a time, and a lock whose owner is gone is taken over', async () => {
  // its own lock file, so that a render running on the machine is not disturbed
  const lock = mkdtempSync('/tmp/vt-lock-') + '/chrome.lock';
  process.env.VISOTALK_CHROME_LOCK = lock;
  process.env.VISOTALK_CHROME_LOCK_WAIT_MS = '400';
  const {withChromeLock} = await import('../../packages/exporter/src/chrome.ts');
  const {writeFileSync, existsSync} = await import('node:fs');
  const log: string[] = [];
  const job = (name: string, ms: number) => withChromeLock(async () => {
    log.push(`${name} in`);
    await new Promise((r) => setTimeout(r, ms));
    log.push(`${name} out`);
  });
  await Promise.all([job('a', 150), job('b', 10)]);
  assert.deepEqual(log, ['a in', 'a out', 'b in', 'b out'], 'the second waits for the first');
  assert.equal(existsSync(lock), false, 'the lock is released');
  // a lock left by a process that is gone
  writeFileSync(lock, '2147483646');
  await job('c', 5);
  assert.deepEqual(log.slice(-2), ['c in', 'c out']);
  assert.equal(existsSync(lock), false);
  // a live owner that never lets go: the wait ends with an error that says what to do
  writeFileSync(lock, String(process.pid));
  await assert.rejects(job('d', 1), /held Chrome for more than .* minutes \(pid \d+\): stop it, or remove .*chrome.lock/);
  assert.equal(log.includes('d in'), false);
  rmSync(lock, {force: true});
});

test('video: an asset of kind video is probed into media.json, and the exporter decodes every frame once', async (t) => {
  const {spawnSync} = await import('node:child_process');
  const {existsSync, readdirSync, readFileSync} = await import('node:fs');
  const {buildPlayer, load} = await import('../../packages/cli/src/project.ts');
  const {extractMedia} = await import('../../packages/exporter/src/extract.ts');
  const dir = mkdtempSync('/tmp/vt-video-');
  mkdirSync(dir + '/media');
  const made = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=160x90:rate=25:duration=1', '-pix_fmt', 'yuv420p', dir + '/media/clip.mp4']);
  if (made.status !== 0) return t.skip('no ffmpeg');
  writeFileSync(dir + '/doc.tsx', `import {Doc, Scene, Line, Part, Animation, Appear, Asset} from '@visotalk/jsx';
import {Video} from '@visotalk/runtime';
export default <Doc id="v" title="V" lang="en" theme="visotalk/dark" canvas="16x9">
  <Asset id="clip" kind="video" src="media/clip.mp4" license={{id: 'CC0-1.0', attribution: 'test', obligations: []}} source="https://example.com/"/>
  <Scene id="s"><Line id="l1">One two three.</Line><Part id="p">{() => <Video asset="clip"/>}</Part><Animation><Appear on="p" line="l1" word="two"/></Animation></Scene>
</Doc>;`);
  mkdirSync(dir + '/.visotalk/v', {recursive: true});
  writeFileSync(dir + '/.visotalk/v/voice.json', JSON.stringify({l1: {duration: 2}}));
  const dist = await buildPlayer(load(dir + '/doc.tsx'));
  assert.deepEqual(JSON.parse(readFileSync(dist + '/media.json', 'utf8')), {clip: {src: 'assets/clip.mp4', fps: 25, frames: 25}});
  // ffmpeg writes the index (moov) after the frames (mdat) unless told otherwise (the fixture above); a host that does not answer
  // range requests, a Claude artifact among them, then never gives the browser the index. The built copy has it first.
  assert.ok(readFileSync(dir + '/media/clip.mp4').indexOf('moov') > readFileSync(dir + '/media/clip.mp4').indexOf('mdat'), 'the fixture has its index last');
  const bytes = readFileSync(dist + '/assets/clip.mp4');
  assert.ok(bytes.indexOf('moov') > 0 && bytes.indexOf('moov') < bytes.indexOf('mdat'), 'the built video has its index before its frames');
  const cache = dir + '/cache';
  assert.deepEqual(await extractMedia(dist, cache), {clip: 25});
  assert.equal(readdirSync(cache + '/clip').length, 25);
  assert.ok(existsSync(cache + '/clip/0.jpg') && existsSync(cache + '/clip/24.jpg'));
  assert.deepEqual(await extractMedia(dist, cache), {clip: 0}, 'a second run decodes nothing');
});

test('narration: a CJK document is spoken by a provider and timed from characters; Kokoro is English only', async () => {
  const {isCjk, narrationHint, narrationSource, prepare, estimateVoice} = await import('../../packages/cli/src/project.ts');
  for (const lang of ['zh', 'zh-CN', 'zh_CN', 'zho', 'cmn', 'ZH-tw', 'ja', 'ja-JP', 'ko', 'kor']) assert.ok(isCjk(lang), lang);
  for (const lang of ['en', 'fr', 'zhx', 'jam']) assert.ok(!isCjk(lang), lang);
  const doc = (lang: string, voice = '') => project(mkdtempSync('/tmp/vt-cjk-'), `export default <Doc id="d" title="t" lang="${lang}"${voice}>
  <Scene id="s"><Line id="l1">One.</Line></Scene>
</Doc>;`);
  // a Kokoro model does not make a CJK document speakable: only a provider's voice does
  assert.equal(narrationSource(doc('zh-CN'), '/models'), undefined);
  assert.equal(narrationSource(doc('zh-CN', ' voice="minimax:v"'), '/models'), 'minimax');
  assert.equal(narrationSource(doc('en'), '/models'), '/models');
  assert.match(narrationHint(doc('ja')), /needs a voice provider.*minimax/);
  assert.equal(narrationHint(doc('ja', ' voice="minimax:v"')), 'no TTS model: --tts-models or KOKORO_DIR');
  assert.throws(() => prepare(doc('ko'), '/models'), /needs a voice provider/);
  const text = '\u57df\u540d\u7cfb\u7edf\u628a\u540d\u5b57\u53d8\u6210\u5730\u5740\uff0c\u6d4f\u89c8\u5668\u5148\u95ee\u89e3\u6790\u5668\u3002';
  const zh = project(mkdtempSync('/tmp/vt-zh-'), `export default <Doc id="d" title="t" lang="zh-CN">
  <Scene id="s"><Line id="l1">${text}</Line></Scene>
</Doc>;`);
  // 21 characters (the full stop and comma too) at 4.4 a second, not one "word" at 2.8
  assert.ok(Math.abs(estimateVoice(zh).l1.duration - 21 / 4.4) < 0.05);
});

test('artifact: the player is built with MP3 narration, a page and the list of files to publish', async (t) => {
  const {spawnSync} = await import('node:child_process');
  const {existsSync, readFileSync} = await import('node:fs');
  const {buildPlayer, load} = await import('../../packages/cli/src/project.ts');
  const dir = mkdtempSync('/tmp/vt-artifact-');
  const wav = dir + '/l1.wav';
  if (spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', wav]).status !== 0) return t.skip('no ffmpeg');
  writeFileSync(dir + '/doc.tsx', `import {Doc, Scene, Line, Part, Animation, Appear} from '@visotalk/jsx';
export default <Doc id="a" title="A <b>" lang="en" theme="visotalk/dark" canvas="16x9">
  <Scene id="s"><Line id="l1">One two three.</Line><Part id="p">{() => <div>x</div>}</Part><Animation><Appear on="p" line="l1" word="two"/></Animation></Scene>
</Doc>;`);
  mkdirSync(dir + '/.visotalk/a/audio', {recursive: true});
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'aac', dir + '/.visotalk/a/audio/l1.m4a']);
  writeFileSync(dir + '/.visotalk/a/voice.json', JSON.stringify({l1: {duration: 1, audio: 'audio/l1.m4a'}}));
  const dist = await buildPlayer(load(dir + '/doc.tsx'), {artifact: true});
  const list = JSON.parse(readFileSync(dist + '/artifact.json', 'utf8'));
  assert.deepEqual(list.files, ['app.js', 'audio/l1.mp3']);
  assert.ok(existsSync(dist + '/audio/l1.mp3') && !existsSync(dist + '/audio/l1.m4a'));
  assert.match(readFileSync(dist + '/app.js', 'utf8'), /audio\/l1\.mp3/);
  assert.match(readFileSync(dist + '/player.html', 'utf8'), /^<title>A &lt;b>/);
  assert.doesNotMatch(readFileSync(dist + '/player.html', 'utf8'), /replaceState/, 'no output named: the first one plays');
  // an artifact page has no query of its own, so the theme it plays in is set before the player reads it
  const named = await buildPlayer(load(dir + '/doc.tsx'), {artifact: true, theme: 'visotalk/light'});
  assert.match(readFileSync(named + '/player.html', 'utf8'), /history\.replaceState\(null, '', '\?theme=visotalk%2Flight'\)/);
});

test('init: a vertical script gets a 9:16 canvas and word captions, a horizontal one the default', async () => {
  const {skeleton} = await import('../../packages/cli/src/init.ts');
  const lines = [{text: 'One.'}];
  assert.match(skeleton({title: 'T', canvas: '9x16', lines}), /canvas="9x16" exports=\{\{captions: 'words', fps: 30\}\}>/);
  assert.match(skeleton({title: 'T', lines}), /canvas="16x9">/);
  assert.doesNotMatch(skeleton({title: 'T', lines}), /exports=/);
});
