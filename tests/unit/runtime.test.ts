import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {Doc, Part, Scene} from '../../packages/jsx/index.ts';
import {partBodies} from '../../packages/runtime/src/bodies.ts';
import {installParentBridge} from '../../packages/runtime/src/bridge.ts';
import {Clock} from '../../packages/runtime/src/clock.ts';

// the runtime's own copy of React: the one that made the elements must be the one that reads them
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const React = createRequire(new URL('../../packages/runtime/src/bodies.ts', import.meta.url))('react') as any;

test('the children of every part are found by the scene and part that hold them', () => {
  const fn = () => React.createElement('b', null, 'drawn');
  const text = React.createElement('i', null, 'plain element');
  const doc = React.createElement(Doc, {id: 'd', title: 't', lang: 'en'},
    React.createElement(Part, {id: 'frame'}, text),
    React.createElement(Scene, {id: 'a'}, React.createElement(Part, {id: 'p'}, fn), React.createElement(Part, {id: 'q'}, text), false, null),
    React.createElement(Scene, {id: 'b'}, [React.createElement(Part, {key: 'p', id: 'p'}, text)]));
  const bodies = partBodies(doc);
  assert.deepEqual([...bodies.keys()].sort(), [':frame', 'a:p', 'a:q', 'b:p']);
  assert.equal(bodies.get('a:p'), fn, 'a function child is kept as it is: the stage calls it as a component');
  assert.equal(bodies.get(':frame'), text);
  assert.equal(bodies.get('b:p'), text);
});

/** A window with a parent frame, and what the parent hears and sends. */
function framed() {
  const heard: unknown[] = [];
  const parent = {postMessage: (m: unknown) => void heard.push(m)};
  let listener: (e: {source: unknown; data: unknown}) => void = () => {};
  const win = {parent, addEventListener: (_: 'message', fn: typeof listener) => void (listener = fn)};
  return {win, parent, heard, send: (data: unknown, source: unknown = parent) => listener({source, data})};
}

test('a framed player tells its parent where it is and obeys the parent, and nobody else', () => {
  const f = framed();
  const clock = new Clock(60, 'live');
  installParentBridge(clock, f.win, () => 0);
  assert.deepEqual(f.heard.at(-1), {vt: 'state', t: 0, playing: false, duration: 60}, 'it says where it is as soon as it is up');
  f.send({vt: 'seek', t: 12.5});
  assert.equal(clock.getTime(), 12.5);
  assert.deepEqual(f.heard.at(-1), {vt: 'state', t: 12.5, playing: false, duration: 60});
  f.send({vt: 'seek', t: 30}, {postMessage() {}});
  assert.equal(clock.getTime(), 12.5, 'a message from anything but the parent is not heard');
  f.send({vt: 'seek', t: Number.NaN});
  f.send({vt: 'seek', t: 'soon'});
  f.send(null);
  f.send('seek');
  assert.equal(clock.getTime(), 12.5, 'a seek that is not a finite number is refused, and so is anything that is not a message');
  // the clock's own frame loop needs a browser: it is stood in for, and not run
  const g = globalThis as unknown as Record<string, unknown>;
  g.requestAnimationFrame = () => 1;
  g.cancelAnimationFrame = () => {};
  f.send({vt: 'play'});
  assert.equal(clock.isPlaying(), true);
  f.send({vt: 'pause'});
  assert.equal(clock.isPlaying(), false);
});

test('a player on its own page installs no bridge', () => {
  const win: {parent: unknown; addEventListener(...a: unknown[]): void} = {parent: null, addEventListener: () => assert.fail('listened')};
  win.parent = win;
  installParentBridge(new Clock(10, 'live'), win as never);
});

test('the parent can solo a part, and nobody else can', () => {
  const f = framed();
  const soloed: Array<string | null> = [];
  installParentBridge(new Clock(10, 'live'), f.win, () => 0, undefined, undefined, (part) => soloed.push(part));
  f.send({vt: 'solo', part: 'sky'});
  f.send({vt: 'solo', part: 'sky'}, {postMessage() {}});
  f.send({vt: 'solo'});
  f.send({vt: 'solo', part: 3});
  assert.deepEqual(soloed, ['sky', null, null], 'a part id solos it, and anything else lifts it');
});

test('normal playback clears preview solo, including playback started inside the player', () => {
  const f = framed();
  const clock = new Clock(10, 'live');
  const soloed: Array<string | null> = [];
  installParentBridge(clock, f.win, () => 0, undefined, undefined, (part) => soloed.push(part));
  const g = globalThis as unknown as Record<string, unknown>;
  const saved = { raf: g.requestAnimationFrame, caf: g.cancelAnimationFrame };
  g.requestAnimationFrame = () => 1;
  g.cancelAnimationFrame = () => {};
  try {
    f.send({ vt: 'solo', part: 'pic' });
    f.send({ vt: 'play' });
    assert.equal(soloed.at(-1), null);
    clock.pause();
    f.send({ vt: 'solo', part: 'other' });
    clock.play();
    assert.equal(soloed.at(-1), null);
  } finally {
    clock.pause();
    g.requestAnimationFrame = saved.raf;
    g.cancelAnimationFrame = saved.caf;
  }
});

test('qa: a clipped element is named with its size and the size its content needs, so which box to fix is not a guess', async () => {
  const {frameIssues} = await import('../../packages/exporter/src/qa.ts');
  const object = {id: 'cfile', parent: null, box: {x: 0, y: 0, w: 1600, h: 580}, ink: {x: 0, y: 0, w: 1600, h: 580}, opacity: 1, clipped: [{what: 'div.file: "greeting.txt"', overflowX: 4, overflowY: 16, box: {w: 1596, h: 580}, content: {w: 1600, h: 596}}]};
  const issues = frameIssues({width: 1920, height: 1080, objects: [object], texts: [], crossings: [], registered: [], registeredGlobal: [], caption: null}, 0, '0.4s');
  assert.equal(issues.length, 1);
  assert.match(issues[0]!.message, /div\.file/);
  assert.match(issues[0]!.message, /1596×580px and its content needs 1600×596px/);
  assert.match(issues[0]!.fix ?? '', /at least the size its content needs/);
});

test('the parent can hand the player a new document, and nobody else can', () => {
  const heard: unknown[] = [];
  const parent = {postMessage() {}};
  let listener: ((e: {source: unknown; data: unknown}) => void) | undefined;
  const win = {parent, addEventListener: (_t: 'message', l: (e: {source: unknown; data: unknown}) => void) => void (listener = l)};
  installParentBridge(new Clock(10, 'live'), win as never, () => 0, (doc, voice) => void heard.push({doc, voice}));
  const send = (data: unknown, source: unknown = parent) => listener!({source, data});
  send({vt: 'setDocument', doc: {meta: {}}, voice: {l1: {}}});
  send({vt: 'setDocument', doc: {meta: {}}, voice: {}}, {postMessage() {}});
  send({vt: 'setDocument', doc: 'text', voice: {}});
  send({vt: 'setDocument', doc: {}});
  assert.deepEqual(heard, [{doc: {meta: {}}, voice: {l1: {}}}], 'only the parent\'s message with a document and a voice is taken');
});

test('a clock that is given a new length keeps its time inside it', () => {
  const clock = new Clock(60, 'live');
  clock.seek(50);
  clock.setDuration(80);
  assert.equal(clock.getTime(), 50);
  clock.setDuration(30);
  assert.equal(clock.duration, 30);
  assert.equal(clock.getTime(), 30, 'a time past the new end is brought back to it');
});

test('a live clock stands still while media is held, and goes on from where it stood', async () => {
  const frames: ((now: number) => void)[] = [];
  const g = globalThis as unknown as Record<string, unknown>;
  const saved = {raf: g.requestAnimationFrame, caf: g.cancelAnimationFrame};
  g.requestAnimationFrame = (f: (now: number) => void) => frames.push(f);
  g.cancelAnimationFrame = () => {};
  try {
    const clock = new Clock(60, 'live');
    const now = performance.now();
    clock.play();
    clock.seek(10);
    let release!: () => void;
    clock.hold(new Promise<void>((r) => (release = r)));
    assert.equal(clock.isBuffering(), true);
    frames.shift()!(now + 5000);
    assert.equal(clock.getTime(), 10, 'time does not move while a hold is pending, and the wait is not owed afterwards');
    assert.equal(clock.isPlaying(), true, 'it is still playing');
    release();
    await Promise.resolve();
    assert.equal(clock.isBuffering(), false);
    frames.shift()!(now + 5500);
    assert.ok(Math.abs(clock.getTime() - 10.5) < 1e-6, 'it goes on from where it stood');
    clock.pause();
  } finally {
    g.requestAnimationFrame = saved.raf;
    g.cancelAnimationFrame = saved.caf;
  }
});

test('qa: the words block of a tall frame must end 200 px above the bottom, and a line of words in a box is not held to it', async () => {
  const {frameIssues} = await import('../../packages/exporter/src/qa.ts');
  const tall = (caption: {x: number; y: number; w: number; h: number}, captionWords?: boolean) =>
    frameIssues({width: 1080, height: 1920, objects: [], texts: [], crossings: [], registered: [], registeredGlobal: [], caption, ...(captionWords && {captionWords})}, 0, '1s');
  assert.deepEqual(tall({x: 72, y: 1012, w: 936, h: 700}, true), [], 'ends at 1712: inside');
  const out = tall({x: 72, y: 1012, w: 936, h: 713}, true);
  assert.deepEqual(out.map((i) => i.code), ['caption-safe']);
  assert.match(out[0].message, /ends at y 1725, past y 1720/);
  assert.deepEqual(tall({x: 72, y: 1650, w: 936, h: 160}), [], 'a burned caption sits near the bottom by design');
});

test('the parent can ask which words are drawn at a point, and nobody else can', () => {
  const sent: unknown[] = [];
  const parent = {postMessage: (m: unknown) => sent.push(m)};
  let listener: ((e: {source: unknown; data: unknown}) => void) | undefined;
  const win = {parent, addEventListener: (_: 'message', l: typeof listener) => void (listener = l)};
  installParentBridge(new Clock(10, 'live'), win as never, () => 0, undefined, {at: (fx, fy) => (fx === 0.5 && fy === 0.25 ? 'Hello' : null), fit: (words) => (words === 'long' ? 'overflow' : null)});
  sent.length = 0;
  listener!({source: {}, data: {vt: 'textAt', req: 1, fx: 0.5, fy: 0.25}});
  assert.deepEqual(sent, []);
  listener!({source: parent, data: {vt: 'textAt', req: 1, fx: 0.5, fy: 0.25}});
  listener!({source: parent, data: {vt: 'textAt', req: 2, fx: 0.9, fy: 0.9}});
  assert.deepEqual(sent, [{vt: 'text', req: 1, hit: 'Hello'}, {vt: 'text', req: 2, hit: null}]);
  sent.length = 0;
  listener!({source: parent, data: {vt: 'textFit', req: 3, words: 'long'}});
  assert.deepEqual(sent, [{vt: 'fit', req: 3, problem: 'overflow'}]);
});

test('a hold taken through the readiness barrier stops a live clock until it settles, and a promise that never settles is let go', async () => {
  const {Readiness, within} = await import('../../packages/runtime/src/readiness.ts');
  const clock = new Clock(60, 'live');
  let release!: () => void;
  void new Readiness(clock).hold(new Promise<void>((r) => (release = r)));
  assert.equal(clock.isBuffering(), true);
  release();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(clock.isBuffering(), false);
  const warn = console.warn;
  console.warn = () => {};
  try {
    await within(new Promise(() => {}), 10, 'a stuck part');
  } finally {
    console.warn = warn;
  }
});
