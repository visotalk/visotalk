import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MarkupError, parseMarkup, printMarkup, revealIssues, solve, staticQa, validate, type VisoDoc, type VoiceManifest} from '../../packages/ir/src/index.ts';

const EXAMPLES = ['micrograd-backward', 'micrograd', 'uv', 'liftoff'];
const load = (n: string): VisoDoc => parseMarkup(readFileSync(`examples/${n}/doc.tsx`, 'utf8')).doc;

/** One fixed duration per line, so two documents can be compared by what the solver makes of them */
function voiceFor(doc: VisoDoc): VoiceManifest {
  const v: VoiceManifest = {};
  let k = 0;
  for (const s of doc.scenes) for (const b of s.beats) for (const l of b.lines ?? []) v[l.id] = {duration: 3 + (k++ % 5) * 0.37, audio: 'x.ogg'};
  return v;
}
const timeline = (doc: VisoDoc) => {
  const c = solve(doc, voiceFor(doc));
  const r = (x: number) => Math.round(x * 1e6) / 1e6;
  return JSON.stringify({
    scenes: c.scenes.map((s) => ({id: s.id, from: r(s.from), end: r(s.end), beats: s.beats.map((b) => ({id: b.id, from: r(b.from), end: r(b.end), lines: b.lines.map((l) => ({id: l.id, from: r(l.from), say: l.say}))}))})),
    actions: c.actions.map((a) => ({path: a.path, motion: a.motion, start: r(a.start), dur: Number.isNaN(a.dur) ? null : r(a.dur)})).sort((x, y) => (x.path + x.motion + x.start).localeCompare(y.path + y.motion + y.start)),
  });
};

test('markup: a small document compiles to marks and actions', () => {
  const {doc} = parseMarkup(`<Doc id="demo" title="Demo" lang="en">
    <Chip id="tag" text="ETag: v7a1c" style="mono"/>
    <Text id="title" text="Same files" style="title"/>
    <Scene id="s" pattern="title" slots={{title: "title", aside: "tag"}}>
      <Beat id="b1">
        <Line id="l1">The server attaches a tag called an <Stamp on="tag">ETag</Stamp> to each <Appear on="title" during>file</Appear>.</Line>
      </Beat>
    </Scene>
  </Doc>`);
  const line = doc.scenes[0].beats[0].lines![0];
  assert.equal(line.text, 'The server attaches a tag called an ETag to each file.');
  assert.equal(line.say, 'The server attaches a tag called an {@m1}ETag to each {#m2}file.{/m2}');
  assert.deepEqual(doc.scenes[0].beats[0].actions, [
    {target: 'tag', motion: 'stamp', at: {line: 'l1', mark: 'm1'}},
    {target: 'title', motion: 'appear', at: {line: 'l1', mark: 'm2'}, during: true},
  ]);
  assert.deepEqual(doc.scenes[0].pattern, {kind: 'title', slots: {title: 'title', aside: 'tag'}});
  assert.deepEqual(validate(doc), []);
});

test('markup: mistakes name the line and what to write instead', () => {
  const bad = (src: string, re: RegExp, line: number) => {
    try { parseMarkup(src); assert.fail('should not compile'); } catch (e) {
      assert.ok(e instanceof MarkupError, String(e));
      assert.match(e.message, re);
      assert.equal(e.line, line);
    }
  };
  bad('<Doc id="a" title="t" lang="en">\n<Chip text="x"/>\n</Doc>', /needs an id/, 2);
  bad('<Doc id="a" title="t" lang="en">\n<Scene id="s">\n<Beat id="b"><Line id="l">hi <Stamp>x</Stamp></Line></Beat></Scene></Doc>', /needs on=/, 3);
  bad('<Doc id="a" title="t" lang="en">\n<Scene id="s"><Beat id="b" colour="red"/></Scene></Doc>', /no attribute "colour"/, 2);
  bad('<Doc id="a" title="t" lang="en">\n<Scene id="s"><Beat id="b"><Line id="l">a</Beat></Scene></Doc>', /does not match <Line>/, 2);
  bad('<Doc id="a" title="t" lang="en">\n<Scene id="s"><Beat id="b">stray</Beat></Scene></Doc>', /only allowed inside <Line>/, 2);
});

for (const name of EXAMPLES) {
  test(`markup: ${name} prints and compiles back to the same timeline`, () => {
    const original = load(name);
    const text = printMarkup(original);
    const {doc} = parseMarkup(text);
    assert.deepEqual(validate(doc), validate(original));
    assert.equal(timeline(doc), timeline(original));
    assert.deepEqual(doc.objects, original.objects);
    assert.equal(printMarkup(doc), text, 'printing is stable');
  });
}

test('markup: after="id" compiles to an action anchor and prints back', () => {
  const src = `<Doc id="chain" title="Chain" lang="en">
    <Text id="a" text="First" style="title"/>
    <Text id="b" text="Second" style="title"/>
    <Scene id="s" pattern="board" slots={{title: "a", main: "b"}}>
      <Beat id="one" duration={3}>
        <Appear on="a" id="x" at="start" dur={0.5}/>
        <Appear on="b" id="y" after="x" edge="end" offset={0.25}/>
      </Beat>
    </Scene>
  </Doc>`;
  const {doc} = parseMarkup(src);
  assert.deepEqual(doc.scenes[0].beats[0].actions![1].at, {after: 'x', edge: 'end', offset: 0.25});
  assert.deepEqual(validate(doc), []);
  const printed = printMarkup(doc);
  assert.match(printed, /after="x"/);
  assert.deepEqual(parseMarkup(printed).doc, doc);
  assert.throws(() => parseMarkup(src.replace('after="x"', 'after="x" at="end"')), MarkupError);
});

test('markup: a TSX file is read as TSX: import of the tags, export default, comments, JSX strings, ids as strings', () => {
  const src = `import {Doc, Text, Scene, Beat, Line} from '@visotalk/jsx';

  /* a leading comment */
  export default (<Doc id="d" title="Say &quot;hi&quot;" lang="en">
    {/* an object */}
    <Text id="t" text={"a \\"quoted\\" word"} style="title"/>
    <Text id="p" text="C:\\path\\n" />
    <Scene id="s" pattern="full" slots={{main: "t"}}>
      <Beat id="b"><Line id="l">Hello.</Line></Beat>
    </Scene>
  </Doc>);`;
  const {doc} = parseMarkup(src);
  assert.equal(doc.meta.title, 'Say "hi"');
  assert.equal((doc.objects.t as {text: string}).text, 'a "quoted" word');
  assert.equal((doc.objects.p as {text: string}).text, 'C:\\path\\n'); // a JSX string has no escapes
  const printed = printMarkup(doc);
  assert.match(printed, /^import \{[^}]*\bDoc\b[^}]*\} from '@visotalk\/jsx';/);
  assert.match(printed, /export default <Doc/);
  assert.deepEqual(parseMarkup(printed).doc, doc);
  assert.throws(() => parseMarkup(src.replace('main: "t"', 'main: t')), /holds no variables/);
  assert.throws(() => parseMarkup(src.replace(`import {Doc`, `import {Doc} from 'react';\nimport {Doc`)), MarkupError);
  assert.throws(() => parseMarkup(src.replace('pattern="full"', 'pattern={{kind: "full"}}')), /name of a pattern/);
});

test('markup: a component is an import and a tag; <Tween> and <Set> take props as attributes', () => {
  const src = `import {Doc, Scene, Beat, Appear, Tween, Set} from '@visotalk/jsx';
import {MoonPhases} from './components/moon-phases.ts';

export default <Doc id="c" title="c" lang="en">
  <MoonPhases id="view" phase={0} label="the moon" disc={false}/>
  <Scene id="s" pattern="full" slots={{main: "view"}}>
    <Beat id="b" duration={3}>
      <Appear on="view" at="start"/>
      <Tween on="view" phase={0.5} id="t1" at="start" dur={1}/>
      <Set on="view" disc params={{props: {offset: 1}}} after="t1"/>
    </Beat>
  </Scene>
</Doc>;`;
  const {doc} = parseMarkup(src);
  assert.deepEqual(doc.components, [{id: 'moon-phases', module: './components/moon-phases.ts', export: 'MoonPhases', contract: 'visotalk/timed@1'}]);
  assert.deepEqual(doc.objects.view, {type: 'component', component: 'moon-phases', label: 'the moon', props: {phase: 0, disc: false}});
  const [, tween, set] = doc.scenes[0].beats[0].actions!;
  assert.deepEqual(tween, {target: 'view', motion: 'tween', at: {beat: 'start'}, dur: 1, id: 't1', params: {props: {phase: 0.5}}});
  assert.deepEqual(set.params, {props: {offset: 1, disc: true}}); // a prop named like an attribute of the action goes in params
  assert.deepEqual(validate(doc), []);
  const printed = printMarkup(doc);
  assert.match(printed, /import \{MoonPhases\} from "\.\/components\/moon-phases\.ts";/);
  assert.doesNotMatch(printed, /import \{[^}]*MoonPhases[^}]*\} from '@visotalk\/jsx'/);
  assert.deepEqual(parseMarkup(printed).doc, doc);
  assert.throws(() => parseMarkup(src.replace('MoonPhases', 'Card')), /is a tag of the document/);
});

test('markup: a prop named like an action attribute is refused with the way out, never dropped', () => {
  const wrapped = `import {Doc, Scene, Beat, Line, Tween} from '@visotalk/jsx';
export default <Doc id="d" title="t" lang="en">
  <Scene id="s" pattern="full"><Beat id="b"><Line id="l"><Tween on="view" mark={1}>go</Tween></Line></Beat></Scene>
</Doc>;`;
  assert.throws(() => parseMarkup(wrapped), /params=\{\{props: \{mark: …\}\}\}/);
  const beat = wrapped.replace('<Line id="l"><Tween on="view" mark={1}>go</Tween></Line>', '<Tween on="view" mark={1} at="start"/>');
  assert.throws(() => parseMarkup(beat), /mark.*params=\{\{props: \{mark: …\}\}\}/);
});

test('markup: an empty motion at the end of a <Line> is refused in terms of words, not marks', () => {
  const src = `import {Doc, Scene, Beat, Line, Appear, Text} from '@visotalk/jsx';
export default <Doc id="d" title="t" lang="en">
  <Text id="x" text="hi"/>
  <Scene id="s" pattern="full" slots={{main: "x"}}><Beat id="b"><Line id="l">go now <Appear on="x"/></Line></Beat></Scene>
</Doc>;`;
  assert.throws(() => parseMarkup(src), /nothing after it.*wrap the words/);
});

test('markup: look and scale are free attributes of every object', () => {
  const src = `import {Doc, Scene, Beat, Text, Card} from '@visotalk/jsx';
export default <Doc id="d" title="t" lang="en">
  <Text id="t" text="hi" look={{size: 90, color: "grad", background: "panel", radius: 20}}/>
  <Card id="k" title="x" scale={1.5}/>
  <Scene id="s" pattern="board" slots={{title: "t", main: "k"}}><Beat id="b" duration={2}/></Scene>
</Doc>;`;
  const {doc} = parseMarkup(src);
  assert.deepEqual(doc.objects.t, {type: 'text', text: 'hi', look: {size: 90, color: 'grad', background: 'panel', radius: 20}});
  assert.equal((doc.objects.k as {scale?: number}).scale, 1.5);
  assert.deepEqual(validate(doc), []);
  assert.deepEqual(parseMarkup(printMarkup(doc)).doc, doc);
});

test('review: a scene passes only on answers that name what the sentence names, say yes and report no problem, on the scene as it is', async () => {
  const {namedPhrases, recordReview, recordStill, sceneFingerprints, unreviewedScenes} = await import('../../packages/cli/src/project.ts');
  const {mkdtempSync} = await import('node:fs');
  const src = `import {Doc, Scene, Beat, Text} from '@visotalk/jsx';
export default <Doc id="d" title="t" lang="en">
  <Text id="t1" text="Bars that grow"/>
  <Text id="t2" text="Cards that change"/>
  <Scene id="bars-scene" pattern="full" slots={{main: "t1"}}><Beat id="b" duration={2}/></Scene>
  <Scene id="chain-scene" pattern="full" slots={{main: "t2"}}><Beat id="b" duration={2}/></Scene>
</Doc>;`;
  const dir = mkdtempSync('/tmp/vt-review-');
  const p = (text: string) => ({file: dir + '/doc.tsx', dir, work: dir, doc: parseMarkup(text).doc, locs: new Map()});
  const before = sceneFingerprints(p(src));
  assert.deepEqual(Object.keys(before), ['bars-scene', 'chain-scene']);
  assert.deepEqual(sceneFingerprints(p(src)), before);
  const edited = sceneFingerprints(p(src.replace('Cards that change', 'Cards that changed')));
  assert.equal(edited['bars-scene'], before['bars-scene']);
  assert.notEqual(edited['chain-scene'], before['chain-scene']);

  assert.deepEqual(namedPhrases({text: 'x', say: 'a {#m1}red apple{/m1} and {@m2}pears'}), ['red apple', 'pears']);
  assert.deepEqual(namedPhrases({text: 'x'}), []);

  const doc = p(src);
  assert.match(recordReview(doc, 'bars-scene', {seen: 'bars', designed: 'yes', distinct: 'yes', problems: 'none'}).errors[0], /no full-size still/);
  recordStill(doc, 'bars-scene', {beat: 'b1', time: 1, line: 'l1', text: 'x', names: ['red apple', 'pears']});
  assert.match(recordReview(doc, 'bars-scene', {seen: 'the red apple is left', designed: 'yes', distinct: 'yes', problems: 'none'}).errors[0], /"pears"/);
  assert.match(recordReview(doc, 'bars-scene', {seen: 'red apple left, pears right', distinct: 'yes', problems: 'none'}).errors[0], /designed/);
  assert.deepEqual(unreviewedScenes(doc), ['bars-scene', 'chain-scene']);
  assert.deepEqual(recordReview(doc, 'bars-scene', {seen: 'red apple left, pears right', designed: 'yes', distinct: 'yes', problems: 'the pears are tiny'}), {ok: false, errors: []});
  assert.deepEqual(unreviewedScenes(doc), ['bars-scene', 'chain-scene']); // recorded, but with something left to change
  assert.deepEqual(recordReview(doc, 'bars-scene', {seen: 'red apple left, pears right', designed: 'yes', distinct: 'no', problems: 'none'}), {ok: false, errors: []}); // a slide deck could have made it
  assert.match(recordReview(doc, 'bars-scene', {seen: 'red apple left, pears right', designed: 'yes', problems: 'none'}).errors[0], /distinct/);
  assert.deepEqual(unreviewedScenes(doc), ['bars-scene', 'chain-scene']);
  assert.deepEqual(recordReview(doc, 'bars-scene', {seen: 'red apple left, pears right', designed: 'yes', distinct: 'yes', problems: 'none'}), {ok: true, errors: []});
  assert.deepEqual(unreviewedScenes(doc), ['chain-scene']);
  // the scene changes: its review no longer counts, and a new answer needs a new still
  const changed = p(src.replace('Bars that grow', 'Bars that grew'));
  assert.deepEqual(unreviewedScenes(changed), ['bars-scene', 'chain-scene']);
  assert.match(recordReview(changed, 'bars-scene', {seen: 'x y z', designed: 'yes', distinct: 'yes', problems: 'none'}).errors[0], /changed after its last still/);
});

test('qa: a component that draws a sentence is reported, a short label or a line marked // label is not', async () => {
  const {componentTextIssues} = await import('../../packages/cli/src/project.ts');
  const {mkdtempSync, mkdirSync, writeFileSync} = await import('node:fs');
  const dir = mkdtempSync('/tmp/vt-text-');
  mkdirSync(dir + '/components');
  writeFileSync(dir + '/components/c.ts', [
    "import {defineComponent} from '@visotalk/runtime';",
    "// a comment with three words in it",
    "g.fillText('snapshot', 0, 0);",
    "g.fillText('no parent', 0, 0);",
    "g.fillText('you are here', 0, 0);",
    "g.fillText('you are here', 0, 0); // label",
    "canvas.style.cssText = 'width:100%;height:100%;display:block';",
    "g.fillText(`Commit ${i + 1}`, 0, 0);",
    "g.fillText(\"Tamper-evident: no quiet changes\", 0, 0);",
  ].join('\n'));
  const p = {file: dir + '/doc.tsx', dir, work: dir, doc: {components: [{id: 'c', module: './components/c.ts', export: 'C', contract: 'visotalk/timed@1'}]} as never, locs: new Map()};
  const found = componentTextIssues(p as never);
  assert.deepEqual(found.map((i) => i.at), ['components/c.ts:5', 'components/c.ts:9']);
  assert.equal(found[0].code, 'component.text');
  assert.match(found[0].message, /you are here/);
});

test('markup: a shape carries its own place, numbers and look, and tweens them', () => {
  const src = `import {Doc, Scene, Beat, Shape, Tween} from '@visotalk/jsx';
export default <Doc id="d" title="t" lang="en">
  <Shape id="bar" shape="rect" x={100} y={200} w={80} h={10} look={{fill: "data", radius: 8}}/>
  <Shape id="link" shape="line" x1={0} y1={0} x2={300} y2={0} arrow draw={0}/>
  <Scene id="s" pattern="full" slots={{main: ["bar", "link"]}}>
    <Beat id="b" duration={2}><Tween on="bar" h={300} at="start" dur={1}/><Tween on="link" draw={1} at="start" dur={1}/></Beat>
  </Scene>
</Doc>;`;
  const {doc} = parseMarkup(src);
  assert.deepEqual(doc.objects.bar, {type: 'shape', shape: 'rect', x: 100, y: 200, w: 80, h: 10, look: {fill: 'data', radius: 8}});
  assert.deepEqual(doc.objects.link, {type: 'shape', shape: 'line', x1: 0, y1: 0, x2: 300, y2: 0, arrow: true, draw: 0});
  assert.deepEqual(validate(doc), []);
  assert.deepEqual(parseMarkup(printMarkup(doc)).doc, doc);
});

test('markup: an icon shape names a built-in icon and an svg shape carries markup; an unknown icon is an issue', () => {
  const doc = (shape: string) => parseMarkup(`import {Doc, Scene, Beat, Shape} from '@visotalk/jsx';
export default <Doc id="d" title="t" lang="en">
  ${shape}
  <Scene id="s" pattern="full" slots={{main: ["i"]}}><Beat id="b" duration={2}/></Scene>
</Doc>;`).doc;
  assert.deepEqual(validate(doc('<Shape id="i" shape="icon" icon="rocket" x={0} y={0} w={100}/>')), []);
  assert.deepEqual(validate(doc(`<Shape id="i" shape="svg" x={0} y={0} w={100} svg={'<svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="3"/></svg>'}/>`)), []);
  assert.equal(validate(doc('<Shape id="i" shape="icon" icon="no-such-icon" x={0} y={0} w={100}/>'))[0].code, 'shape.icon');
  assert.equal(validate(doc('<Shape id="i" shape="icon" x={0} y={0} w={100}/>'))[0].code, 'shape.icon');
  assert.equal(validate(doc('<Shape id="i" shape="svg" x={0} y={0} w={100}/>'))[0].code, 'shape.icon');
});

test('markup: a prop named edge on a tween is explained, not reported as a tween without props', () => {
  const doc = (attrs: string) => `import {Doc, Scene, Beat, Shape, Tween} from '@visotalk/jsx';
export default <Doc id="d" title="t" lang="en">
  <Shape id="s" shape="rect" x={0} y={0} w={10} h={10}/>
  <Scene id="a" pattern="full" slots={{main: "s"}}><Beat id="b" duration={2}><Tween on="s" ${attrs} at="start" dur={1}/></Beat></Scene>
</Doc>;`;
  assert.throws(() => parseMarkup(doc('edge={1}')), /params=\{\{props: \{edge: …\}\}\}/);
  assert.doesNotThrow(() => parseMarkup(doc('params={{props: {edge: 1}}}')));
  assert.doesNotThrow(() => parseMarkup(doc('w={5} edge="end"')));
});

test('qa: a reveal reports how far it is from its word, in seconds', () => {
  const doc = parseMarkup(`import {Doc, Scene, Beat, Line, Text, Appear} from '@visotalk/jsx';
export default <Doc id="d" title="t" lang="en">
  <Text id="fruit" text="apple"/>
  <Scene id="s" pattern="board" slots={{main: "fruit"}}>
    <Beat id="b"><Appear on="fruit" line="l1" offset={2.5}/><Line id="l1">The apple is red and it is sweet.</Line></Beat>
  </Scene>
</Doc>;`).doc;
  const issues = revealIssues(doc, solve(doc, {l1: {duration: 4, audio: 'x'}})).filter((i) => i.code.startsWith('reveal.'));
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, 'reveal.late');
  assert.ok((issues[0].off ?? 0) > 0.75);
});

test('qa: an object on screen for under two seconds is reported, one that stays is not', () => {
  const doc = parseMarkup(`import {Doc, Scene, Beat, Text, Appear, Disappear} from '@visotalk/jsx';
export default <Doc id="d" title="t" lang="en">
  <Text id="brief" text="gone at once"/>
  <Text id="steady" text="stays"/>
  <Scene id="s" pattern="board" slots={{title: ["brief", "steady"]}}>
    <Beat id="b" duration={6}>
      <Appear on="brief" at="start"/><Disappear on="brief" at="start" offset={1}/>
      <Appear on="steady" at="start"/>
    </Beat>
  </Scene>
</Doc>;`).doc;
  const issues = staticQa(doc, solve(doc, {})).filter((i) => i.code === 'visible.brief');
  assert.deepEqual(issues.map((i) => i.objects), [['brief']]);
});

test('design: the four questions come in order, are checked for form, one per command, and are printed back', async () => {
  const {design, designOf, DESIGN_STEPS, MIN_GAP_MS} = await import('../../packages/cli/src/design.ts');
  const {mkdtempSync} = await import('node:fs');
  const doc = mkdtempSync('/tmp/vt-design-') + '/doc.tsx'; // the document need not exist yet
  const long = 'a sentence long enough to count as an answer about the scene, with several words in it';
  const board = `${long} ${long} ${long} 90 px`;
  let t = Date.parse('2026-01-01T00:00:00Z');
  const answer = (scene: string, step: string, text: string) => design(doc, scene, {step, answer: text}, (t += MIN_GAP_MS + 1));
  assert.match(designOf(doc, 'a').missing!, /step 1 of 4 \(thing\)/);
  assert.match(design(doc, 'a', {}).text, /THE THING ITSELF/);
  assert.match(design(doc, 'a', {answer: long}).text, /--step names/); // an answer names its question
  assert.match(answer('a', 'ideas', long).text, /answer that one first/); // out of order
  assert.equal(answer('a', 'thing', 'too short').ok, false);
  assert.equal(answer('a', 'thing', long).ok, true);
  assert.match(design(doc, 'a', {step: 'ideas', answer: `(a) ${long} (b) ${long}`}, t + 100).text, /previous answer was 0\.1 s ago/); // a batch
  assert.match(answer('a', 'ideas', long).text, /write at least two ideas/);
  assert.match(answer('a', 'ideas', `(a) ${long} (b) ${long} I chose (b)`).text, /do not choose here/); // the decision is the next question
  assert.equal(answer('a', 'ideas', `(a) ${long} (b) ${long}`).ok, true);
  assert.match(answer('a', 'reflect', long).text, /name the idea/);
  assert.equal(answer('a', 'reflect', `(b) ${long}`).ok, true);
  assert.match(answer('a', 'board', long).text, /at least 40 words/);
  assert.match(answer('a', 'board', `${long} ${long} ${long}`).text, /in px/);
  assert.match(designOf(doc, 'a').missing!, /step 4 of 4 \(board\)/);
  assert.match(answer('a', 'board', board).text, /is designed/);
  assert.match(designOf(doc, 'a').text!, /^THING: .*\nIDEAS: \(a\)/);
  assert.equal(answer('a', 'reflect', `(a) ${long} again`).ok, true); // a designed step is answered again
  assert.match(designOf(doc, 'b').missing!, /step 1/); // another scene starts over
  assert.equal(DESIGN_STEPS.length, 4);
  assert.equal(design(doc, 'Bad Id', {}).ok, false);
});
