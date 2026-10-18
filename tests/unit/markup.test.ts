import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MarkupError, parseMarkup} from '../../packages/ir/src/index.ts';

const DOC = `import {Doc, Scene, Line, Part, Animation, Appear, Tween, Set, Disappear} from '@visotalk/jsx';
const years = [1804, 1927];   // module code: not read by the engine

export default <Doc id="demo" title="Demo" lang="en" canvas="16x9" exports={{variants: [{preset: "16x9"}], fps: 30}}>
  <Part id="frame">{years.map((y) => <div key={y}>{'</Tag>'}</div>)}</Part>
  <Scene id="intro" title="Intro">
    <Line id="l1">One billion people, counted.</Line>
    <Line id="l2" text="It took until 1804." hold={1.5}>It took until eighteen oh four.</Line>
    <Part id="bar" x={100} y={200} w={800} h={60}>
      <div {...useTarget("fill")} style={{width: useProp("fill", "w", 2)}}>{"a > b && c < d"}</div>
    </Part>
    <Animation>
      <Appear on="bar" line="l1" word="billion"/>
      <Tween id="grow" on="fill" w={1100} line="l1" word="counted" dur={1.4} easing="easeOut"/>
      <Set on="fill" label="done" after="grow"/>
      <Disappear on={["bar", "fill"]} at="end" offset={-0.5} stagger={0.1}/>
    </Animation>
  </Scene>
  <Scene id="next">
    <Line id="l3">Then the second.</Line>
    <Part id="bar" x={50}><div/></Part>
    <Animation><Appear on="bar" at={1.25}/></Animation>
  </Scene>
</Doc>;
`;

test('markup: the skeleton is read, a part body is kept as source, module code is not read', () => {
  const {doc, prelude} = parseMarkup(DOC);
  assert.match(prelude, /const years = \[1804, 1927\]/);
  assert.deepEqual(doc.meta, {id: 'demo', title: 'Demo', lang: 'en'});
  assert.deepEqual(doc.canvas.presets, [{id: '16x9', width: 1920, height: 1080}]);
  assert.deepEqual(doc.exports, {variants: [{preset: '16x9'}], fps: 30});
  assert.equal(doc.parts?.[0].id, 'frame');
  assert.match(doc.parts![0].body!, /years\.map/);
  const [intro, next] = doc.scenes;
  assert.deepEqual(intro.lines.map((l) => [l.id, l.text, l.say, l.hold]), [['l1', 'One billion people, counted.', undefined, undefined], ['l2', 'It took until 1804.', 'It took until eighteen oh four.', 1.5]]);
  assert.deepEqual(intro.parts.map((p) => [p.id, p.x, p.y, p.w, p.h]), [['bar', 100, 200, 800, 60]]);
  assert.match(intro.parts[0].body!, /useTarget\("fill"\)[\s\S]*a > b && c < d/);
  assert.deepEqual(intro.animations, [
    {motion: 'appear', on: 'bar', at: {line: 'l1', word: 'billion'}},
    {id: 'grow', motion: 'tween', on: 'fill', at: {line: 'l1', word: 'counted'}, dur: 1.4, easing: 'easeOut', props: {w: 1100}},
    {motion: 'set', on: 'fill', at: {after: 'grow'}, props: {label: 'done'}},
    {motion: 'disappear', on: ['bar', 'fill'], at: {scene: 'end', offset: -0.5}, stagger: 0.1},
  ]);
  assert.deepEqual(next.parts, [{id: 'bar', x: 50, body: '<div/>'}]);
  assert.deepEqual(next.animations, [{motion: 'appear', on: 'bar', at: {at: 1.25}}]);
});

test('markup: a mark names a phrase of a line, and compiles to the word and occurrence an author could have written', () => {
  const src = (line: string, anim: string) => `export default <Doc id="d" title="t" lang="en"><Scene id="s"><Line id="l">${line}</Line><Animation>${anim}</Animation></Scene></Doc>;`;
  const at = (line: string, anim: string) => parseMarkup(src(line, anim)).doc.scenes[0].animations[0].at;
  assert.deepEqual(at('The curve <Mark id="a">keeps rising</Mark> and the curve flattens.', '<Appear on="p" line="l" mark="a"/>'), {line: 'l', word: 'keeps rising'});
  assert.deepEqual(at('The <Mark id="c1">curve</Mark> rises and the <Mark id="c2">curve</Mark> flattens.', '<Appear on="p" line="l" mark="c2" edge="end" offset={0.2}/>'), {line: 'l', word: 'curve', nth: 2, edge: 'end', offset: 0.2});
  assert.deepEqual(at('人口增长，<Mark id="x">人口</Mark>下降。', '<Appear on="p" line="l" mark="x"/>'), {line: 'l', word: '人口', nth: 2});
  const doc = parseMarkup(src('The <Mark id="a">curve</Mark>  rises.', '')).doc;
  assert.equal(doc.scenes[0].lines[0].text, 'The curve rises.', 'the words are spoken like the rest; the mark adds none');
  const fails = (s: string, re: RegExp) => assert.throws(() => parseMarkup(s), (e) => e instanceof MarkupError && re.test(e.message));
  fails(src('The <Mark id="a">cur</Mark>ve rises.', ''), /must wrap whole words: "cur" starts or ends inside a word/);
  fails(src('The <Mark id="a"></Mark> rises.', ''), /holds no words/);
  fails(src('A <Mark id="a">b</Mark> <Mark id="a">c</Mark>', ''), /twice in line "l"/);
  fails(src('A <Mark>b</Mark>', ''), /<Mark> needs id/);
  fails(src('A <Mark id="a">b <b>c</b></Mark>', ''), /holds the words only/);
  fails(src('A <Mark id="a">b</Mark> c', '<Appear on="p" line="l" mark="zz"/>'), /line "l" has no <Mark id="zz"> \(it has: a\)/);
  fails(src('A b c', '<Appear on="p" line="l" mark="zz"/>'), /wrap the phrase in the line with <Mark id="…">/);
  fails(src('A <Mark id="a">b</Mark> c', '<Appear on="p" line="l" mark="a" word="b"/>'), /mark names the phrase: it replaces word and nth/);
  fails(src('A <Mark id="a">b</Mark> c', '<Appear on="p" mark="a" at={1}/>'), /exactly one of|mark needs line/);
});

test('markup: mistakes name the line and what to write instead', () => {
  const doc = (inner: string, head = '') => `${head}export default <Doc id="d" title="t" lang="en">${inner}</Doc>;`;
  const fails = (src: string, re: RegExp) => assert.throws(() => parseMarkup(src), (e) => e instanceof MarkupError && re.test(e.message));
  fails('const x = 1;', /no `export default <Doc`/);
  fails(doc('<Scene id="s"><Beat id="b"/></Scene>'), /<Beat> cannot be inside <Scene>; use <Line>, <Part> or <Animation>/);
  fails(doc('<Text id="t"/>'), /<Text> cannot be inside <Doc>/);
  fails(doc('<Scene id="s"><Line id="l">Words <b>bold</b></Line></Scene>'), /a line holds the words spoken/);
  fails(doc('<Scene id="s"><Line id="l"></Line></Scene>'), /holds no words/);
  fails(doc('<Scene id="s"><Part id="p"><div/></Scene>'), /never closed with <\/Part>/);
  fails(doc('<Scene id="s"><PartRef id="p" from="a"/></Scene>'), /<PartRef> cannot be inside <Scene>/);
  fails(doc('<Scene id="s"><Line id="l">x y</Line><Animation><Appear line="l"/></Animation></Scene>'), /needs on=/);
  fails(doc('<Scene id="s"><Line id="l">x y</Line><Animation><Appear on="a"/></Animation></Scene>'), /exactly one of line/);
  fails(doc('<Scene id="s"><Line id="l">x y</Line><Animation><Appear on="a" line="l" at={1}/></Animation></Scene>'), /exactly one of line/);
  fails(doc('<Scene id="s"><Line id="l">x y</Line><Animation><Appear on="a" word="x"/></Animation></Scene>'), /exactly one of line|word needs line/);
  fails(doc('<Scene id="s"><Line id="l">x y</Line><Animation><Appear on="a" line="l" word="x" size={3}/></Animation></Scene>'), /has no attribute "size"/);
  fails(doc('<Scene id="s"><Line id="l">x y</Line><Animation><Tween on="a" line="l" size="big"/></Animation></Scene>'), /size of <Tween> is a number/);
  fails(doc('<Scene id="s"><Animation><Appear on="a" at={1} at={2}/></Animation></Scene>'), /given twice/);
  fails(doc('<Scene id="s"><Line id="l">x y</Line><Animation><Appear on={name} line="l"/></Animation></Scene>'), /holds no variables/);
  fails(doc('<Scene id="s"><Line id="l">a { b</Line></Scene>'), /"\{" in text/);
  fails(doc('<Scene id="s"><Line id="l" say="x">y</Line></Scene>'), /has no attribute "say"/);
  fails(doc('<Scene id="s"><Line id="l" hold="1">y</Line></Scene>'), /hold of <Line> is a number/);
  fails(doc('<Scene id="s" duration="3"/>'), /duration of <Scene> is a number/);
  fails(doc('<Scene id="s"><Line id="l">x y</Line><Animation><Appear on="a" line="l" dur="2"/></Animation></Scene>'), /dur of <Appear> is a number/);
  fails(doc('<Scene id="s"><Line id="l">x y</Line><Animation><Appear on="a" line="l" offset="1"/></Animation></Scene>'), /offset of <Appear> is a number/);
  fails(doc('<Scene id="s"><Part id="p" x="1"/></Scene>'), /x of <Part> is a number/);
  fails(doc('<Scene id="s"><Line id="l">x y</Line><Animation><constructor on="a" line="l"/></Animation></Scene>'), /<constructor> cannot be inside <Animation>/);
  fails('export default <Doc id="d" title="t" lang="en" tokens={{radius: 3}}><Scene id="s" duration={1}/></Doc>;', /tokens override a theme/);
  fails('export default <Doc id="d" title="t" lang="en" speed={2}><Scene id="s" duration={1}/></Doc>;', /speed belongs to the voice/);
  fails('export default <Doc id="d" title="t" lang="en" canvas="constructor"><Scene id="s" duration={1}/></Doc>;', /canvas "constructor" is not one of/);
});

test('markup: entities and escapes read as JSX and JavaScript do', () => {
  const src = `export default <Doc id="d" title="t" lang="en" voice="v" lexicon={{"caf\\u00e9": "cafay", "a\\u{1F600}": "smile"}}>
    <Scene id="s"><Line id="l">a &#128512; &#x41; &constructor; &lt;b&gt;</Line></Scene></Doc>;`;
  const {doc} = parseMarkup(src);
  assert.deepEqual(doc.voice?.lexicon, {'caf\u00e9': 'cafay', 'a\u{1F600}': 'smile'});
  assert.equal(doc.scenes[0].lines[0].text, 'a \u{1F600} A &constructor; <b>');
});

test('markup: locations point at the scene, line, part and animation of an issue', () => {
  const {locs} = parseMarkup(DOC);
  assert.equal(locs.get('/scenes/intro/lines/l2')?.line, 8);
  assert.equal(locs.get('/scenes/intro/parts/bar')?.line, 9);
  assert.equal(locs.get('/scenes/intro/animations/1')?.line, 14);
  assert.equal(locs.get('/scenes/intro/animations/grow')?.line, 14, 'the validator addresses an action that has an id by it');
  assert.equal(locs.get('/parts/frame')?.line, 5);
});

test('markup: a document may be parenthesised and Canvas and Asset are tags of the document', () => {
  const src = `export default (<Doc id="d" title="t" lang="en" theme="visotalk/dark">
    <Canvas><Preset id="16x9" width={1920} height={1080}/><Preset id="9x16" width={1080} height={1920}/></Canvas>
    <Asset id="photo" kind="image" src="p.jpg" license={{id: "CC0-1.0", obligations: []}}/>
    <Scene id="s" duration={3}/>
  </Doc>);`;
  const {doc} = parseMarkup(src);
  assert.deepEqual(doc.canvas.presets.map((p) => p.id), ['16x9', '9x16']);
  assert.equal(doc.assets?.[0].id, 'photo');
  assert.deepEqual(doc.theme, {id: 'visotalk/dark'});
  assert.deepEqual(doc.scenes[0], {id: 's', lines: [], duration: 3, parts: [], animations: []});
});
