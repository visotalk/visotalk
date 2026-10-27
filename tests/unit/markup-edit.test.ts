import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyEdits, EditError, parseMarkup, textsOf, validate} from '../../packages/ir/src/index.ts';

const SRC = `import {Doc, Scene, Line, Part, Animation, Appear, Tween} from '@visotalk/jsx';
const COLOUR = 'red'; // the module's own code
export default (<Doc id="d" title="t" lang="en" canvas="16x9">
  <Part id="frame" x={0} y={0} w={1920} h={1080}>{() => <div style={{color: COLOUR}}>frame {"<b>"}</div>}</Part>
  <Scene id="one">
    <Line id="l1" hold={1}>Bars that grow, like a red apple and pears.</Line>
    <Line id="l2">Then a second thought.</Line>
    <Part id="bars" x={100} y={200} w={600}>{() => <div>bars</div>}</Part>
    <Animation>
      <Appear id="a1" target="bars" line="l1" word="red apple"/>
      <Tween id="a2" target="bars" to={{w: 1100}} line="l1" word="pears" dur={1.4} easing="easeOut"/>
      <Appear target="frame" line="l2"/>
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
    {op: 'animation', scene: 'one', animation: 'a2', set: {dur: 2, easing: 'linear', stagger: null}, to: {w: 900}},
    {op: 'animation', scene: 'one', animation: '#2', set: {dur: 0.8}},
  ]);
  const [a1, a2, a3] = doc(out).scenes[0].animations;
  assert.equal(a1.dur, undefined);
  assert.deepEqual([a2.dur, a2.easing, (a2.to as {w: number}).w], [2, 'linear', 900]);
  assert.equal(a3.dur, 0.8);
  const reversing = applyEdits(SRC, [{op: 'animation', scene: 'one', animation: 'a2', set: {yoyo: true}}]);
  assert.equal(doc(reversing).scenes[0].animations[1].yoyo, true);
  assert.throws(() => applyEdits(SRC, [{op: 'animation', scene: 'one', animation: 'a1', set: {target: 'frame'}}]), /not set here/);
  assert.throws(() => applyEdits(SRC, [{op: 'animation', scene: 'one', animation: 'a1', set: {word: 'pears'}}]), /not set here/);
  assert.throws(() => applyEdits(SRC, [{op: 'animation', scene: 'one', animation: 'a1', to: {w: 5}}]), EditError, 'an appear has no values');
});

test('edit: action timing and to values are independent, including reserved names', () => {
  const changed = applyEdits(SRC, [{op: 'animation', scene: 'one', animation: 'a2', set: {dur: 2}, to: {w: 900, dur: 42}}]);
  assert.equal(doc(changed).scenes[0].animations[1].dur, 2);
  assert.deepEqual(doc(changed).scenes[0].animations[1].to, {w: 900, dur: 42});
  const removed = applyEdits(changed, [{op: 'animation', scene: 'one', animation: 'a2', to: {w: null, active: 1}}]);
  assert.deepEqual(doc(removed).scenes[0].animations[1].to, {dur: 42, active: 1});
  assert.throws(() => applyEdits(SRC, [{op: 'animation', scene: 'one', animation: 'a2', to: {w: null}}]), /at least one value/);
});

test('edit: an animation is anchored again on another word, another line, another animation or a time', () => {
  const onWord = applyEdits(SRC, [{op: 'anchor', scene: 'one', animation: 'a1', to: {line: 'l1', word: 'pears', edge: 'end', offset: 0.2}}]);
  assert.deepEqual(doc(onWord).scenes[0].animations[0].at, {line: 'l1', word: 'pears', edge: 'end', offset: 0.2});
  const onLine = applyEdits(SRC, [{op: 'anchor', scene: 'one', animation: '#2', to: {line: 'l1'}}]);
  assert.deepEqual(doc(onLine).scenes[0].animations[2].at, {line: 'l1'});
  const after = applyEdits(SRC, [{op: 'anchor', scene: 'one', animation: 'a2', to: {after: 'a1', offset: 0.5}}]);
  assert.deepEqual(doc(after).scenes[0].animations[1].at, {after: 'a1', offset: 0.5});
  assert.equal(doc(after).scenes[0].animations[1].to && (doc(after).scenes[0].animations[1].to as {w: number}).w, 1100, 'the values stay');
  const atTime = applyEdits(SRC, [{op: 'anchor', scene: 'one', animation: 'a1', to: {at: 2}}]);
  assert.deepEqual(doc(atTime).scenes[0].animations[0].at, {at: 2});
  assert.deepEqual(doc(applyEdits(SRC, [{op: 'anchor', scene: 'one', animation: 'a1', to: {at: 'end', offset: -1}}])).scenes[0].animations[0].at, {scene: 'end', offset: -1});
  assert.throws(() => applyEdits(SRC, [{op: 'anchor', scene: 'one', animation: 'a1', to: {line: 'l1', word: 'nothing here'}}]), EditError);
  assert.throws(() => applyEdits(SRC, [{op: 'anchor', scene: 'one', animation: 'a1', to: {after: 'a1'}}]), EditError, 'it cannot follow itself');
});

test('edit: removing an animation takes its line away, and not one another is anchored after', () => {
  const out = applyEdits(SRC, [{op: 'removeAnimation', scene: 'one', animation: 'a2'}]);
  assert.equal(doc(out).scenes[0].animations.length, 2);
  assert.equal(out, SRC.replace('      <Tween id="a2" target="bars" to={{w: 1100}} line="l1" word="pears" dur={1.4} easing="easeOut"/>\n', ''));
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
  const three = SRC.replace('<Appear target="frame" line="l2"/>', '<Appear target="frame" line="l2"/>\n      <Tween target="bars" to={{w: 900}} line="l2" dur={1}/>\n      <Tween target="bars" to={{w: 800}} line="l2" dur={2}/>');
  assert.equal(doc(three).scenes[0].animations.length, 5);
  // remove the fourth (#3), change the fifth (#4), then remove the second (#1): each means what it meant on the page
  const out = applyEdits(three, [
    {op: 'removeAnimation', scene: 'one', animation: '#3'},
    {op: 'animation', scene: 'one', animation: '#4', set: {dur: 7}},
    {op: 'removeAnimation', scene: 'one', animation: '#1'},
  ]);
  assert.deepEqual(doc(out).scenes[0].animations.map((a) => a.dur), [undefined, undefined, 7]);
});

const TEXT_SRC = `import {Doc, Scene, Line, Part, Animation, Appear} from '@visotalk/jsx';
import {useText} from '@visotalk/runtime';
const Title = () => <h1>{useText('title', "Any article, in 30 seconds.")}</h1>;
export default (<Doc id="d" title="t" lang="en" canvas="16x9">
  <Scene id="one">
    <Line id="l1">Hello there.</Line>
    <Part id="card" x={0} y={0} w={800} h={200}>{() => <div><Title />{useText('sub', 'Say "hi"')}</div>}</Part>
    <Animation><Appear target="card" line="l1"/></Animation>
  </Scene>
</Doc>);
`;

test('edit: the words a part draws with useText are set in <Doc texts>, and unset again', () => {
  assert.deepEqual(textsOf(TEXT_SRC), [{id: 'title', base: 'Any article, in 30 seconds.'}, {id: 'sub', base: 'Say "hi"'}]);
  const once = applyEdits(TEXT_SRC, [{op: 'text', id: 'title', say: 'Two words, "quoted"\nand a line'}]);
  assert.deepEqual(doc(once).texts, {title: 'Two words, "quoted"\nand a line'});
  const twice = applyEdits(once, [{op: 'text', id: 'sub', say: 'café ✓ — ü'}, {op: 'text', id: 'title', say: 'Changed'}]);
  assert.deepEqual(doc(twice).texts, {title: 'Changed', sub: 'café ✓ — ü'});
  assert.equal(twice.replace(/\n  texts=\{\{[^\n]*\}\}/, ''), TEXT_SRC, 'nothing else in the file changes');
  const back = applyEdits(twice, [{op: 'text', id: 'title', say: null}, {op: 'text', id: 'sub', say: null}]);
  assert.equal(doc(back).texts, undefined);
  assert.equal(back, TEXT_SRC);
});

test('edit: the voice of the document is set or replaced on <Doc>, a provider\'s name with spaces read back as written', () => {
  const kokoro = applyEdits(SRC, [{op: 'voice', voice: 'am_michael'}]);
  assert.deepEqual(doc(kokoro).voice, {voice: 'am_michael'});
  assert.equal(kokoro.replace(' voice="am_michael"', ''), SRC, 'nothing else in the file changes');
  const provider = applyEdits(kokoro, [{op: 'voice', voice: 'minimax:Chinese (Mandarin)_News_Anchor'}]);
  assert.deepEqual(doc(provider).voice, {voice: 'minimax:Chinese (Mandarin)_News_Anchor'});
  const paced = SRC.replace('canvas="16x9"', 'canvas="16x9" voice="af_heart" speed={0.9}');
  assert.deepEqual(doc(applyEdits(paced, [{op: 'voice', voice: 'bf_emma'}])).voice, {voice: 'bf_emma', speed: 0.9}, 'the speed stays with the new voice');
  assert.throws(() => applyEdits(SRC, [{op: 'voice', voice: ' '}]), EditError);
  assert.equal(applyEdits(kokoro, [{op: 'voice', voice: null}]), SRC, 'taken away, the default speaks');
  assert.throws(() => applyEdits(paced, [{op: 'voice', voice: null}]), EditError, 'a speed without a voice is not a document');
});

test('edit: a text no part draws, or one with no words, is refused', () => {
  assert.throws(() => applyEdits(TEXT_SRC, [{op: 'text', id: 'nope', say: 'x'}]), EditError);
  assert.throws(() => applyEdits(TEXT_SRC, [{op: 'text', id: 'title', say: '  '}]), EditError);
  assert.ok(validate({...doc(TEXT_SRC), texts: {'Bad Id': 'x'}}).some((i) => i.code === 'id.format'));
});

const TWO = SRC.replace('  </Scene>\n</Doc>', `  </Scene>
  <Scene id="two" title="Closing">
    <Line id="l3">The end.</Line>
  </Scene>
</Doc>`);

test('edit: a scene is named, and its name taken away', () => {
  assert.equal(doc(applyEdits(TWO, [{op: 'scene', scene: 'one', title: 'The race, & why'}])).scenes[0].title, 'The race, & why');
  assert.equal(doc(applyEdits(TWO, [{op: 'scene', scene: 'two', title: null}])).scenes[1].title, undefined);
  assert.throws(() => applyEdits(TWO, [{op: 'scene', scene: 'one', title: ' '}]), EditError);
});

test('edit: a scene moves before another or to the end, whole, and the file stays as it was around it', () => {
  const moved = applyEdits(TWO, [{op: 'moveScene', scene: 'two', before: 'one'}]);
  assert.deepEqual(doc(moved).scenes.map((s) => s.id), ['two', 'one']);
  assert.equal(applyEdits(moved, [{op: 'moveScene', scene: 'two', before: null}]), TWO, 'moving it back gives the same text');
  assert.throws(() => applyEdits(TWO, [{op: 'moveScene', scene: 'one', before: 'nope'}]), /no scene "nope"/);
});

test('edit: a copy of a scene goes after it with ids of its own, and its anchors follow them', () => {
  const out = applyEdits(TWO, [{op: 'duplicateScene', scene: 'one'}]);
  const [one, copy, two] = doc(out).scenes;
  assert.deepEqual([one.id, copy.id, two.id], ['one', 'one-2', 'two']);
  assert.deepEqual(copy.lines.map((l) => l.id), ['l1-2', 'l2-2']);
  assert.deepEqual(copy.parts.map((p) => p.id), ['bars'], 'a part is the scene\'s own, so its id stays');
  assert.deepEqual(copy.animations.map((a) => [a.id, (a.at as {line?: string}).line]), [['a1-2', 'l1-2'], ['a2-2', 'l1-2'], [undefined, 'l2-2']]);
  assert.deepEqual(doc(applyEdits(out, [{op: 'duplicateScene', scene: 'one'}])).scenes.map((s) => s.id), ['one', 'one-3', 'one-2', 'two'], 'the next copy takes the next free number');
});

test('edit: a scene is removed, but never the last one', () => {
  assert.equal(applyEdits(TWO, [{op: 'removeScene', scene: 'two'}]), SRC);
  assert.throws(() => applyEdits(SRC, [{op: 'removeScene', scene: 'one'}]), /at least one scene/);
});
