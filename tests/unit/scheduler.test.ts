import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mediaHints, parseMarkup, solve, soundGain, type VisoDoc, type VoiceManifest} from '../../packages/ir/src/index.ts';
import {Clock} from '../../packages/runtime/src/clock.ts';
import {MediaScheduler, gainCurve} from '../../packages/runtime/src/media.ts';

const LIC = `license={{id: "user-owned", obligations: []}}`;
const parse = (scenes: string): VisoDoc => {
  const doc = parseMarkup(`export default <Doc id="d" title="t" lang="en">
  <Asset id="tick" kind="audio" src="assets/tick.wav" ${LIC}/>
  <Asset id="bed" kind="audio" src="assets/bed.wav" ${LIC}/>
  ${scenes}</Doc>;`).doc;
  doc.assets!.find((a) => a.id === 'tick')!.analysis = {duration: 0.5};
  doc.assets!.find((a) => a.id === 'bed')!.analysis = {duration: 1};
  return doc;
};
const FILM = (extra = '') => parse(`<Scene id="a"><Line id="l1">One two three.</Line><Line id="l2">Four five six.</Line>
    <Sound id="t" asset="tick" line="l2" word="five" volume={-3}/>${extra}</Scene>`);
const voice = (d: VisoDoc): VoiceManifest => Object.fromEntries(d.scenes.flatMap((s) => s.lines).map((l) => [l.id, {duration: 2, audio: `audio/${l.id}.m4a`}]));

/** The parts of a browser the scheduler touches: an audio clock we advance by hand, and nodes that remember how they were started */
class Node_ {
  connected: unknown[] = [];
  connect(n: unknown) { this.connected.push(n); return n; }
  disconnect() { this.connected = []; }
}
class FakeGain extends Node_ {
  curves: Array<{values: Float32Array; at: number; dur: number}> = [];
  gain = {value: 1, setValueCurveAtTime: (values: Float32Array, at: number, dur: number) => this.curves.push({values, at, dur}), setTargetAtTime: () => {}};
}
class FakeSource extends Node_ {
  buffer: {duration: number} | null = null;
  loop = false;
  onended: (() => void) | null = null;
  started?: {when: number; offset: number};
  stopped?: number;
  start(when: number, offset: number) { this.started = {when, offset}; }
  stop(when = 0) { this.stopped = when; }
}
class FakeCtx {
  currentTime = 0;
  state = 'running';
  destination = new Node_();
  sources: FakeSource[] = [];
  gains: FakeGain[] = [];
  createGain() { const g = new FakeGain(); this.gains.push(g); return g; }
  createBufferSource() { const s = new FakeSource(); this.sources.push(s); return s; }
  createBuffer() { return {duration: 0}; }
  addEventListener() {}
  resume() { return Promise.resolve(); }
  /** the bytes of a file say how long it is: a thousand to the second */
  decodeAudioData(data: ArrayBuffer) { return Promise.resolve({duration: data.byteLength / 1000, length: data.byteLength * 48, numberOfChannels: 1}); }
}

interface Rig {
  clock: Clock;
  ctx: FakeCtx;
  media: MediaScheduler;
  requested: string[];
  /** a file's bytes are not delivered until this is called */
  gate: Map<string, () => void>;
  /** one animation frame, `dt` seconds later on both clocks */
  frame(dt: number): void;
  settle(): Promise<void>;
}

/** `lengths` by file name: how long each file is, in seconds; a name in `slow` is delivered when `gate.get(name)()` is called */
async function rig(lengths: Record<string, number>, slow: string[] = []): Promise<(doc: VisoDoc, v: VoiceManifest) => Rig> {
  return (doc, v) => {
    const frames: ((now: number) => void)[] = [];
    const g = globalThis as unknown as Record<string, unknown>;
    g.requestAnimationFrame = (f: (now: number) => void) => frames.push(f);
    g.cancelAnimationFrame = () => {};
    const requested: string[] = [];
    const gate = new Map<string, () => void>();
    const ctx = new FakeCtx();
    const compiled = solve(doc, v, 30);
    const clock = new Clock(compiled.duration, 'live');
    const fetchFake = (async (url: string) => {
      requested.push(url);
      const name = url.split('/').pop()!;
      if (slow.includes(name)) await new Promise<void>((ok) => gate.set(name, ok));
      return {ok: true, arrayBuffer: async () => new ArrayBuffer((lengths[name] ?? 1) * 1000)};
    }) as unknown as typeof fetch;
    const media = new MediaScheduler(clock, '', {AudioContext: function () { return ctx; } as unknown as typeof AudioContext, fetch: fetchFake});
    media.set({doc, compiled});
    let now = 1000;
    return {
      clock, ctx, media, requested, gate,
      frame(dt) { ctx.currentTime += dt; now += dt * 1000; frames.shift()?.(now); },
      settle: () => new Promise((r) => setTimeout(r, 5)),
    };
  };
}

test('gainCurve: the document\'s gain every 20 ms, from the first instant to the last', () => {
  const c = Float32Array.from([0, 0.5, 1]);
  assert.deepEqual([...gainCurve((t) => t / 2, 0, 2, 1)], [...c]);
  assert.equal(gainCurve(() => 1, 3, 3.001).length, 2);
  assert.equal(gainCurve(() => 1, 0, 120).length, 6001);
});

test('look-ahead: the next ten seconds are fetched, narration before sounds, once per file, four at a time', async () => {
  const make = await rig({'l1.m4a': 2, 'l2.m4a': 2, 'tick.wav': 0.5}, ['l1.m4a', 'l2.m4a', 'tick.wav']);
  const doc = FILM();
  const r = make(doc, voice(doc));
  await r.settle();
  assert.deepEqual(r.requested, ['audio/l1.m4a', 'audio/l2.m4a', 'assets/tick.wav'], 'a clip at the start, the next clip, the sound that sounds in it');
  r.gate.get('l1.m4a')!();
  await r.settle();
  assert.equal(r.requested.length, 3, 'nothing is fetched twice');
});

test('sounding: each use is a node started on the audio clock at its time, with the gain curve of the document', async () => {
  const make = await rig({'l1.m4a': 2, 'l2.m4a': 2, 'tick.wav': 0.5});
  const doc = FILM();
  const r = make(doc, voice(doc));
  const c = solve(doc, voice(doc), 30);
  await r.settle();
  r.ctx.currentTime = 10; // the audio clock has been running for a while
  r.clock.play();
  // narration: the first line is due at its time on the audio clock, from its start
  const [l1, l2] = c.scenes[0].lines;
  r.frame(0.016);
  r.frame(0.016);
  for (let i = 0; i < 400 && r.ctx.sources.length < 3; i++) r.frame(0.016);
  const [s1, s2, s3] = r.ctx.sources;
  assert.ok(Math.abs(s1.started!.when - (10 + l1.from)) < 1e-9 && s1.started!.offset === 0, 'the line begins at its time, from its first sample');
  assert.ok(s2.started!.when > s1.started!.when);
  const tick = c.sounds[0];
  assert.ok(Math.abs(s3.started!.when - (10 + tick.start)) < 1e-9, `the sound is on the audio clock at ${tick.start}: ${s3.started!.when}`);
  assert.equal(s3.stopped, undefined, 'it ends with its file');
  const curve = r.ctx.gains.find((g) => g.curves.length)!.curves[0];
  assert.ok(Math.abs(curve.at - (10 + tick.start)) < 1e-9 && Math.abs(curve.dur - 0.5) < 1e-9);
  assert.ok(Math.abs(curve.values[1] - soundGain(c, tick, tick.start + curve.dur / (curve.values.length - 1))) < 1e-6, 'the curve is the document\'s own gain');
  assert.ok(Math.abs(Math.max(...curve.values) - 10 ** (-3 / 20)) < 1e-4, 'volume -3 dB');
  assert.equal(r.media.stats.starts.length, 1);
  assert.ok(Math.abs(r.media.stats.starts[0].at - r.media.stats.starts[0].due) < 1e-9 && r.media.stats.starts[0].late === 0);
  void l2;
  r.clock.pause();
});

test('a narration clip that has not arrived when its line begins stops the clock, and begins at the right place when it does', async () => {
  const make = await rig({'l1.m4a': 2, 'l2.m4a': 2, 'tick.wav': 0.5}, ['l1.m4a']);
  const doc = FILM();
  const r = make(doc, voice(doc));
  await r.settle();
  r.clock.play();
  r.frame(0.016);
  assert.equal(r.clock.isBuffering(), false, 'nothing is due at 0');
  r.clock.seek(0.9); // inside the first line
  r.frame(0.016);
  assert.equal(r.clock.isBuffering(), true, 'the clip is not here: the clock waits for it');
  assert.equal(r.ctx.sources.length, 0, 'and nothing sounds meanwhile');
  r.ctx.currentTime += 3; // the wait: the audio clock goes on while the document's stands still, and is read again when playing goes on
  r.gate.get('l1.m4a')!();
  await r.settle();
  assert.equal(r.clock.isBuffering(), false);
  r.frame(0.016);
  r.frame(0.016);
  const s = r.ctx.sources[0];
  assert.ok(s, 'the clip is started');
  const at = r.clock.getTime();
  assert.ok(Math.abs(s.started!.offset - (at - 0.4)) < 0.1, `it joins ${s.started!.offset} s into the clip at ${at} s, the line having begun at 0.4`);
  r.clock.pause();
});

test('a single sound that is late by more than a blink is left out, one that is not here for a bed joins part-way, and a seek starts everything again', async () => {
  const make = await rig({'l1.m4a': 2, 'l2.m4a': 2, 'tick.wav': 0.5, 'bed.wav': 1}, ['tick.wav']);
  const doc = FILM(`<Sound asset="bed" at="start" loop volume={-8}/>`);
  const r = make(doc, voice(doc));
  const c = solve(doc, voice(doc), 30);
  await r.settle();
  r.clock.play();
  for (let i = 0; i < 400 && r.clock.getTime() < c.sounds.find((s) => s.asset === 'tick')!.start + 0.6; i++) r.frame(0.016);
  assert.equal(r.media.stats.skipped, 1, 'the tick was not decoded in time, and is left out');
  assert.equal(r.media.stats.starts.filter((s) => s.src.endsWith('tick.wav')).length, 0);
  const bed = r.media.stats.starts.find((s) => s.src.endsWith('bed.wav'))!;
  assert.ok(bed && Math.abs(bed.at - bed.due) < 1e-9, 'the bed began with the film');
  const before = r.ctx.sources.length;
  r.clock.seek(1);
  r.frame(0.016);
  const started = r.ctx.sources.slice(before);
  assert.ok(started.length >= 1, 'after a seek the bed is started again');
  const resumed = started.find((s) => s.loop)!;
  assert.ok(Math.abs(resumed.started!.offset - (1.01 % 1)) < 0.05, `at the right place in the file: ${resumed.started!.offset}`);
  assert.ok(r.ctx.sources.slice(0, before).every((s) => s.stopped !== undefined), 'what was sounding is stopped');
  r.clock.pause();
});

test('a new document keeps what is loaded by address and fetches only what is new', async () => {
  const make = await rig({'l1.m4a': 2, 'l2.m4a': 2, 'tick.wav': 0.5, 'l3.m4a': 2});
  const doc = FILM();
  const r = make(doc, voice(doc));
  await r.settle();
  const first = r.requested.length;
  const edited = FILM();
  edited.scenes[0].lines[1].text = 'Four five six seven.';
  const v = voice(edited);
  v.l2 = {duration: 3, audio: 'audio/l3.m4a'};
  r.media.set({doc: edited, compiled: solve(edited, v, 30)});
  await r.settle();
  assert.deepEqual(r.requested.slice(first), ['audio/l3.m4a'], 'the reworded line has a new clip; the others are the ones already here');
});

test('what is further ahead than ten seconds waits until the connection is idle, and is then fetched two at a time', async () => {
  const make = await rig({'l1.m4a': 2, 'l2.m4a': 2, 'tick.wav': 0.5, 'bed.wav': 1}, ['l1.m4a', 'l2.m4a', 'tick.wav', 'bed.wav']);
  const doc = parse(`<Scene id="a" duration={40}><Line id="l1">One.</Line><Line id="l2">Two.</Line>
    <Sound id="t1" asset="tick" at={2} volume={-3}/><Sound id="t2" asset="bed" at={30} volume={-3}/></Scene>`);
  const r = make(doc, voice(doc));
  await r.settle();
  assert.deepEqual(r.requested.sort(), ['assets/tick.wav', 'audio/l1.m4a', 'audio/l2.m4a'], 'the sound at 30 s is not asked for while the next ten seconds are still being fetched');
  for (const name of ['l1.m4a', 'l2.m4a', 'tick.wav']) r.gate.get(name)!();
  await r.settle();
  assert.ok(r.requested.includes('assets/bed.wav'), 'once they are here the connection is idle, and the far sound comes');
});

test('a picture whose part is on screen stops the clock until it has arrived, however the part draws it, and one with no known window does not', async () => {
  const parsed = parseMarkup(`export default <Doc id="d" title="t" lang="en">
  <Asset id="bg" kind="image" src="assets/bg.jpg" ${LIC}/>
  <Asset id="later" kind="image" src="assets/later.jpg" ${LIC}/>
  <Asset id="lost" kind="image" src="assets/lost.jpg" ${LIC}/>
  <Scene id="a" duration={20}><Line id="l1">One.</Line>
    <Part id="p" x={0} y={0} w={100} h={100}>{() => <div style={{backgroundImage: \`url(\${useAsset("bg")})\`}} />}</Part>
    <Part id="q" x={0} y={0} w={100} h={100}>{() => <div style={{backgroundImage: \`url(\${useAsset("later")})\`}} />}</Part>
    <Animation><Appear target="p" at={2}/><Appear target="q" at={12}/></Animation></Scene></Doc>;`);
  const doc = structuredClone(parsed.doc);
  doc['x-media'] = mediaHints(parsed.doc, '', {});
  const gates = new Map<string, () => void>();
  const g = globalThis as unknown as Record<string, unknown>;
  g.Image = class {
    src = '';
    decoding = '';
    naturalWidth = 10;
    naturalHeight = 10;
    decode() { return new Promise<void>((ok) => gates.set(this.src, ok)); }
  };
  const frames: ((now: number) => void)[] = [];
  g.requestAnimationFrame = (f: (now: number) => void) => frames.push(f);
  g.cancelAnimationFrame = () => {};
  const v = { l1: { duration: 1, audio: 'audio/l1.m4a' } };
  const compiled = solve(doc, v, 30);
  const clock = new Clock(compiled.duration, 'live');
  const fetchFake = (async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1000) })) as unknown as typeof fetch;
  const media = new MediaScheduler(clock, '', { AudioContext: function () { return new FakeCtx(); } as unknown as typeof AudioContext, fetch: fetchFake });
  media.set({ doc, compiled });
  clock.play();
  assert.equal(clock.isBuffering(), false, 'nothing on screen at 0');
  clock.seek(2.5);
  assert.equal(clock.isBuffering(), true, 'the picture of a part that has appeared is not here');
  assert.ok(gates.has('assets/bg.jpg'));
  gates.get('assets/bg.jpg')!();
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(clock.isBuffering(), false, 'and the clock goes on when it is');
  clock.seek(5);
  assert.equal(clock.isBuffering(), false, 'a picture that is not on screen yet is fetched, not waited for');
  clock.pause();
});
