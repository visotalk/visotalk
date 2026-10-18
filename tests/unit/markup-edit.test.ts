import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyEdits, EditError, parseMarkup, validate} from '../../packages/ir/src/index.ts';

const SRC = `import {Doc, Scene, Line, Part, Animation, Appear, Tween} from '@visotalk/jsx';
const COLOUR = 'red'; // the module's own code
export default (<Doc id="d" title="t" lang="en" canvas="16x9">
  <Part id="frame" x={0} y={0} w={1920} h={1080}>{() => <div style={{color: COLOUR}}>frame {"<b>"}</div>}</Part>
  <Scene id="one">
    <Line id="l1" hold={1}>Bars that grow, like a red apple and pears.</Line>
    <Line id="l2">Then a second thought.</Line>
    <Part id="bars" x={100} y={200} w={600}>{() => <div>bars</div>}</Part>
    <Animation>
      <Appear id="a1" on="bars" line="l1" word="red apple"/>
      <Tween id="a2" on="bars" w={1100} line="l1" word="pears" dur={1.4} easing="easeOut"/>
      <Appear on="frame" line="l2"/>
    </Animation>
  </Scene>
</Doc>);
`;
const doc = (src: string) => parseMarkup(src).doc;

test('edit: the words and hold of a line, and nothing else in the file changes', () => {
  const out = applyEdits(SRC, [{op: 'line', scene: 'one', line: 'l1', say: 'Bars that grow, like a red apple & pears.', hold: 2}]);
  assert.equal(doc(out).scenes[0].lines[0].text, 'Bars that grow, like a red apple & pears.');
  assert.equal(doc(out).scenes[0].lines[0].hold, 2);
  assert.ok(out.includes('&amp;'));
  assert.equal(out.replace('Bars that grow, like a red apple &amp; pears.', 'X').replace('hold={2}', 'hold={1}'), SRC.replace('Bars that grow, like a red apple and pears.', 'X'), 'the rest of the file is as it was');
  assert.equal(doc(applyEdits(SRC, [{op: 'line', scene: 'one', line: 'l1', hold: null}])).scenes[0].lines[0].hold, undefined);
  assert.equal(doc(applyEdits(SRC, [{op: 'line', scene: 'one', line: 'l2', hold: 0.5}])).scenes[0].lines[1].hold, 0.5);
});

test('edit: words that an animation hangs on may not be taken away, and the engine says which', () => {
  assert.throws(() => applyEdits(SRC, [{op: 'line', scene: 'one', line: 'l1', say: 'Bars that grow.'}]), (e: Error) => e instanceof EditError && /no longer be valid/.test(e.message));
  assert.throws(() => applyEdits(SRC, [{op: 'line', scene: 'one', line: 'l1', say: '   '}]), /no words/);
  assert.throws(() => applyEdits(SRC, [{op: 'line', scene: 'one', line: 'nope', hold: 1}]), /no line "nope"/);
});

test('edit: a text with braces and markup characters is escaped and read back as written', () => {
  const out = applyEdits(SRC, [{op: 'line', scene: 'one', line: 'l2', say: 'Use {x} < 3 & more'}]);
  assert.equal(doc(out).scenes[0].lines[1].text, 'Use {x} < 3 & more');
});

test('edit: the box of a part, in a scene and in the document, adds, replaces and removes attributes', () => {
  const out = applyEdits(SRC, [
    {op: 'part', scene: 'one', part: 'bars', box: {x: 150, h: 300, w: null}},
    {op: 'part', scene: null, part: 'frame', box: {z: undefined, w: 1000} as never},
  ]);
  const bars = doc(out).scenes[0].parts[0];
  assert.deepEqual([bars.x, bars.y, bars.w, bars.h], [150, 200, undefined, 300]);
  assert.equal(doc(out).parts?.[0].w, 1000);
  assert.ok(out.includes("const COLOUR = 'red'; // the module's own code") && out.includes('frame {"<b>"}'), 'what a part draws is untouched');
});

test('edit: timing and values of an animation, by id or by place', () => {
  const out = applyEdits(SRC, [
    {op: 'animation', scene: 'one', animation: 'a2', set: {dur: 2, easing: 'linear', w: 900, stagger: null}},
    {op: 'animation', scene: 'one', animation: '#2', set: {dur: 0.8}},
  ]);
  const [a1, a2, a3] = doc(out).scenes[0].animations;
  assert.equal(a1.dur, undefined);
  assert.deepEqual([a2.dur, a2.easing, (a2.props as {w: number}).w], [2, 'linear', 900]);
  assert.equal(a3.dur, 0.8);
  assert.throws(() => applyEdits(SRC, [{op: 'animation', scene: 'one', animation: 'a1', set: {on: 'frame'}}]), /not set here/);
  assert.throws(() => applyEdits(SRC, [{op: 'animation', scene: 'one', animation: 'a1', set: {word: 'pears'}}]), /not set here/);
  assert.throws(() => applyEdits(SRC, [{op: 'animation', scene: 'one', animation: 'a1', set: {w: 5}}]), EditError, 'an appear has no values');
});

test('edit: an animation is anchored again on another word, another line, another animation or a time', () => {
  const onWord = applyEdits(SRC, [{op: 'anchor', scene: 'one', animation: 'a1', to: {line: 'l1', word: 'pears', edge: 'end', offset: 0.2}}]);
  assert.deepEqual(doc(onWord).scenes[0].animations[0].at, {line: 'l1', word: 'pears', edge: 'end', offset: 0.2});
  const onLine = applyEdits(SRC, [{op: 'anchor', scene: 'one', animation: '#2', to: {line: 'l1'}}]);
  assert.deepEqual(doc(onLine).scenes[0].animations[2].at, {line: 'l1'});
  const after = applyEdits(SRC, [{op: 'anchor', scene: 'one', animation: 'a2', to: {after: 'a1', offset: 0.5}}]);
  assert.deepEqual(doc(after).scenes[0].animations[1].at, {after: 'a1', offset: 0.5});
  assert.equal(doc(after).scenes[0].animations[1].props && (doc(after).scenes[0].animations[1].props as {w: number}).w, 1100, 'the values stay');
  const atTime = applyEdits(SRC, [{op: 'anchor', scene: 'one', animation: 'a1', to: {at: 2}}]);
  assert.deepEqual(doc(atTime).scenes[0].animations[0].at, {at: 2});
  assert.deepEqual(doc(applyEdits(SRC, [{op: 'anchor', scene: 'one', animation: 'a1', to: {at: 'end', offset: -1}}])).scenes[0].animations[0].at, {scene: 'end', offset: -1});
  assert.throws(() => applyEdits(SRC, [{op: 'anchor', scene: 'one', animation: 'a1', to: {line: 'l1', word: 'nothing here'}}]), EditError);
  assert.throws(() => applyEdits(SRC, [{op: 'anchor', scene: 'one', animation: 'a1', to: {after: 'a1'}}]), EditError, 'it cannot follow itself');
});

test('edit: removing an animation takes its line away, and not one another is anchored after', () => {
  const out = applyEdits(SRC, [{op: 'removeAnimation', scene: 'one', animation: 'a2'}]);
  assert.equal(doc(out).scenes[0].animations.length, 2);
  assert.equal(out, SRC.replace('      <Tween id="a2" on="bars" w={1100} line="l1" word="pears" dur={1.4} easing="easeOut"/>\n', ''));
  assert.throws(() => applyEdits(SRC, [{op: 'removeAnimation', scene: 'one', animation: '#0'}]), /never shown/, 'the only animation that shows a part cannot go');
  const chained = SRC.replace('line="l1" word="pears" dur', 'after="a1" dur');
  assert.throws(() => applyEdits(chained, [{op: 'removeAnimation', scene: 'one', animation: 'a1'}]), EditError);
});

test('edit: all or nothing, and the result is still a valid document', () => {
  assert.throws(() => applyEdits(SRC, [{op: 'line', scene: 'one', line: 'l2', hold: 3}, {op: 'line', scene: 'one', line: 'missing', hold: 1}]), EditError);
  const out = applyEdits(SRC, [{op: 'line', scene: 'one', line: 'l2', hold: 3}, {op: 'part', scene: 'one', part: 'bars', box: {x: 1}}]);
  assert.deepEqual(validate(doc(out)), []);
  assert.equal(applyEdits(SRC, []), SRC);
});

test('edit: a line with a <Mark> is not rewritten by hand', () => {
  const marked = SRC.replace('like a red apple and pears.', 'like a <Mark id="m">red apple</Mark> and pears.');
  assert.throws(() => applyEdits(marked, [{op: 'line', scene: 'one', line: 'l1', say: 'new words'}]), /<Mark>/);
  assert.equal(doc(applyEdits(marked, [{op: 'line', scene: 'one', line: 'l1', hold: 4}])).scenes[0].lines[0].hold, 4);
});

test('edit: places are the ones the person was looking at, however the removals and the changes are ordered', () => {
  const three = SRC.replace('<Appear on="frame" line="l2"/>', '<Appear on="frame" line="l2"/>\n      <Tween on="bars" w={900} line="l2" dur={1}/>\n      <Tween on="bars" w={800} line="l2" dur={2}/>');
  assert.equal(doc(three).scenes[0].animations.length, 5);
  // remove the fourth (#3), change the fifth (#4), then remove the second (#1): each means what it meant on the page
  const out = applyEdits(three, [
    {op: 'removeAnimation', scene: 'one', animation: '#3'},
    {op: 'animation', scene: 'one', animation: '#4', set: {dur: 7}},
    {op: 'removeAnimation', scene: 'one', animation: '#1'},
  ]);
  assert.deepEqual(doc(out).scenes[0].animations.map((a) => a.dur), [undefined, undefined, 7]);
});
