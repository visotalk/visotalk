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
