import {test} from 'node:test';
import assert from 'node:assert/strict';
import {alignmentIssues, markPhrase, occurrences, parseMarkup, phraseContexts, presenceAt, propAt, sampleFrames, sayOf, solve, snap, staticQa, themeTokens, validate, wordTime, type VisoDoc, type VoiceManifest} from '../../packages/ir/src/index.ts';

const doc = (scenes: string, head = ''): VisoDoc => parseMarkup(`export default <Doc id="d" title="t" lang="en" ${head}>${scenes}</Doc>;`).doc;
/** every line 2 s long, no word times */
const voice = (d: VisoDoc, words?: VoiceManifest[string]['words']): VoiceManifest =>
  Object.fromEntries(d.scenes.flatMap((s) => s.lines).map((l) => [l.id, {duration: 2, audio: `${l.id}.wav`, ...(words && {words})}]));
const codes = (d: VisoDoc) => validate(d).map((i) => i.code);

const BASIC = doc(`
  <Scene id="a"><Line id="l1">The server sends a tag. The tag is small.</Line><Line id="l2" hold={1}>Then it waits.</Line>
    <Part id="p"/><Animation><Appear target="p" line="l1" word="sends"/></Animation></Scene>
  <Scene id="b"><Line id="l3">Next.</Line></Scene>`);

test('validator: a clean document has no issues', () => {
  assert.deepEqual(validate(BASIC), []);
});

test('validator: a caption skin is checked field by field, and passes through the theme', () => {
  const scenes = '<Scene id="a"><Line id="l1">One.</Line></Scene>';
  const good = doc(scenes, `theme="visotalk/light" tokens={{caption: {font: 'display', size: 40, background: 'none', padding: [8, 20], rule: '#c00', ruleSide: 'left'}}}`);
  assert.deepEqual(validate(good), []);
  assert.equal(themeTokens(good.theme).caption?.font, 'display');
  const bad = validate(doc(scenes, `theme="visotalk/light" tokens={{caption: {size: -3, ruleSide: 'bottom', colour: 'red'}}}`));
  assert.deepEqual(bad.map((i) => i.code), ['theme.caption', 'theme.caption', 'theme.caption']);
  assert.match(bad.map((i) => i.message).join('\n'), /caption\.size is px.*\n.*ruleSide is top or left.*\n.*no field "colour"/s);
});

test('validator: seeded mistakes, each with its code and a fix', () => {
  const bad = (inner: string) => validate(doc(inner));
  assert.ok(codes(doc('<Scene id="Bad"><Line id="l">x</Line></Scene>')).includes('id.format'));
  assert.ok(codes(doc('<Scene id="a"><Line id="l">x</Line></Scene><Scene id="a"><Line id="m">x</Line></Scene>')).includes('id.duplicate'));
  assert.ok(codes(doc('<Scene id="a"><Line id="l">x</Line></Scene><Scene id="b"><Line id="l">y</Line></Scene>')).includes('id.duplicate'), 'line ids are document-wide');
  assert.deepEqual(codes(doc('<Scene id="a"/>')), ['scene.duration']);
   assert.deepEqual(codes(doc('<Scene id="a"><Line id="l">x</Line><Part id="p"/><Part id="p"/><Animation><Appear target="p" at="start"/></Animation></Scene>')), ['id.duplicate']);
  const anchors = bad('<Scene id="a"><Line id="l">a b a</Line><Animation><Appear target="p" line="zz"/><Appear target="p" line="l" word="nope"/><Appear target="p" line="l" word="a"/><Appear target="p" line="l" word="a" nth={3}/><Appear target="p" line="l" word="a" nth={2}/><Appear target="p" at={-1}/></Animation></Scene>');
  assert.deepEqual(anchors.map((i) => i.code), ['anchor.line', 'anchor.word', 'anchor.ambiguous', 'anchor.nth', 'anchor.at']);
  assert.match(anchors[2].fix!, /nth/);
  const m = bad('<Scene id="a"><Line id="l">x y</Line><Animation><Tween target="p" to={{}} at="start"/><Set target="p" to={{}} at="start"/><Appear target="p" at="start" easing="bouncy"/><Appear target="p" at="start" dur={-1}/></Animation></Scene>');
  assert.deepEqual(m.map((i) => i.code), ['motion.tween', 'motion.set', 'motion.easing', 'motion.time']);
  assert.ok(m.every((i) => i.fix));
});

test('validator: a part is shown by an appear; scene parts have their own ids, global parts are shown by any scene', () => {
  const s = (scene: string, head = '') => codes(doc(scene, head));
  assert.deepEqual(s('<Scene id="a"><Line id="l">x</Line><Part id="p"/></Scene>'), ['part.appear'], 'a part nobody appears is never seen');
  assert.deepEqual(s('<Scene id="a"><Line id="l">x</Line><Part id="p"/><Animation><Appear target="p" at="start"/></Animation></Scene><Scene id="b"><Line id="m">y</Line><Part id="p"/><Animation><Appear target="p" at="start"/></Animation></Scene>'), [], 'the same id in two scenes: each scene has its own part');
  assert.deepEqual(s('<Scene id="a"><Line id="l">x</Line><Part id="p"/></Scene><Scene id="b"><Line id="m">y</Line><Animation><Appear target="p" at="start"/></Animation></Scene>'), ['part.appear'], 'an appear in another scene does not show it');
  assert.deepEqual(s('<Part id="g"/><Scene id="a"><Line id="l">x</Line></Scene><Scene id="b"><Line id="m">y</Line><Animation><Appear target="g" at="start"/></Animation></Scene>'), [], 'a global part is shown by an appear in any scene');
  assert.deepEqual(s('<Part id="g"/><Scene id="a"><Line id="l">x</Line></Scene>'), ['part.appear']);
  assert.deepEqual(s('<Part id="g"/><Scene id="a"><Line id="l">x</Line><Part id="g"/><Animation><Appear target="g" at="start"/></Animation></Scene>'), ['id.duplicate'], 'a scene part cannot reuse a global part\'s id');
});

test('validator: after names an action, has no cycle, no duplicate id, no reach before its head', () => {
  const s = (anims: string) => doc(`<Scene id="a"><Line id="l">x y</Line><Animation>${anims}</Animation></Scene>`);
  assert.deepEqual(codes(s('<Appear id="h" target="p" line="l"/><Appear target="q" after="h" offset={-0.5}/>')), ['anchor.after-negative']);
  assert.deepEqual(codes(s('<Appear id="h" target="p" line="l"/><Appear target="q" after="h" offset={-0.2}/>')), [], 'within the head\'s 0.45 s');
  assert.deepEqual(codes(s('<Appear target="q" after="nope"/>')), ['anchor.action']);
  assert.deepEqual(codes(s('<Appear id="x" target="p" after="y"/><Appear id="y" target="q" after="x"/>')).sort(), ['anchor.cycle']);
  assert.deepEqual(codes(s('<Appear id="x" target="p" line="l"/><Appear id="x" target="q" line="l"/>')), ['action.id']);
});

test('solver: pacing, lines, scene edges', () => {
  const c = solve(BASIC, voice(BASIC), 30);
  // lead 0.4, then each line + hold (0.4 by default, l2 holds 1), then tail 0.8
  assert.deepEqual(c.scenes.map((s) => [s.id, s.from, s.end]), [['a', 0, snap(30, 0.4 + 2 + 0.4 + 2 + 1 + 0.8)], ['b', snap(30, 6.6), snap(30, 6.6 + 0.4 + 2 + 0.4 + 0.8)]]);
  assert.deepEqual(c.scenes[0].lines.map((l) => [l.id, l.from]), [['l1', 0.4], ['l2', 2.8]]);
  assert.equal(c.duration, c.scenes[1].end);
  const silent = doc('<Scene id="s" duration={3}/><Scene id="t"><Line id="l">x</Line></Scene>');
  assert.deepEqual(solve(silent, voice(silent), 30).scenes.map((s) => [s.from, s.end]), [[0, 3], [3, snap(30, 3 + 0.4 + 2 + 0.4 + 0.8)]]);
  assert.throws(() => solve(BASIC, {}, 30), /no voice entry for line "l1"/);
});

test('markPhrase: shows which words and which occurrence an anchor finds', () => {
  assert.equal(markPhrase('one hundred and one', 'one'), '[one] hundred and one');
  assert.equal(markPhrase('one hundred and one', 'one', 2), 'one hundred and [one]');
  assert.equal(markPhrase('one hundred and one', 'one hundred'), '[one hundred] and one');
  assert.equal(markPhrase('a b', 'zz'), undefined);
});

test('phrases: words where words have spaces, characters where they do not; the full-width pauses weigh more', () => {
  const zh = '世界人口增长得越来越快。人口从十亿增长到八十亿。';
  const n = (say: string, w: string) => occurrences({say, words: undefined}, w);
  assert.deepEqual(['人口', '十亿', '增长', '人口从'].map((w) => n(zh, w)), [2, 2, 2, 1], '十亿 is also inside 八十亿: with no spaces any characters match, so the error lists the occurrences');
  assert.equal(n(zh, '口增'), 1, 'any run of characters: there is no space to split on');
  assert.equal(n('one money', 'one'), 1);
  assert.equal(n('honey money', 'one'), 0, 'with spaces a phrase is whole words');
  assert.equal(n('iPhone手机很贵', '手机'), 1, 'Latin and Chinese in one sentence');
  assert.equal(markPhrase(zh, '人口', 2), '世界人口增长得越来越快。[人口]从十亿增长到八十亿。');
  assert.deepEqual(phraseContexts('The curve keeps rising and the curve is steep', 'curve', 8), ['The [curve] keeps r…', '…and the [curve] is stee…']);
  // estimated time of a Chinese phrase: characters, with 。 weighing 4 more: the second sentence starts later than its character position says
  const d = doc('<Scene id="a"><Line id="l">一二三四五。六七八九十。</Line></Scene>');
  const line = solve(d, voice(d), 30).scenes[0].lines[0];
  assert.equal(wordTime(line, '六七', 'start'), line.from + (line.duration * (6 + 4)) / (12 + 8), 'character 6 plus the rest of the first sentence');
  assert.equal(wordTime(line, '一二', 'start'), line.from);
  // aligned words do not change how a Chinese phrase counts or times: the same document validates before and after synthesis
  const zhWords = [{w: '一二三', t0: 0, t1: 0.5}, {w: '四五', t0: 0.5, t1: 1}];
  assert.equal(occurrences({say: '一二三四五', words: zhWords}, '三四'), 1);
  assert.equal(occurrences({say: 'one two', words: [{w: 'one', t0: 0, t1: 1}, {w: 'two', t0: 1, t1: 2}]}, 'two'), 1, 'a spaced language keeps counting in the aligner\'s words');
  assert.deepEqual(codes(doc('<Scene id="a"><Line id="l">人口增长，人口下降。</Line><Animation><Appear target="p" line="l" word="人口"/></Animation></Scene>')), ['anchor.ambiguous']);
  assert.match(validate(doc('<Scene id="a"><Line id="l">人口增长，人口下降。</Line><Animation><Appear target="p" line="l" word="人口"/></Animation></Scene>'))[0].message, /\[人口\]增长，人口下降。 · 人口增长，\[人口\]下降。/);
});

test('solver: word anchors use aligned words, else the character estimate; nth picks the occurrence', () => {
  const d = doc('<Scene id="a"><Line id="l">The tag and the tag</Line></Scene>');
  const words = [['the', 0, 0.2], ['tag', 0.3, 0.6], ['and', 0.7, 0.9], ['the', 1.0, 1.2], ['tag', 1.3, 1.7]].map(([w, t0, t1]) => ({w: w as string, t0: t0 as number, t1: t1 as number}));
  const aligned = solve(d, voice(d, words), 30).scenes[0].lines[0];
  assert.equal(wordTime(aligned, 'tag', 'start'), 0.4 + 0.3);
  assert.equal(wordTime(aligned, 'tag', 'start', 2), 0.4 + 1.3);
  assert.equal(wordTime(aligned, 'tag', 'end', 2), 0.4 + 1.7);
  assert.equal(wordTime(aligned, undefined, 'end'), 0.4 + 2);
  const estimated = solve(d, voice(d), 30).scenes[0].lines[0];
  assert.equal(wordTime(estimated, 'tag', 'start'), 0.4 + (2 * 4) / 19);
  assert.equal(wordTime(estimated, 'tag', 'start', 2), 0.4 + (2 * 16) / 19);
  assert.throws(() => wordTime(estimated, 'tag', 'start', 3), /occurrence 3/);
  // a phrase spans several aligned words, in any script
  // "wo men", "kan", "yue liang" (escapes: the language gate keeps CJK out of source)
  const [women, kan, yueliang] = ['\u6211\u4eec', '\u770b', '\u6708\u4eae'];
  const zh = doc(`<Scene id="a"><Line id="l">${women} ${kan} ${yueliang}</Line></Scene>`);
  const zhw = [[women, 0, 0.4], [kan, 0.5, 0.7], [yueliang, 0.8, 1.2]].map(([w, t0, t1]) => ({w: w as string, t0: t0 as number, t1: t1 as number}));
  assert.equal(wordTime(solve(zh, voice(zh, zhw), 30).scenes[0].lines[0], `${kan}${yueliang}`, 'start'), 0.4 + 0.5);
});

test('solver: the estimate finds the words the validator counted, not a piece of another word', () => {
  const d = doc('<Scene id="a"><Line id="l">Another tag. The tag.</Line><Line id="m">Go home. Then sleep.</Line><Animation><Appear target="p" line="l" word="the"/><Appear target="q" line="m" word="home then"/></Animation></Scene>');
  assert.deepEqual(validate(d), []);
  const c = solve(d, voice(d), 30);
  const [l, m] = c.scenes[0].lines;
  assert.equal(c.actions.find((a) => a.target === 'p')!.start, snap(30, wordTime(l, 'the', 'start')));
  assert.equal(wordTime(l, 'the', 'start'), l.from + (2 * 13) / 21, '"The" of "The tag", not the "the" inside "Another"');
  assert.equal(wordTime(m, 'home then', 'end'), m.from + (2 * 13) / 20);
});

test('validator: seconds are numbers, an action has targets, a head with a stagger reaches back to its first target', () => {
  const bad = doc('<Scene id="a"><Line id="l">x</Line></Scene>');
  (bad.scenes[0].lines[0] as {hold: unknown}).hold = '1';
  (bad as {pacing: unknown}).pacing = {lead: '1'};
  assert.deepEqual(codes(bad), ['motion.time', 'motion.time']);
  const s = (anims: string) => doc(`<Scene id="a"><Line id="l">x y</Line><Animation>${anims}</Animation></Scene>`);
  assert.deepEqual(codes(s('<Appear target={[]} line="l"/>')), ['action.target']);
  assert.deepEqual(codes(s('<Appear id="h" target={["p","q","r"]} stagger={1} line="l"/><Appear target="z" after="h" offset={-1.5}/>')), [], 'the head ends 2.45 s after its first target');
  assert.deepEqual(codes(s('<Appear id="h" target={["p","q","r"]} stagger={1} line="l"/><Appear target="z" after="h" offset={-3}/>')), ['anchor.after-negative']);
  assert.deepEqual(codes(doc('<Scene id="a" duration={1}/>', 'theme="constructor"')), ['theme.unknown']);
  assert.deepEqual(codes(doc('<Canvas/><Scene id="a" duration={1}/>')), ['canvas.presets']);
});

test('lexicon: whole words, symbols at the edge, other scripts, and a replacement is taken literally', () => {
  const d = doc('<Scene id="a" duration={1}/>', 'voice="v" lexicon={{"C++": "see plus plus", USD: "US$&", "\\u6708\\u4eae": "moon"}}');
  assert.equal(sayOf(d, {id: 'l', text: 'C++ costs 5 USD; USDA stays'}), 'see plus plus costs 5 US$&; USDA stays');
  assert.equal(sayOf(d, {id: 'l', text: '\u6211\u770b\u6708\u4eae'}), '\u6211\u770bmoon');
});

test('solver: every event sits on the frame grid, so a frame number is the whole of a time', () => {
  const d = doc('<Scene id="a"><Line id="l">one two three four</Line><Part id="p"/><Animation><Appear target="p" line="l" word="three" offset={0.013}/><Tween target={["p","q"]} stagger={0.0333} to={{x: 5}} after="x1"/><Appear id="x1" target="p" at={0.123}/></Animation></Scene>');
  for (const fps of [24, 30, 60]) {
    const c = solve(d, voice(d, [{w: 'one', t0: 0.01, t1: 0.3}, {w: 'two', t0: 0.41, t1: 0.7}, {w: 'three', t0: 0.77, t1: 1.1}, {w: 'four', t0: 1.19, t1: 1.9}]), fps);
    for (const t of [c.duration, ...c.scenes.flatMap((s) => [s.from, s.end, ...s.lines.map((l) => l.from)]), ...c.actions.map((a) => a.start)]) assert.equal(t, snap(fps, t), `${t} at ${fps} fps`);
  }
});

test('actions: after takes the end of the head (latest target plus dur), or its start; set ends where it starts', () => {
  const d = doc('<Scene id="a"><Line id="l">go now</Line><Animation><Appear id="h" target={["p","q"]} stagger={0.5} line="l" word="go"/><Appear target="r" after="h" offset={0.1}/><Appear target="s" after="h" edge="start"/><Set id="z" target="t" to={{k: 1}} line="l" word="now"/><Appear target="u" after="z"/></Animation></Scene>');
  const c = solve(d, voice(d), 30);
  const at = (target: string) => c.actions.find((a) => a.target === target && a.motion !== 'set')!.start;
  const go = 0.4;
  assert.equal(at('p'), snap(30, go));
  assert.equal(at('q'), snap(30, go + 0.5));
  assert.equal(at('r'), snap(30, snap(30, go + 0.5) + 0.45 + 0.1));
  assert.equal(at('s'), snap(30, go));
  assert.equal(at('u'), c.actions.find((a) => a.motion === 'set')!.start, 'a set ends where it starts');
});

test('presence: a part is invisible until its first appear; a disappear ramps out; other targets are visible until a first appear', () => {
  const d = doc('<Part id="g"/><Scene id="a"><Line id="l">one two three four</Line><Part id="p"/><Animation><Appear target="p" at={1}/><Disappear target="p" at={3}/><Disappear target="q" at={2}/><Appear target="q" at={4}/><Appear target="n" at={1}/></Animation></Scene><Scene id="b"><Line id="m">five</Line><Part id="p"/><Animation><Appear target="p" at={1}/><Appear target="g" at={1}/></Animation></Scene>');
  const c = solve(d, voice(d), 30);
  const b = c.scenes[1].from;
  const p = (id: string, t: number, scene?: string, part = false) => presenceAt(c, id, t, scene, part);
  assert.equal(p('p', 0, 'a', true), 0);
  assert.equal(p('p', 0.99, 'a', true), 0);
  assert.equal(p('p', 1.0 + 0.45, 'a', true), 1);
  assert.ok(p('p', 1.2, 'a', true) > 0 && p('p', 1.2, 'a', true) < 1);
  assert.equal(p('p', 2.9, 'a', true), 1);
  assert.equal(p('p', 3.3, 'a', true), 0);
  assert.equal(p('r', 1, 'a'), 1, 'no action names a target that is not a part');
  assert.equal(p('r', 1, 'a', true), 0, 'a part nobody appears is never there');
  assert.equal(p('q', 0, 'a'), 1, 'first presence action is a disappear: visible until then');
  assert.equal(p('q', 2.5, 'a'), 0);
  assert.equal(p('q', 4.6, 'a'), 1);
  assert.equal(p('n', 0.5, 'a'), 0, 'a target whose first action is an appear is hidden until it');
  assert.equal(p('p', b, 'b', true), 0, 'the scene part of the next scene starts hidden: nothing carries over');
  assert.equal(p('p', b + 1 + 0.45, 'b', true), 1);
  assert.equal(p('p', b + 0.2, 'a', true), 0, 'scene a\'s own actions end with it');
  assert.equal(p('g', b + 1 + 0.45, undefined, true), 1, 'a global part is one thing across scenes');
  assert.equal(p('g', 0, undefined, true), 0);
});

test('presence: an appear of what is visible changes nothing, and an action that interrupts a ramp turns it from where it is', () => {
  const d = doc('<Scene id="a"><Line id="l">one two three four five six</Line><Part id="p"/><Animation><Appear target="p" at={1} dur={1} easing="linear"/><Appear target="p" at={3}/><Disappear target="p" at={4} dur={1} easing="linear"/><Appear target="p" at={4.5} dur={1} easing="linear"/></Animation></Scene>');
  const c = solve(d, voice(d), 30);
  const p = (t: number) => presenceAt(c, 'p', t, 'a', true);
  assert.equal(p(2.5), 1);
  assert.equal(p(3), 1, 'appearing what is already there does not flash');
  assert.equal(p(3.2), 1);
  assert.equal(p(4.5), 0.5, 'a disappear half way down');
  assert.equal(p(5.0), 0.75, 'and an appear that interrupts it climbs back from 0.5 to 1 over its dur');
  assert.equal(p(5.5), 1);
});

test('qa: an action that starts after its scene is over is reported', () => {
  const d = doc('<Scene id="a"><Line id="l">one two</Line><Animation><Appear target="p" at="end" offset={5}/><Appear target="q" at="end" offset={-1}/></Animation></Scene>');
  const issues = staticQa(d, solve(d, voice(d), 30)).filter((i) => i.code === 'action.outside-scene');
  assert.deepEqual(issues.map((i) => i.objects[0]), ['p']);
  assert.match(issues[0].message, /appear of "p" starts at .* s into scene "a", which is over at/);
});

test('values: a tween reaches its value over dur from the value it has, chains with set, and an interrupted tween starts from where it was', () => {
  const d = doc('<Scene id="a"><Line id="l">go</Line><Animation><Tween target="o" to={{x: 100}} at={1} dur={2} easing="linear"/><Set target="o" to={{x: 0, label: "a"}} at={4}/><Tween target="o" to={{x: 10}} at={5} dur={2} easing="linear"/><Tween target="o" to={{x: 40}} at={6} dur={1} easing="linear"/></Animation></Scene>');
  const c = solve(d, voice(d), 30);
  const x = (t: number) => propAt(c, 'o', 'x', t, 0);
  assert.equal(x(0.5), 0);
  assert.equal(x(2), 50);
  assert.equal(x(3.5), 100);
  assert.equal(x(4), 0);
  assert.equal(x(5.5), 2.5);
  assert.equal(x(6), 5);
  assert.equal(x(6.5), 22.5);
  assert.equal(x(9), 40);
  assert.equal(propAt(c, 'o', 'label', 5, 'none'), 'a');
  assert.equal(propAt(c, 'o', 'label', 3, 'none'), 'none');
  assert.equal(propAt(c, 'o', 'x', 3, 7), 100, 'a tween of a prop with a base starts from the base');
});

test('qa: samples per line, brief and never-visible targets, weak alignment', () => {
  const d = doc('<Scene id="a"><Line id="l1">one two three</Line><Line id="l2">four five</Line><Animation><Appear target="blink" line="l1" word="two"/><Disappear target="blink" line="l1" word="three"/><Appear target="stays" line="l1"/><Appear target="late" at={99}/></Animation></Scene>');
  const words = [{w: 'one', t0: 0, t1: 0.4, p: 1}, {w: 'two', t0: 0.5, t1: 0.9, p: 0.2}, {w: 'three', t0: 1, t1: 1.9, p: 1}];
  const c = solve(d, voice(d, words), 30);
  const q = staticQa(d, c);
  assert.deepEqual(q.map((i) => [i.code, i.objects[0]]), [['action.outside-scene', 'late'], ['visible.brief', 'blink'], ['never-visible', 'late']]);
  assert.match(q[1].fix!, /hold=\{1\.5\}/);
  const a = alignmentIssues(d, c);
  assert.deepEqual(a.map((i) => i.code), ['align.weak']);
  const lost = doc('<Scene id="a"><Line id="l1">in 1927 it fell</Line><Animation><Appear target="p" line="l1" word="1927"/></Animation></Scene>');
  assert.deepEqual(alignmentIssues(lost, solve(lost, voice(lost, [{w: 'in', t0: 0, t1: 0.2}, {w: 'nineteen', t0: 0.3, t1: 0.7}]), 30)).map((i) => i.code), ['align.estimated'], 'aligned words that do not hold the phrase leave it estimated');
  const s = sampleFrames(c, 30, 2);
  assert.ok(s.some((x) => x.at === 'a@0.4s') && s.some((x) => x.at.startsWith('a/l2@')));
  assert.ok(s.every((x) => x.frame >= 0 && x.frame < Math.round(c.duration * 30)));
});

test('themes: tokens merge over the built-in theme; unknown themes are reported', () => {
  assert.equal(themeTokens({id: 'visotalk/dark', tokens: {colors: {bg: '#000'}}}).colors.text, '#E8ECF4');
  assert.equal(themeTokens({id: 'visotalk/dark', tokens: {colors: {bg: '#000'}}}).colors.bg, '#000');
  assert.deepEqual(codes(doc('<Scene id="a" duration={1}/>', 'theme="nope"')), ['theme.unknown']);
});

test('qa: a global target that was on screen before the scene is not a brief flash when the scene takes it away at once', () => {
  const d = doc('<Part id="g"/><Scene id="a"><Line id="l">one two three four five six</Line><Animation><Appear target="g" at="start"/><Appear target="x" at="start"/></Animation></Scene><Scene id="b"><Line id="m">one two</Line><Animation><Appear target="x" at="start"/><Disappear target="x" at={0.5}/><Appear target="y" at="start"/><Disappear target="y" at={0.7}/></Animation></Scene>');
  const brief = staticQa(d, solve(d, voice(d), 30)).filter((i) => i.code === 'visible.brief').map((i) => i.objects[0]);
  assert.deepEqual(brief, ['y'], 'y was shown and taken away within a second; x was on screen for the whole of scene a');
});

test('exports: a variant names a canvas the document has and a built-in theme, and the light theme has the dark one\'s keys', () => {
  const scene = '<Scene id="a" duration={1}/>';
  const ok = doc(scene, 'canvas="16x9,9x16" exports={{variants: [{preset: "16x9"}, {preset: "9x16"}, {preset: "16x9", theme: "visotalk/light"}]}}');
  assert.deepEqual(codes(ok), []);
  assert.deepEqual(codes(doc(scene, 'exports={{variants: [{preset: "9x16"}]}}')), ['export.variant'], 'a canvas the document does not have');
  assert.deepEqual(codes(doc(scene, 'exports={{variants: [{preset: "16x9", theme: "visotalk/neon"}]}}')), ['export.variant'], 'an unknown theme');
  const dark = themeTokens(), light = themeTokens({id: 'visotalk/light'});
  assert.deepEqual(Object.keys(light.colors).sort(), Object.keys(dark.colors).sort());
  assert.notEqual(light.colors.bg, dark.colors.bg);
  assert.deepEqual(light.fonts, dark.fonts);
});

test('solver: `until` ends an action or a sound on an anchor of its scene, so its length follows the narration', () => {
  const d = doc(`<Asset id="bed" kind="audio" src="bed.wav" license={{id: "user-owned", obligations: []}}/>
  <Scene id="a"><Line id="l1">One two three.</Line><Line id="l2">Four five six.</Line><Part id="p"/>
    <Animation><Tween target="p" to={{x: 10}} at="start" until="end" easing="linear"/><Appear target="p" at={0.5} until={{line: "l2", word: "five"}}/></Animation>
    <Sound asset="bed" at="start" until={{scene: "end", offset: 1.5}} fadeOut={1}/></Scene>
  <Scene id="b"><Line id="l3">Next.</Line></Scene>`);
  assert.deepEqual(validate(d), []);
  const c = solve(d, voice(d));
  const a = c.scenes[0];
  const [tween, appear] = c.actions.filter((x) => x.scene === 'a');
  assert.equal(tween.start, a.from);
  assert.ok(Math.abs(tween.start + tween.dur - a.end) < 1e-9, 'the tween lasts the whole scene');
  assert.ok(Math.abs(appear.start + appear.dur - wordTime(a.lines[1], 'five', 'start')) < 1 / 30, 'the appear ends on the word');
  assert.ok(Math.abs(c.sounds[0].end! - (a.end + 1.5)) < 1e-9, 'the sound runs 1.5 s past the scene');
  const bad = doc(`<Scene id="a"><Line id="l1">One two.</Line><Part id="p"/><Animation><Tween target="p" to={{x: 1}} at="start" dur={1} until="end"/><Set target="p" to={{x: 2}} at="start" until="end"/>
    <Tween target="p" to={{x: 1}} at="start" until={{line: "l9"}}/><Appear target="p" at="start"/></Animation></Scene>`);
  assert.deepEqual(codes(bad).sort(), ['anchor.line', 'motion.until', 'motion.until']);
  assert.throws(() => doc(`<Scene id="a"><Line id="l1">x</Line><Part id="p"/><Animation><Appear target="p" at="start" until={{after: "x"}}/></Animation></Scene>`), /until is/);
});

test('solver: `pacing.grid` rounds every narrated scene up to whole cells, so a scored film starts each scene on a bar', () => {
  const bar = 10 / 3;
  const d = doc(`<Scene id="a"><Line id="l1" hold={0}>One.</Line></Scene><Scene id="b"><Line id="l2">Two.</Line><Line id="l3">Three.</Line></Scene>`, `pacing={{grid: ${bar}}}`);
  const c = solve(d, voice(d));
  // a: 0.4 + 2 + 0 + 0.8 = 3.2 s → one bar; b: 0.4 + (2 + 0.4) × 2 + 0.8 = 6 s → two bars
  assert.deepEqual(c.scenes.map((s) => Math.round((s.end - s.from) / bar * 1000) / 1000), [1, 2]);
  assert.ok(Math.abs(c.scenes[1].from - bar) < 1 / 60, 'the second scene starts on the bar line');
  assert.ok(Math.abs(c.scenes[1].lines[1].from - (c.scenes[1].from + 0.4 + 2.4)) < 1 / 60, 'the lines are placed as without a grid; only the scene end moves');
});
