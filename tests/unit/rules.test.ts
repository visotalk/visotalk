import {test} from 'node:test';
import assert from 'node:assert/strict';
import {propsAt, scenePatterns, solve, validate, viewOwn, type VisoDoc} from '../../packages/ir/src/index.ts';

/** two beats of 2 s; `a` enters in beat 2, `b` counts up in beat 2, `c` has a kenBurns before its entrance */
const doc = (): VisoDoc => ({
  spec: '0.4.0', meta: {id: 't', title: 't', lang: 'en'}, canvas: {presets: [{id: '16x9', width: 1920, height: 1080}]},
  objects: {a: {type: 'text', text: 'a'}, b: {type: 'counter', value: 5}, c: {type: 'text', text: 'c'}, d: {type: 'text', text: 'd'}},
  scenes: [{id: 's', pattern: {kind: 'board', slots: {title: 'a', main: 'b', side: 'c'}, options: {side: 0.3}}, beats: [
    {id: 'one', duration: 2, actions: [{target: 'c', motion: 'kenBurns', at: {beat: 'start'}}]},
    {id: 'two', duration: 2, pattern: {slots: {side: null, note: 'd'}, options: {side: 0.5}}, actions: [
      {target: 'a', motion: 'appear', at: {beat: 'start', offset: 0.5}},
      {target: 'b', motion: 'countUp', at: {beat: 'start', offset: 0.5}},
      {target: 'c', motion: 'appear', at: {beat: 'start', offset: 0.5}}]},
  ]}],
});

test('hidden until the first entrance in the scene (not countUp; other motions do not count)', () => {
  const c = solve(doc(), {});
  const shown = (p: string, t: number) => viewOwn(c, p, t).presence > 0;
  assert.equal(shown('a', 0.5), false, 'a is hidden in beat one');
  assert.equal(shown('a', 2.2), false, 'a is hidden in beat two before it enters');
  assert.equal(shown('a', 3.5), true);
  assert.equal(shown('b', 0.5), true, 'countUp does not hide');
  assert.equal(shown('c', 0.5), false, 'kenBurns before the entrance does not make c visible');
  assert.equal(shown('d', 0.5), true, 'no actions: visible');
});

test('a state that shows the object earlier wins over the inferred hiding', () => {
  const d = doc();
  d.scenes[0].beats[0].state = {a: {visible: true}};
  const c = solve(d, {});
  assert.equal(viewOwn(c, 'a', 0.5).presence, 1);
});

test('pattern patches merge over the current pattern; null removes a slot', () => {
  const {beats} = scenePatterns(doc().scenes[0]);
  assert.deepEqual(beats[0], doc().scenes[0].pattern);
  assert.deepEqual(beats[1], {kind: 'board', slots: {title: 'a', main: 'b', note: 'd'}, options: {side: 0.5}});
  const bad = doc();
  delete bad.scenes[0].pattern;
  assert.ok(validate(bad).some((i) => i.code === 'pattern.patch'));
  const ref = doc();
  (ref.scenes[0].beats[1].pattern!.slots as Record<string, string>).note = 'nope';
  assert.ok(validate(ref).some((i) => i.code === 'ref.object'));
});

test('credits: auto scene only when a license obliges attribution and no credits object is placed', async () => {
  const {withCredits, creditsMarkdown} = await import('../../packages/ir/src/index.ts');
  const d = doc();
  assert.equal(withCredits(d).scenes.length, 1, 'no assets: nothing appended');
  d.assets = [{id: 'p', kind: 'image', src: 'p.jpg', source: 'https://example.org/p', license: {id: 'CC-BY-2.0', attribution: 'Ada', obligations: ['attribution']}}];
  const w = withCredits(d);
  assert.equal(w.scenes.length, 2);
  assert.equal(w.scenes[1].beats[0].duration, 5);
  assert.deepEqual(validate(w), []);
  assert.match(creditsMarkdown(d), /Ada · CC-BY-2\.0 · https:\/\/example\.org\/p/);
  d.objects.cr = {type: 'credits'};
  d.scenes[0].pattern!.slots.note = 'cr';
  assert.equal(withCredits(d).scenes.length, 1, 'placed credits object: nothing appended');
  d.exports = {variants: [{preset: '16x9'}], credits: 'none'};
  delete d.scenes[0].pattern!.slots.note;
  assert.equal(withCredits(d).scenes.length, 1, 'credits: none');
});

test('themes: tokens merge over the built-in theme; unknown styles and themes are reported', async () => {
  const {themeTokens, DARK_TOKENS} = await import('../../packages/ir/src/index.ts');
  const t = themeTokens({id: 'visotalk/dark', tokens: {colors: {grad: '#E11D48'}, fonts: {sans: '"Brand Sans", sans-serif', mono: DARK_TOKENS.fonts.mono}}});
  assert.equal(t.colors.grad, '#E11D48');
  assert.equal(t.colors.data, DARK_TOKENS.colors.data);
  assert.equal(t.fonts.sans, '"Brand Sans", sans-serif');
  const d = doc();
  (d.objects.a as {style?: string}).style = 'titel';
  d.objects.e = {type: 'text', text: 'x', runs: [{text: 'x', style: 'shiny'}]};
  d.objects.f = {type: 'chip', text: 'x', style: 'overlay-left'};
  d.theme = {id: 'visotalk/dark'};
  const codes = validate(d).map((i) => `${i.code}@${i.at}`);
  assert.ok(codes.includes('style.unknown@/objects/a/style'));
  assert.ok(codes.includes('style.unknown@/objects/e/runs/0/style'));
  assert.ok(!codes.some((c) => c.includes('/objects/f')), 'chip -left suffix is accepted');
  d.theme = {id: 'acme/neon'};
  assert.ok(validate(d).some((i) => i.code === 'theme.unknown'));
});

test('validate reports an unknown pattern kind and a slot the pattern does not have', () => {
  const d = doc();
  (d.scenes[0].beats[1] as {pattern: unknown}).pattern = {kind: {slots: {note: 'd'}}};
  d.scenes[0].pattern!.slots.nope = 'd';
  const codes = validate(d).map((i) => `${i.code} ${i.at}`);
  assert.ok(codes.includes('pattern.kind /scenes/s/beats/two/pattern/kind'), codes.join('\n'));
  assert.ok(codes.includes('pattern.slot /scenes/s/pattern/slots/nope'), codes.join('\n'));
});

test('a patch is checked against the kind it inherits', () => {
  const d = doc();
  d.scenes[0].beats[1].pattern = {slots: {graph: 'd'}};
  const codes = validate(d).map((i) => i.code);
  assert.deepEqual(codes, ['pattern.slot']);
});

/** a chain in two silent beats: `x` appears for 0.5 s, then `y` on its end, `z` together with `x` plus 0.2 */
const chained = (): VisoDoc => {
  const d = doc();
  d.scenes[0].beats[0].actions = [
    {id: 'x', target: 'a', motion: 'appear', at: {beat: 'start', offset: 0.5}, dur: 0.5},
    {id: 'y', target: 'b', motion: 'appear', at: {after: 'x'}, dur: 0.4},
    {id: 'z', target: 'd', motion: 'appear', at: {after: 'x', edge: 'start', offset: 0.2}, dur: 0.3},
  ];
  d.scenes[0].beats[1].actions = [];
  return d;
};
const startOf = (c: ReturnType<typeof solve>, path: string) => c.actions.find((a) => a.path === path && a.motion !== 'disappear')!.start;

test('after: an action starts when another ends (edge end) or starts (edge start), plus offset', () => {
  const c = solve(chained(), {});
  const x = startOf(c, 'a');
  assert.equal(startOf(c, 'b'), x + 0.5);
  assert.ok(Math.abs(startOf(c, 'd') - (x + 0.2)) < 1 / 30 + 1e-9);
  assert.deepEqual(validate(chained()), []);
});

test('after: lengthening the head moves the chain, and a staggered head ends with its last target', () => {
  const d = chained();
  (d.scenes[0].beats[0].actions![0] as {dur: number}).dur = 1.2;
  assert.equal(startOf(solve(d, {}), 'b'), startOf(solve(d, {}), 'a') + 1.2);
  const s = chained();
  Object.assign(s.scenes[0].beats[0].actions![0], {target: ['a', 'c'], stagger: 0.3});
  const c = solve(s, {});
  assert.ok(Math.abs(startOf(c, 'b') - (startOf(c, 'a') + 0.3 + 0.5)) < 1 / 30 + 1e-9);
});

test('after: across beats in either direction; set and highlight end where they start', () => {
  const d = chained();
  d.scenes[0].beats[1].actions = [{id: 'late', target: 'c', motion: 'set', at: {beat: 'start'}, params: {props: {}}}];
  d.scenes[0].beats[0].actions!.push({id: 'back', target: 'a', motion: 'highlight', at: {after: 'late', offset: 0.1}});
  const c = solve(d, {});
  assert.ok(Math.abs(c.actions.find((a) => a.motion === 'highlight')!.start - (startOf(c, 'c') + 0.1)) < 1 / 30 + 1e-9);
  assert.deepEqual(validate(d), []);
});

test('validate: after names an existing action, has no cycle, no open kenBurns, no duplicate id, no reach before its head', () => {
  const codes = (mutate: (d: VisoDoc) => void) => {
    const d = chained();
    mutate(d);
    return validate(d).map((i) => i.code);
  };
  const first = (d: VisoDoc) => d.scenes[0].beats[0].actions!;
  assert.deepEqual(codes((d) => { first(d)[1].at = {after: 'nope'}; }), ['anchor.action']);
  assert.deepEqual(codes((d) => { first(d)[0].at = {after: 'y'}; }), ['anchor.cycle']);
  assert.deepEqual(codes((d) => { Object.assign(first(d)[0], {motion: 'kenBurns', dur: undefined}); }), ['anchor.after-open']);
  assert.deepEqual(codes((d) => { first(d)[2].id = 'x'; }).includes('action.id'), true);
  assert.deepEqual(codes((d) => { first(d)[2].at = {after: 'x', edge: 'start', offset: -0.1}; }), ['anchor.after-negative']);
  assert.throws(() => solve((() => { const d = chained(); first(d)[0].at = {after: 'y'}; return d; })(), {}), /cycle/);
});

/** a component `v` with props {phase: 0}: tweened to 0.5 over 1 s from 1 s, then to 1 over 1 s from 3 s, set to 0.2 at 4 s */
const tweened = (): VisoDoc => {
  const d = doc();
  d.objects.v = {type: 'component', component: 'moon', props: {phase: 0}} as never;
  d.components = [{id: 'moon', module: './moon.ts', contract: 'visotalk/timed@1'}];
  d.scenes[0].beats = [{id: 'one', duration: 6, actions: [
    {id: 'a', target: 'v', motion: 'tween', at: {beat: 'start', offset: 1}, dur: 1, easing: 'linear', params: {props: {phase: 0.5}}},
    {id: 'b', target: 'v', motion: 'tween', at: {after: 'a', offset: 1}, dur: 1, easing: 'linear', params: {props: {phase: 1}}},
    {target: 'v', motion: 'set', at: {beat: 'start', offset: 4}, params: {props: {phase: 0.2}}}]}];
  return d;
};

test('tween: a numeric prop reaches its value over dur from the value it has, and chains with set', () => {
  const c = solve(tweened(), {});
  const at = (t: number) => ({phase: 0, ...propsAt(c, 'v', t, {phase: 0})}).phase as number; // the primitive puts these over the object's own props
  const t0 = c.scenes[0].from;
  assert.equal(at(t0 + 0.5), 0, 'before the tween: the base');
  assert.ok(Math.abs(at(t0 + 1.5) - 0.25) < 0.02, 'half way');
  assert.equal(at(t0 + 2.5), 0.5, 'after the first tween, before the second');
  assert.ok(Math.abs(at(t0 + 3.5) - 0.75) < 0.02, 'the second starts from where the first ended');
  assert.equal(at(t0 + 4.5), 0.2, 'a set replaces it');
  assert.deepEqual(validate(tweened()), []);
});

test('tween: a tween interrupted by another starts from its value at that moment', () => {
  const d = tweened();
  (d.scenes[0].beats[0].actions![1] as {at: unknown}).at = {beat: 'start', offset: 1.5};
  const c = solve(d, {});
  const t0 = c.scenes[0].from;
  // at 1.5 s the first is at 0.25; the second goes from there to 1 over 1 s
  assert.ok(Math.abs((propsAt(c, 'v', t0 + 2, {phase: 0}).phase as number) - (0.25 + 0.75 * 0.5)) < 0.02);
});

test('validate: a tween needs numbers', () => {
  const d = tweened();
  (d.scenes[0].beats[0].actions![0] as {params: unknown}).params = {props: {phase: 'half'}};
  assert.deepEqual(validate(d).map((i) => i.code), ['motion.tween']);
});
