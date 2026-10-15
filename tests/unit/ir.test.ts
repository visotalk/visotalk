import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {PINNED_CHROME} from '../../packages/exporter/src/chrome.ts';
import {alignmentIssues, evaluate, identifiers, parseMarkup, parseSay, sayOf, snap, solve, staticQa, validate, wordTime, type VisoDoc} from '../../packages/ir/src/index.ts';

const example = (): VisoDoc => parseMarkup(readFileSync('examples/micrograd-backward/doc.tsx', 'utf8')).doc;
const voice = {l1: {duration: 3.5, audio: 'a1.ogg'}, l2: {duration: 4.6, audio: 'a2.ogg'}, l3: {duration: 3.7, audio: 'a3.ogg'}};

test('expressions: arithmetic, functions, ternary, no unknown names', () => {
  assert.equal(evaluate('x * y + 1', {x: 2, y: -3}), -5);
  assert.equal(evaluate("fmt(x / 3, '0.00')", {x: 2}), '0.67');
  assert.equal(evaluate('x > 0 ? 1 : -1', {x: -2}), -1);
  assert.equal(evaluate('round(clamp(x, 0, 1) * 100, 1)', {x: 0.12345}), 12.3);
  assert.deepEqual(identifiers('max(a, b * c) - 2'), ['a', 'b', 'c']);
  assert.throws(() => evaluate('x', {}), /unknown name/);
  assert.throws(() => evaluate('alert(1)', {}), /unknown function/);
  assert.throws(() => evaluate('x.constructor', {x: 1}), /unexpected/);
});

test('validator: example is valid', () => {
  assert.deepEqual(validate(example()), []);
});

test('validator: seeded mistakes', () => {
  const cases: Array<[(d: any) => void, string]> = [
    [(d) => (d.scenes[0].beats[0].actions[0].at.word = 'sideways'), 'anchor.word'],
    [(d) => (d.objects.g.nodes[3].fields[0].value = {$expr: 'x * w'}), 'expr.unknown'],
    [(d) => (d.scenes[0].beats[1].actions[0].target = 'g#q.grad'), 'ref.path'],
    [(d) => (d.scenes[0].beats[1].actions[0].at = {line: 'l1'}), 'anchor.line'],
    [(d) => delete d.overrides[0].preset, 'override.preset'],
    [(d) => delete d.overrides[0].keys[0].at.ref, 'override.anchor'],
    [(d) => (d.overrides[0].keys[0].at.ref = 'backward/nope'), 'ref.beat'],
    [(d) => (d.scenes[0].beats[1].interactions[0].do[0].setParam = 'q'), 'ref.param'],
    [(d) => (d.objects.g.nodes[0].fields[0].value = {$expr: 'x *'}), 'expr.parse'],
    [(d) => (d.scenes[0].beats[1].lines[0].live = 'z is {x * k}'), 'expr.unknown'],
    [(d) => (d.spec = '0.1.0'), 'spec.version'],
  ];
  for (const [mutate, code] of cases) {
    const d = example();
    mutate(d);
    assert.ok(validate(d).some((i) => i.code === code), `expected ${code}`);
  }
});

test('solver: pacing, beats, anchors', () => {
  const c = solve(example(), voice);
  const [forward, grads] = c.scenes[0].beats;
  assert.equal(forward.lines[0].from, 0.4); // default lead
  assert.equal(grads.from, forward.end);
  assert.ok(Math.abs(forward.end - (0.4 + 3.5 + 0.4)) < 1e-9); // lead + line + hold
  const d2 = example();
  d2.pacing = {lead: 1, hold: 0};
  const c2 = solve(d2, voice);
  assert.equal(c2.scenes[0].beats[0].lines[0].from, 1);
  assert.ok(Math.abs(c2.scenes[0].beats[0].end - 4.5) < 1e-9);
  // staggered flow actions keep their order
  const flows = c.actions.filter((a) => a.motion === 'flow').map((a) => a.path);
  assert.deepEqual(flows, ['g#e3', 'g#e1', 'g#e2']);
});

test('solver: word timings from alignment beat the character estimate', () => {
  const line = {id: 'l', text: 'a b', say: 'first the forward pass', from: 10, duration: 4,
    words: [{w: 'first', t0: 0, t1: 0.5}, {w: 'the', t0: 0.6, t1: 0.7}, {w: 'forward', t0: 2, t1: 2.4}, {w: 'pass', t0: 2.5, t1: 3}]};
  assert.equal(wordTime(line, 'forward pass', 'start'), 12);
  assert.equal(wordTime(line, 'forward pass', 'end'), 13);
  const estimated = {...line, words: undefined};
  assert.ok(Math.abs(wordTime(estimated, 'forward', 'start') - (10 + (4 * 10) / 22)) < 1e-9);
});

test('solver: word anchors match non-Latin words and phrases that span several aligned words', () => {
  // Chinese, written as escapes: source files stay free of CJK (see CLAUDE.md, Language)
  const zh: any = {from: 10, duration: 4, say: '\u68af\u5ea6 \u4e0b\u964d \u5f88 \u6709\u7528',
    words: [{w: '\u68af\u5ea6', t0: 0, t1: 1}, {w: '\u4e0b\u964d', t0: 1, t1: 2}, {w: '\u5f88', t0: 2, t1: 2.5}, {w: '\u6709\u7528', t0: 2.5, t1: 4}]};
  assert.equal(wordTime(zh, '\u6709\u7528', 'start'), 12.5);
  assert.equal(wordTime(zh, '\u4e0b\u964d', 'end'), 12);
  // a phrase written without spaces covers two aligned words
  assert.equal(wordTime(zh, '\u5f88\u6709\u7528', 'start'), 12);
  assert.equal(wordTime(zh, '\u5f88\u6709\u7528', 'end'), 14);
  // per-character alignment: one phrase, three aligned units
  const chars: any = {from: 0, duration: 3, say: '\u68af\u5ea6\u4e0b\u964d', words: [{w: '\u68af', t0: 0, t1: 1}, {w: '\u5ea6', t0: 1, t1: 2}, {w: '\u4e0b', t0: 2, t1: 3}]};
  assert.equal(wordTime(chars, '\u5ea6\u4e0b', 'start'), 1);
  assert.equal(wordTime(chars, '\u5ea6\u4e0b', 'end'), 3);
  // accents and apostrophes keep working
  const fr: any = {from: 0, duration: 4, say: "a café isn't open", words: [{w: 'a', t0: 0, t1: 1}, {w: 'café', t0: 1, t1: 2}, {w: "isn't", t0: 2, t1: 3}, {w: 'open', t0: 3, t1: 4}]};
  assert.equal(wordTime(fr, 'café', 'start'), 1);
  assert.equal(wordTime(fr, "isn't open", 'end'), 4);
});

test('solver: word times come from the line, else the voice manifest, else the estimate', () => {
  const words = [{w: 'first', t0: 0, t1: 0.5}, {w: 'the', t0: 0.6, t1: 0.7}, {w: 'forward', t0: 2, t1: 2.4}, {w: 'pass', t0: 2.5, t1: 3}];
  const aligned = {...voice, l1: {...voice.l1, words}};
  const at = (v: typeof voice, mutate?: (d: VisoDoc) => void) => {
    const d = example();
    // the example anchors on marks; this test is about a phrase, so anchor the drawIn on the phrase
    d.scenes[0].beats[0].actions!.find((a) => a.target === 'g' && a.motion === 'drawIn')!.at = {line: 'l1', word: 'forward pass'};
    mutate?.(d);
    const c = solve(d, v);
    return {from: c.scenes[0].beats[0].lines[0].from, start: c.actions.find((a) => a.path === 'g' && a.motion === 'drawIn')!.start};
  };
  const m = at(aligned);
  assert.equal(m.start, m.from + 2); // "forward pass" starts at the aligned word, not at its character position
  const own = at(aligned, (d) => (d.scenes[0].beats[0].lines![0].words = words.map((w) => ({...w, t0: w.t0 + 1, t1: w.t1 + 1}))));
  assert.equal(own.start, own.from + 3); // a document's own word times win over the manifest's
  const est = at(voice);
  assert.notEqual(est.start, est.from + 2);
});

test('solver: interaction scope (until)', () => {
  const d = example();
  const scene = solve(d, voice).scenes[0];
  assert.equal(solve(d, voice).interactions[0].to, scene.from + scene.duration);
  d.scenes[0].beats[1].interactions![0].until = 'beat';
  assert.equal(solve(d, voice).interactions[0].to, solve(d, voice).scenes[0].beats[1].end);
});

test('qa: reveals are checked against the word that names them', () => {
  // one line, three words each 1 s apart: "alpha" at 0-1 s, "beta" at 1-2 s, "gamma delta" at 2-4 s (from the lead, +0.4 s)
  const words = [{w: 'alpha', t0: 0, t1: 1}, {w: 'beta', t0: 1, t1: 2}, {w: 'gamma', t0: 2, t1: 3}, {w: 'delta', t0: 3, t1: 4}];
  const doc = (objects: any, actions: any[], pattern: any = {kind: 'grid', slots: {items: Object.keys(objects)}}): VisoDoc => ({
    spec: '0.4.0', meta: {id: 'qa', title: 'qa', lang: 'en'}, canvas: {presets: [{id: '16x9', width: 1920, height: 1080}]}, theme: {id: 'visotalk/dark'},
    objects, scenes: [{id: 's', pattern, beats: [{id: 'b', lines: [{id: 'l', text: 'alpha beta gamma delta', say: 'alpha beta gamma delta'}], actions}]}],
  } as any);
  const issues = (d: VisoDoc) => staticQa(d, solve(d, {l: {duration: 4, audio: 'l.ogg', words}})).filter((i) => i.code.startsWith('reveal.'));
  const chip = (text: string, style?: string) => ({type: 'chip', text, ...(style ? {style} : {})});

  // an entrance on the word: in sync
  assert.deepEqual(issues(doc({a: chip('beta')}, [{target: 'a', motion: 'appear', at: {line: 'l', word: 'beta'}}])), []);
  // an entrance anchored on the noun of a longer label is in sync
  assert.deepEqual(issues(doc({a: chip('gamma delta')}, [{target: 'a', motion: 'appear', at: {line: 'l', word: 'delta'}}])), []);
  // no entrance at all: on screen from the start of the scene, two seconds before the word
  const early = issues(doc({a: chip('gamma')}, [{target: 'a', motion: 'highlight', at: {line: 'l', word: 'gamma'}}]));
  assert.deepEqual(early.map((i) => [i.code, i.objects[0]]), [['reveal.early', 'a']]);
  // an entrance well after the word
  const late = issues(doc({a: chip('alpha')}, [{target: 'a', motion: 'appear', at: {line: 'l', word: 'gamma'}}]));
  assert.deepEqual(late.map((i) => i.code), ['reveal.late']);
  // a label the narration does not say makes no claim
  assert.deepEqual(issues(doc({a: chip('omega')}, [{target: 'a', motion: 'appear', at: {line: 'l', word: 'delta'}}])), []);
  // headings frame a scene: not checked
  assert.deepEqual(issues(doc({a: {type: 'text', text: 'gamma', style: 'kicker'}}, [{target: 'a', motion: 'appear', at: {line: 'l', word: 'alpha'}}])), []);
  // a steps item dimmed until highlighted is in sync when highlighted on its word, and a bright one is not
  const steps = (dimInactive?: boolean) => doc({s: {type: 'steps', dimInactive, items: [{id: 'g', title: 'gamma'}]}}, [{target: 's#g', motion: 'highlight', at: {line: 'l', word: 'gamma'}}],
    {kind: 'board', slots: {main: 's'}});
  assert.deepEqual(issues(steps()), []);
  assert.deepEqual(issues(steps(false)).map((i) => i.code), ['reveal.early']);
});

test('validate: morph on a graph node needs a target position', () => {
  const doc = (params?: object): VisoDoc => ({
    spec: '0.4.0', meta: {id: 'm', title: 'm', lang: 'en'}, canvas: {presets: [{id: '16x9', width: 1920, height: 1080}]}, theme: {id: 'visotalk/dark'},
    objects: {g: {type: 'graph', layout: 'manual', nodes: [{id: 'a', kind: 'box', label: 'a'}], edges: [], positions: {a: [0.1, 0.1]}}},
    scenes: [{id: 's', pattern: {kind: 'full', slots: {main: 'g'}}, beats: [{id: 'b', duration: 2, actions: [{target: 'g#a', motion: 'morph', at: {beat: 'start'}, ...(params ? {params} : {})}]}]}],
  } as any);
  assert.ok(validate(doc()).some((i) => i.code === 'motion.morph'));
  assert.ok(validate(doc({to: [0.5]})).some((i) => i.code === 'motion.morph'));
  assert.deepEqual(validate(doc({to: [0.5, 0.2]})), []);
});

test('qa: graph nodes and edges are checked against the words in `says`', () => {
  const words = [{w: 'alpha', t0: 0, t1: 1}, {w: 'beta', t0: 1, t1: 2}, {w: 'gamma', t0: 2, t1: 3}, {w: 'delta', t0: 3, t1: 4}];
  const doc = (actions: any[]): VisoDoc => ({
    spec: '0.4.0', meta: {id: 'qa', title: 'qa', lang: 'en'}, canvas: {presets: [{id: '16x9', width: 1920, height: 1080}]}, theme: {id: 'visotalk/dark'},
    objects: {g: {type: 'graph', layout: 'manual', nodes: [{id: 'a', kind: 'box', label: 'x1'}, {id: 'b', kind: 'box', label: 'x2', says: 'delta'}], edges: [{id: 'e', from: 'b', to: 'a', says: 'beta'}], positions: {a: [0.1, 0.5], b: [0.8, 0.5]}}},
    scenes: [{id: 's', pattern: {kind: 'full', slots: {main: 'g'}}, beats: [{id: 'b', lines: [{id: 'l', text: 'alpha beta gamma delta', say: 'alpha beta gamma delta'}], actions}]}],
  } as any);
  const issues = (d: VisoDoc) => staticQa(d, solve(d, {l: {duration: 4, audio: 'l.ogg', words}})).filter((i) => i.code.startsWith('reveal.')).map((i) => [i.code, i.objects[0]]);
  const on = (target: string, word: string) => ({target, motion: 'appear', at: {line: 'l', word}});
  assert.deepEqual(issues(doc([on('g#a', 'alpha'), on('g#b', 'delta'), on('g#e', 'beta')])), []);
  // an edge drawn with its node, a line before it is named; a node on screen from the start
  assert.deepEqual(issues(doc([on('g#a', 'alpha'), on('g#b', 'alpha'), on('g#e', 'alpha')])), [['reveal.early', 'g#b'], ['reveal.early', 'g#e']]);
  assert.deepEqual(issues(doc([on('g#a', 'alpha'), on('g#e', 'beta')])), [['reveal.early', 'g#b']]);
});

test('qa: a figure on screen before it is spoken', () => {
  // "the second billion took 123 years in 1927": the card shows 123 and 1927 from the word "second"
  const say = 'second billion took one hundred and twenty three years in nineteen twenty seven';
  const ws = say.split(' ').map((w, i) => ({w, t0: i * 0.5, t1: i * 0.5 + 0.5}));
  const doc = (word: string): VisoDoc => ({
    spec: '0.4.0', meta: {id: 'qa', title: 'qa', lang: 'en'}, canvas: {presets: [{id: '16x9', width: 1920, height: 1080}]}, theme: {id: 'visotalk/dark'},
    objects: {c: {type: 'card', title: '2nd - 1927', body: '123'}, d: {type: 'chip', text: 'x'}},
    scenes: [{id: 's', pattern: {kind: 'grid', slots: {items: ['c', 'd']}}, beats: [{id: 'b', lines: [{id: 'l', text: 'second billion took 123 years in 1927', say}],
      actions: [{target: 'c', motion: 'appear', at: {line: 'l', word}}, {target: 'd', motion: 'appear', at: {line: 'l', word: 'years', offset: 3}}]}]}],
  } as any);
  const codes = (d: VisoDoc) => staticQa(d, solve(d, {l: {duration: 6.5, audio: 'l.ogg', words: ws}})).filter((i) => i.code === 'reveal.number-early').map((i) => i.objects[0]);
  assert.deepEqual(codes(doc('second')), ['c']);
  assert.deepEqual(codes(doc('hundred')), []);
});

test('marks: parsed out of say, bound to words, and rejected when malformed', () => {
  const ok = parseSay('Bro has {#gel}hair gel{/gel} more than {@t}trophies.');
  assert.equal(ok.say, 'Bro has hair gel more than trophies.');
  assert.deepEqual(ok.marks, [{name: 'gel', kind: 'range', from: 2, to: 3}, {name: 't', kind: 'point', from: 6, to: 6}]);
  assert.deepEqual(ok.errors, []);
  // nested and overlapping ranges of different names are fine
  assert.deepEqual(parseSay('{#a}one {#b}two{/a} three{/b}').marks.map((m) => [m.name, m.from, m.to]), [['a', 0, 1], ['b', 1, 2]]);
  const bad = (raw: string) => parseSay(raw).errors.join(' | ');
  assert.match(bad('a {#x}b'), /never closed/);
  assert.match(bad('{/x}a'), /not opened/);
  assert.match(bad('ge{@m}l is'), /inside a word/);
  assert.match(bad('{#a}{/a} z'), /no word/);
  assert.match(bad('{@p}a {@p}b'), /defined twice/);
  assert.match(bad('He said {@p}'), /no word after/);
  // braces that are not marks stay as they are
  assert.equal(parseSay('set {x} to 1').say, 'set {x} to 1');
});

test('marks: anchors and `during` resolve on the words they name', () => {
  // "one" 0-1 s, "two" 1-2, "three" 2-3, "four" 3-4 (the line starts at 0.4 s, the pacing lead)
  const words = [{w: 'one', t0: 0, t1: 1}, {w: 'two', t0: 1, t1: 2}, {w: 'three', t0: 2, t1: 3}, {w: 'four', t0: 3, t1: 4}];
  const make = (say: string, actions: any[], extra: any = {}): VisoDoc => ({
    spec: '0.4.0', meta: {id: 'm', title: 'm', lang: 'en'}, canvas: {presets: [{id: '16x9', width: 1920, height: 1080}]}, theme: {id: 'visotalk/dark'},
    objects: {a: {type: 'chip', text: 'a'}}, scenes: [{id: 's', pattern: {kind: 'grid', slots: {items: ['a']}}, beats: [{id: 'b', lines: [{id: 'l', text: 'one two three four', say, ...extra}], actions}]}],
  } as any);
  const solved = (d: VisoDoc) => solve(d, {l: {duration: 4, audio: 'l.ogg', words}});
  const say = 'one {#mid}two three{/mid} {@end}four';
  const d = make(say, [{target: 'a', motion: 'appear', at: {line: 'l', mark: 'mid'}, during: true}]);
  assert.deepEqual(validate(d), []);
  const c = solved(d);
  const start = c.scenes[0].beats[0].lines[0].from;
  assert.equal(sayOf(d, d.scenes[0].beats[0].lines![0]), 'one two three four');
  assert.equal(c.actions.find((a) => a.motion === 'appear')!.start, snap(30, start + 1));
  assert.equal(c.actions.find((a) => a.motion === 'disappear')!.start, snap(30, start + 3));
  const point = solved(make(say, [{target: 'a', motion: 'appear', at: {line: 'l', mark: 'end'}}]));
  assert.equal(point.actions[0].start, snap(30, start + 3));
  const edge = solved(make(say, [{target: 'a', motion: 'appear', at: {line: 'l', mark: 'mid', edge: 'end', offset: 0.1}}]));
  assert.equal(edge.actions[0].start, snap(30, start + 3.1));
  // without aligned words the position in the text decides
  const est = solve(d, {l: {duration: 4, audio: 'l.ogg'}});
  assert.equal(est.actions.find((a) => a.motion === 'appear')!.start, snap(30, start + (4 * 4) / 18));

  const codes = (x: VisoDoc) => validate(x).map((i) => i.code);
  assert.deepEqual(codes(make(say, [{target: 'a', motion: 'appear', at: {line: 'l', mark: 'nope'}}])), ['anchor.mark']);
  assert.deepEqual(codes(make(say, [{target: 'a', motion: 'appear', at: {line: 'l', mark: 'mid', word: 'two'}}])), ['anchor.both']);
  assert.deepEqual(codes(make(say, [{target: 'a', motion: 'appear', at: {line: 'l', mark: 'end'}, during: true}])), ['action.during']);
  assert.deepEqual(codes(make(say, [{target: 'a', motion: 'highlight', at: {line: 'l', mark: 'mid'}, during: true}])), ['action.during']);
  assert.deepEqual(codes(make('one {#mid}two', [])), ['mark.syntax']);
  // a translation carries the same marks
  const tr = (tsay: string) => codes(make(say, [], {i18n: {fr: {text: 'un deux trois quatre', say: tsay}}}));
  assert.deepEqual(tr('un {#mid}deux trois{/mid} {@end}quatre'), []);
  assert.deepEqual(tr('un deux trois quatre'), ['mark.i18n']);
});

test('solver: every event sits on the frame grid, so a frame number is the whole of a time', () => {
  const d = example();
  for (const fps of [24, 30, 60]) {
    const c = solve(d, voice, fps);
    const onGrid = (t: number) => t === snap(fps, t);
    assert.equal(c.fps, fps);
    assert.ok(onGrid(c.duration));
    for (const sc of c.scenes) {
      assert.ok(onGrid(sc.from) && onGrid(sc.end));
      for (const b of sc.beats) assert.ok(onGrid(b.from) && onGrid(b.end) && b.from >= sc.from && b.end <= sc.end);
    }
    for (const a of c.actions) assert.ok(onGrid(a.start), `action on ${a.path} starts off the grid: ${a.start}`);
    // the frame count is whole, and the frame that ends one scene starts the next
    assert.equal(c.duration * fps, Math.round(c.duration * fps));
    for (let i = 1; i < c.scenes.length; i++) assert.equal(c.scenes[i].from, c.scenes[i - 1].end);
  }
  // the rule: the nearest frame, halves up, however long the document
  assert.equal(snap(30, 0.016), 0);
  assert.equal(snap(30, 0.017), 1 / 30);
  assert.equal(snap(30, 100.0166), 3000 / 30);
  // a document's own export rate is the default
  assert.equal(solve({...d, exports: {fps: 24}} as VisoDoc, voice).fps, 24);
});

test('validator: an issue with a standard answer carries a fix, and a style issue lists the styles that exist', () => {
  const d: any = example();
  d.objects.bad = {type: 'chip', text: 'x', style: 'nope'};
  d.scenes[0].beats[0].actions.push({target: 'g', motion: 'appear', at: {line: 'l1', word: 'zzz'}});
  const issues = validate(d);
  const style = issues.find((i) => i.code === 'style.unknown')!;
  assert.match(style.fix!, /use one of: default, tool, mono/);
  assert.match(issues.find((i) => i.code === 'anchor.word')!.fix!, /mark/);
  assert.ok(issues.every((i) => i.fix));
});

test('the goldens were recorded with the pinned Chrome', () => {
  const goldens = readdirSync('tests/regression/golden').filter((f) => f.endsWith('.json'));
  assert.ok(goldens.length >= 4);
  for (const f of goldens) assert.equal(JSON.parse(readFileSync(`tests/regression/golden/${f}`, 'utf8')).chrome, `HeadlessChrome/${PINNED_CHROME}`, f);
});

test('qa: word anchors that rest on weak or missing alignment are reported', () => {
  const words = [{w: 'one', t0: 0, t1: 1, p: 0.99}, {w: 'two', t0: 1, t1: 2, p: 0.2}, {w: '3', t0: 2, t1: 2}, {w: 'four', t0: 2, t1: 4, p: 0.9}];
  const make = (at: any, extra: any = {}): VisoDoc => ({
    spec: '0.4.0', meta: {id: 'al', title: 'al', lang: 'en'}, canvas: {presets: [{id: '16x9', width: 1920, height: 1080}]}, theme: {id: 'visotalk/dark'},
    objects: {a: {type: 'chip', text: 'a'}}, scenes: [{id: 's', pattern: {kind: 'grid', slots: {items: ['a']}}, beats: [{id: 'b',
      lines: [{id: 'l', text: 'one two 3 four', say: 'one {#r}two 3{/r} four'}], actions: [{target: 'a', motion: 'appear', at: {line: 'l', ...at}, ...extra}]}]}],
  } as any);
  const run = (d: VisoDoc, w: unknown = words) => alignmentIssues(d, solve(d, {l: {duration: 4, audio: 'l.ogg', words: (w ?? undefined) as any}}));
  assert.deepEqual(run(make({word: 'one'})), []);
  assert.deepEqual(run(make({word: 'two'})).map((i) => i.code), ['align.weak']);
  assert.match(run(make({word: 'two'}))[0].message, /p = 0\.20/);
  // a word without letters has no time of its own, when the others have evidence
  assert.match(run(make({word: '3'}))[0].message, /no letters/);
  // a mark: the start word of the range is checked, and with `during` its end word too
  assert.deepEqual(run(make({mark: 'r'})).map((i) => i.code), ['align.weak']);
  assert.deepEqual(run(make({mark: 'r', edge: 'end'})).map((i) => i.code), ['align.weak']);
  assert.equal(run(make({mark: 'r'}, {during: true})).length, 2);
  assert.deepEqual(run(make({word: 'four'})), []);
  // legacy word times with no probabilities say nothing
  assert.deepEqual(run(make({word: 'two'}), words.map(({p, ...w}) => w)), []);
  // no word times at all: one issue for the document, naming the lines
  const none = run(make({word: 'two'}), null);
  assert.deepEqual(none.map((i) => i.code), ['align.estimated']);
  assert.match(none[0].message, /"l"/);
  // an anchor on a line or beat edge needs no words
  assert.deepEqual(run(make({offset: 0.2}), null), []);
});
