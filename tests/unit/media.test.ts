import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assetsNamedIn, mediaHints, mediaPlan, parseMarkup, solve, type VisoDoc, type VoiceManifest} from '../../packages/ir/src/index.ts';

const LIC = `license={{id: "user-owned", obligations: []}}`;
const SRC = `export default <Doc id="d" title="t" lang="en">
  <Asset id="a" kind="image" src="assets/a.jpg" ${LIC}/>
  <Asset id="b" kind="image" src="assets/b.jpg" ${LIC}/>
  <Asset id="c" kind="image" src="assets/c.jpg" ${LIC}/>
  <Asset id="never" kind="image" src="assets/never.jpg" ${LIC}/>
  <Asset id="tick" kind="audio" src="assets/tick.wav" ${LIC}/>
  <Part id="logo" x={0} y={0} w={100} h={100}>{() => <img src={useAsset("b")} />}</Part>
  <Scene id="s1"><Line id="l1">One two three.</Line><Line id="l2">Four five six.</Line>
    <Part id="pa" x={0} y={0} w={100} h={100}>{() => <img src={useAsset("a")} />}</Part>
    <Part id="pn" x={0} y={0} w={100} h={100}>{() => <img src={useAsset("never")} />}</Part>
    <Sound asset="tick" line="l2" word="five" volume={-3}/>
    <Animation><Appear on="pa" line="l2"/><Appear on="logo" at="start"/></Animation></Scene>
  <Scene id="s2"><Line id="l3">Seven.</Line>
    <Part id="pc" x={0} y={0} w={100} h={100}>{() => <img src={useAsset(key)} />}</Part>
    <Animation><Appear on="pc" at="start"/><Disappear on="logo" at="start"/></Animation></Scene>
</Doc>;`;
const parsed = parseMarkup(SRC);
const built = (prelude = ''): VisoDoc => {
  const doc = structuredClone(parsed.doc);
  doc['x-media'] = mediaHints(parsed.doc, prelude, {a: 1000, tick: 50});
  for (const part of [...(doc.parts ?? []), ...doc.scenes.flatMap((s) => s.parts)]) delete part.body;
  return doc;
};
const voice = (d: VisoDoc): VoiceManifest => Object.fromEntries(d.scenes.flatMap((s) => s.lines).map((l) => [l.id, {duration: 2, audio: `audio/${l.id}.m4a`}]));

test('assetsNamedIn: an asset is named by a string literal, in any quote, and nothing else is', () => {
  const ids = new Set(['a', 'b']);
  assert.deepEqual([...assetsNamedIn(`useAsset("a"); <Video asset='b'/>; const x = "ab"; f(\`a\`)`, ids)].sort(), ['a', 'b']);
  assert.deepEqual([...assetsNamedIn(`useAsset(key); const a = 1;`, ids)], []);
});

test('mediaHints: the parts that name an asset, none for an asset the prelude names, and the sizes', () => {
  const h = mediaHints(parsed.doc, '', {a: 1000});
  assert.deepEqual(h.uses!.a, [{part: 'pa', scene: 's1'}]);
  assert.deepEqual(h.uses!.b, [{part: 'logo'}], 'a global part has no scene');
  assert.equal(h.uses!.c, undefined, 'an id that is not a literal is not found');
  assert.deepEqual(h.sizes, {a: 1000});
  assert.equal(mediaHints(parsed.doc, 'const logo = "b";', {}).uses!.b, undefined, 'named in the module: any part may show it');
});

test('mediaPlan: each file with the stretches it is heard or seen in, critical ones flagged, in the order they are first needed', () => {
  const d = built();
  const c = solve(d, voice(d), 30);
  const plan = mediaPlan(d, c);
  const by = (src: string) => plan.find((i) => i.src === src)!;
  const [s1, s2] = c.scenes;
  // narration: one clip per line, in its line
  assert.deepEqual(plan.filter((i) => i.kind === 'narration').map((i) => i.src), ['audio/l1.m4a', 'audio/l2.m4a', 'audio/l3.m4a']);
  assert.deepEqual(by('audio/l2.m4a').windows, [[s1.lines[1].from, s1.lines[1].from + s1.lines[1].duration]]);
  assert.ok(by('audio/l2.m4a').critical);
  // a sound is not critical, runs from its start to the end of its file (unknown here: the film), and carries its size
  assert.deepEqual([by('assets/tick.wav').kind, by('assets/tick.wav').critical, by('assets/tick.wav').bytes], ['sound', false, 50]);
  assert.equal(by('assets/tick.wav').windows[0][0], c.sounds[0].start);
  // a picture of a scene part: from the part's first appearance to the end of its scene, not before it
  const a = by('assets/a.jpg');
  assert.ok(a.critical && a.bytes === 1000);
  assert.ok(Math.abs(a.windows[0][0] - c.actions.find((x) => x.on === 'pa')!.start) < 0.26 && a.windows[0][1] === s1.end, JSON.stringify(a.windows));
  // a picture of a global part: while the part is on screen, across scenes (appears at the start, disappears at the start of scene 2)
  const b = by('assets/b.jpg');
  assert.equal(b.windows.length, 1);
  assert.ok(b.windows[0][0] === 0 && Math.abs(b.windows[0][1] - s2.from) < 0.8, JSON.stringify(b.windows));
  // an asset no part is known to show may be shown at any time; one whose part never appears asks for nothing
  assert.deepEqual(by('assets/c.jpg').windows, [[0, c.duration]]);
  assert.equal(plan.find((i) => i.src === 'assets/never.jpg'), undefined);
  assert.deepEqual(plan.map((i) => i.windows[0][0]), [...plan.map((i) => i.windows[0][0])].sort((x, y) => x - y));
});

test('mediaPlan: a page with a soundtrack plays one file in place of the clips and the sounds', () => {
  const d = built();
  const c = solve(d, voice(d), 30);
  const plan = mediaPlan(d, c, {mix: 'soundtrack.mp3'});
  assert.deepEqual(plan.filter((i) => i.kind !== 'image').map((i) => [i.src, i.kind, i.critical]), [['soundtrack.mp3', 'soundtrack', true]]);
  assert.deepEqual(plan[0].windows, [[0, c.duration]]);
});
