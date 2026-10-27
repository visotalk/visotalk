import {test} from 'node:test';
import assert from 'node:assert/strict';
import {easeAt, easingFn, parseColor, parseMarkup, propAt, solve, validate, type VisoDoc, type VoiceManifest} from '../../packages/ir/src/index.ts';

const doc = (anim: string): VisoDoc => parseMarkup(`export default <Doc id="d" title="t" lang="en"><Scene id="a"><Line id="l1">One two three.</Line><Part id="p"/><Animation><Appear target="p" at="start"/>${anim}</Animation></Scene></Doc>;`).doc;
const voice = (d: VisoDoc): VoiceManifest => Object.fromEntries(d.scenes.flatMap((s) => s.lines).map((l) => [l.id, {duration: 4, audio: `${l.id}.wav`}]));
const at = (d: VisoDoc, name: string, t: number, base?: number | string | boolean) => propAt(solve(d, voice(d), 30), 'p', name, t, base);
const near = (a: unknown, b: number, eps = 1e-6) => assert.ok(typeof a === 'number' && Math.abs(a - b) < eps, `${a} is not ${b}`);

test('easings: the families of easings.net, back overshoots, and a CSS cubic-bezier', () => {
  for (const e of ['easeInSine', 'easeOutQuad', 'easeInOutQuart', 'easeOutQuint', 'easeInBack', 'easeOutBack', 'easeInOutBack', 'easeOutBack(2.2)', 'easeIn', 'cubic-bezier(0.25, 0.1, 0.25, 1)', 'linear']) {
    const f = easingFn(e)!;
    assert.ok(f, e);
    near(f(0), 0, 1e-6); near(f(1), 1, 1e-6);
  }
  near(easeAt('easeOutQuart', 0.5), 1 - 0.5 ** 4);
  near(easeAt('easeInOutSine', 0.5), 0.5);
  assert.ok(easeAt('easeOutBack', 0.7) > 1, 'back out goes past the end');
  assert.ok(easeAt('easeOutBack(2.2)', 0.7) > easeAt('easeOutBack', 0.7), 'a larger overshoot goes further');
  near(easeAt('cubic-bezier(0, 0, 1, 1)', 0.3), 0.3, 1e-4);
  assert.equal(easingFn('easeOutBounce'), undefined);
  assert.equal(easingFn('easeInSine(2)'), undefined, 'only Back takes a number');
});

test('validator: an unknown easing, repeat on a non-tween, and tween values that cannot be moved', () => {
  const codes = (anim: string) => validate(doc(anim)).map((i) => i.code);
  assert.deepEqual(codes('<Tween target="p" to={{w: 1}} at="start" easing="easeOutQuart"/>'), []);
  assert.deepEqual(codes('<Tween target="p" to={{w: 1}} at="start" easing="bouncy"/>'), ['motion.easing']);
  assert.deepEqual(codes('<Appear target="p" at="start" repeat={2}/>'), ['motion.repeat']);
  assert.deepEqual(codes('<Tween target="p" to={{w: 1}} at="start" repeat={1.5}/>'), ['motion.repeat']);
  assert.deepEqual(codes('<Tween target="p" to={{w: 1}} at="start" repeat={-1} yoyo/>'), []);
  assert.throws(() => doc('<Tween target="p" to={{w: "wide"}} at="start"/>'), /a number, a colour or a length/);
});

test('tween: repeat plays again, yoyo comes back, and a repeat forever keeps going', () => {
  const lin = (extra: string) => doc(`<Tween target="p" to={{x: 10}} at="start" dur={2} easing="linear" ${extra}/>`);
  near(at(lin(''), 'x', 1, 0), 5);
  near(at(lin('repeat={1}'), 'x', 3, 0), 5, 1e-6);            // second play: 0 again at 2 s, half way at 3 s
  near(at(lin('repeat={1}'), 'x', 5, 0), 10);                  // over: where a play ends
  near(at(lin('repeat={1} yoyo'), 'x', 3, 0), 5);              // second play runs back: 10 at 2 s, 5 at 3 s
  near(at(lin('repeat={1} yoyo'), 'x', 5, 0), 0);              // two plays of a yoyo: home again
  near(at(lin('repeat={2} yoyo'), 'x', 7, 0), 10);             // three plays: ends at the far side
  near(at(lin('repeat={-1} yoyo'), 'x', 4.5, 0), 2.5);         // forever: 0 at 4 s, 2.5 at 4.5 s
});

test('tween: colours blend in sRGB, lengths of one unit, and a later tween starts from where an earlier one is', () => {
  const d = doc('<Tween target="p" to={{fill: "#000000"}} at="start" dur={2} easing="linear"/><Tween target="p" to={{fill: "#ffffff"}} at="start" offset={2} dur={2} easing="linear"/><Tween target="p" to={{w: "0px"}} at="start" dur={2} easing="linear"/>');
  assert.equal(at(d, 'fill', 1, '#ffffff'), 'rgba(128, 128, 128, 1)');
  assert.equal(at(d, 'fill', 3, '#ffffff'), 'rgba(128, 128, 128, 1)', 'back towards white from black: grey half way');
  assert.equal(at(d, 'fill', 5, '#ffffff'), '#ffffff');
  assert.equal(at(doc('<Tween target="p" to={{w: "100px"}} at="start" dur={2} easing="linear"/>'), 'w', 1, '0px'), '50px');
  assert.equal(at(doc('<Tween target="p" to={{w: "100px"}} at="start" dur={2} easing="linear"/>'), 'w', 1, '0%'), '100px', 'different units cannot blend: it jumps');
  assert.deepEqual(parseColor('hsl(212 46% 68%)')!.slice(0, 3).map(Math.round), [136, 171, 211]);
  assert.deepEqual(parseColor('hsla(0, 100%, 50%, .5)')!.map((x) => +x.toFixed(2)), [255, 0, 0, 0.5]);
  assert.deepEqual(parseColor('#f80')!.slice(0, 3), [255, 136, 0]);
  assert.equal(parseColor('blue'), undefined);
});

test('solver: an action after a repeated tween waits for every play', () => {
  const d = doc('<Tween id="t" target="p" to={{x: 1}} at="start" dur={1} repeat={2}/><Set target="p" to={{y: 1}} after="t"/>');
  const c = solve(d, voice(d), 30);
  assert.equal(c.actions.find((a) => a.motion === 'set')!.start, c.scenes[0].from + 3);
});
