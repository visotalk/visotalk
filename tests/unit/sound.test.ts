import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MarkupError, parseMarkup, soundGain, solve, speechAt, validate, type VisoDoc, type VoiceManifest} from '../../packages/ir/src/index.ts';

const ASSETS = `<Asset id="bed" kind="audio" src="bed.mp3" license={{id: "user-owned", obligations: []}}/><Asset id="tick" kind="audio" src="tick.wav" license={{id: "user-owned", obligations: []}}/><Asset id="pic" kind="image" src="p.png" license={{id: "user-owned", obligations: []}}/>`;
const doc = (scenes: string): VisoDoc => parseMarkup(`export default <Doc id="d" title="t" lang="en">${ASSETS}${scenes}</Doc>;`).doc;
/** every line 2 s long: scene a is 0 to 5.6 (lead .4, two lines + holds, tail .8), scene b from 5.6 */
const voice = (d: VisoDoc): VoiceManifest => Object.fromEntries(d.scenes.flatMap((s) => s.lines).map((l) => [l.id, {duration: 2, audio: `${l.id}.wav`}]));
const codes = (d: VisoDoc) => validate(d).map((i) => i.code);

const FILM = doc(`
  <Scene id="a"><Line id="l1">One two three.</Line><Line id="l2">Four five six.</Line>
    <Sound asset="bed" at="start" loop volume={-8} duck={6} fadeIn={1} fadeOut={2}/>
    <Sound id="t" asset="tick" line="l2" word="five" volume={-3}/></Scene>
  <Scene id="b"><Line id="l3">Seven.</Line></Scene>`);

test('markup: a <Sound> in a scene, its anchor and its numbers, and nothing for what it leaves out', () => {
  const [bed, tick] = FILM.scenes[0].sounds!;
  assert.deepEqual(bed, {asset: 'bed', at: {scene: 'start'}, loop: true, volume: -8, duck: 6, fadeIn: 1, fadeOut: 2});
  assert.deepEqual(tick, {id: 't', asset: 'tick', at: {line: 'l2', word: 'five'}, volume: -3});
  assert.equal(FILM.scenes[1].sounds, undefined);
  assert.throws(() => doc('<Scene id="a"><Line id="l">x</Line><Sound at="start"/></Scene>'), MarkupError);
  assert.throws(() => doc('<Scene id="a"><Line id="l">x</Line><Sound asset="bed" volume="loud" at="start"/></Scene>'), /volume of <Sound> is a number/);
  assert.throws(() => doc('<Scene id="a"><Line id="l">x</Line><Sound asset="bed" after="x"/></Scene>'), /no attribute "after"/);
});

test('validator: a sound names an audio asset, starts on a place, and has sane numbers', () => {
  assert.deepEqual(validate(FILM), []);
  assert.deepEqual(codes(doc('<Scene id="a"><Line id="l">x</Line><Sound asset="nope" at="start"/></Scene>')), ['sound.asset']);
  assert.deepEqual(codes(doc('<Scene id="a"><Line id="l">x</Line><Sound asset="pic" at="start"/></Scene>')), ['sound.asset'], 'an image is not a sound');
  assert.deepEqual(codes(doc('<Scene id="a"><Line id="l">x y</Line><Sound asset="bed" line="l" word="nope"/></Scene>')), ['anchor.word']);
  assert.deepEqual(codes(doc('<Scene id="a"><Line id="l">x</Line><Sound asset="bed" at="start" fadeOut={2}/></Scene>')), ['sound.params'], 'a fade out needs an end: dur, or loop');
  assert.deepEqual(codes(doc('<Scene id="a"><Line id="l">x</Line><Sound asset="bed" at="start" duck={-3}/></Scene>')), ['sound.params']);
  assert.ok(validate(doc('<Scene id="a"><Line id="l">x</Line><Sound asset="nope" at="start"/></Scene>'))[0].fix);
});

test('solver: sounds start on their anchors; a loop without dur lasts to the end of the film', () => {
  const c = solve(FILM, voice(FILM));
  assert.equal(c.sounds.length, 2);
  const [bed, tick] = c.sounds;
  assert.deepEqual([bed.start, bed.end, bed.volume, bed.duck, bed.loop], [0, c.duration, -8, 6, true]);
  assert.equal(tick.end, undefined, 'a single play of a file: the solver does not know its length');
  const l2 = c.scenes[0].lines[1];
  assert.ok(tick.start > l2.from && tick.start < l2.from + l2.duration, 'on a word of the line');
});

test('solver: a single play of a built audio file ends with the file, to the millisecond; dur still wins', () => {
  const built = structuredClone(FILM);
  built.assets!.find((a) => a.id === 'tick')!.analysis = {duration: 0.4321};
  const tick = solve(built, voice(built)).sounds[1];
  assert.ok(Math.abs(tick.end! - (tick.start + 0.4321)) < 1e-9, 'not snapped to a frame');
  built.scenes[0].sounds![1].dur = 0.2;
  const short = solve(built, voice(built)).sounds[1];
  assert.equal(short.end, Math.round((short.start + 0.2) * 30) / 30);
});

test('soundGain: dB, fades in and out, and a step back while the narration speaks', () => {
  const c = solve(FILM, voice(FILM));
  const bed = c.sounds[0];
  const l1 = c.scenes[0].lines[0];
  // outside the sound: silent
  assert.equal(soundGain(c, bed, -1), 0);
  assert.equal(soundGain(c, bed, c.duration), 0);
  // volume −8 dB with no duck where nobody speaks (after the last line and its release, before the fade out)
  const quiet = {...bed, duck: 0, fadeIn: 0, fadeOut: 0};
  assert.ok(Math.abs(soundGain(c, quiet, 3) - 10 ** (-8 / 20)) < 1e-9);
  // ducked: 6 dB less while a line is spoken
  const mid = l1.from + l1.duration / 2;
  assert.ok(Math.abs(soundGain(c, {...bed, fadeIn: 0, fadeOut: 0}, mid) - 10 ** (-14 / 20)) < 1e-9);
  // fade in over 1 s from the start; fade out over 2 s to the end
  assert.ok(soundGain(c, {...quiet, fadeIn: 1}, 0.5) < soundGain(c, {...quiet, fadeIn: 1}, 1) * 0.55);
  assert.ok(Math.abs(soundGain(c, {...quiet, fadeOut: 2}, c.duration - 1) - soundGain(c, quiet, 1) / 2) < 1e-6);
});

test('speechAt: a short ramp in before a line, and a release that holds through the pause between lines', () => {
  const c = solve(FILM, voice(FILM));
  const [l1, l2] = c.scenes[0].lines;
  assert.equal(speechAt(c, l1.from + 1), 1);
  assert.equal(speechAt(c, l1.from - 1), 0);
  assert.ok(speechAt(c, l1.from - 0.06) > 0 && speechAt(c, l1.from - 0.06) < 1);
  const gap = (l1.from + l1.duration + l2.from) / 2; // between the lines: 0.2 s after the first ends
  assert.ok(speechAt(c, gap) > 0.5, 'the pause between two lines does not let the music swell');
  assert.equal(speechAt(c, c.scenes[1].lines[0].from + c.scenes[1].lines[0].duration + 1), 0);
});

test('muxAudio: narration alone is as long as the picture and sits at -16 LUFS in stereo', async () => {
  const {mkdtempSync, rmSync} = await import('node:fs');
  const {execFileSync, spawnSync} = await import('node:child_process');
  const {tmpdir} = await import('node:os');
  const {join} = await import('node:path');
  const {muxAudio} = await import('../../packages/exporter/src/index.ts');
  const dir = mkdtempSync(join(tmpdir(), 'visotalk-mux-'));
  try {
    const ff = (...a: string[]) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a]);
    ff('-f', 'lavfi', '-i', 'color=c=black:s=64x64:d=4:r=10', '-pix_fmt', 'yuv420p', join(dir, 'v.mp4'));
    ff('-f', 'lavfi', '-i', 'sine=f=300:d=1.5', '-ac', '1', '-ar', '24000', join(dir, 'n.wav'));
    await muxAudio(join(dir, 'v.mp4'), join(dir, 'out.mp4'), 0, 4, {narration: [{at: 0.5, src: 'n.wav'}], sounds: [], envelopes: []} as never, dir);
    const probe = (entry: string, stream: string) => execFileSync('ffprobe', ['-v', 'error', '-select_streams', stream, '-show_entries', entry, '-of', 'csv=p=0', join(dir, 'out.mp4')]).toString().trim();
    assert.ok(Math.abs(Number(probe('stream=duration', 'a:0')) - 4) < 0.1, 'the audio runs to the end of the picture');
    assert.equal(probe('stream=channels', 'a:0'), '2');
    const {stderr} = spawnSync('ffmpeg', ['-nostats', '-i', join(dir, 'out.mp4'), '-af', 'ebur128', '-f', 'null', '-'], {encoding: 'utf8'});
    const lufs = Number(/I:\s+(-?[\d.]+) LUFS/.exec(stderr.slice(stderr.lastIndexOf('Summary')))![1]);
    assert.ok(Math.abs(lufs + 16) < 1, `integrated loudness ${lufs} LUFS`);
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
});
