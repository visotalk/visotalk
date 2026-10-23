import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkOverlay, localize, parseMarkup, validate, type Overlay} from '../../packages/ir/src/index.ts';

const DOC = `import {Doc, Scene, Line, Part, Animation, Appear, Tween, Sound, Asset} from '@visotalk/jsx';
export default <Doc id="sky" title="Sky" lang="en" voice="af_heart" canvas="16x9" texts={{title: "Why the sky is blue"}}>
  <Asset id="bed" kind="audio" src="audio/bed.wav" license={{id: "user-owned", obligations: []}} />
  <Scene id="s1">
    <Line id="l1" text="Light is 300,000 km/s fast.">Light is three hundred thousand kilometres a second fast.</Line>
    <Line id="l2" hold={1}>Blue scatters more than red, and blue fills the sky.</Line>
    <Part id="p"><div/></Part>
    <Animation>
      <Appear on="p" line="l1" word="Light"/>
      <Tween on="p" x={1} line="l2" word="blue" nth={2}/>
    </Animation>
    <Sound asset="bed" line="l2" word="scatters"/>
  </Scene>
</Doc>;`;
const doc = parseMarkup(DOC).doc;
const fr: Overlay = {
  lang: 'fr',
  meta: {title: 'Le ciel', poster: 4},
  voice: {voice: 'minimax:French_Male'},
  fonts: {sans: '"Newsreader", serif'},
  captions: 'sidecar',
  lines: {
    l1: {text: 'La lumière va à 300 000 km/s.', say: 'La lumière va à trois cent mille kilomètres par seconde.'},
    l2: {text: 'Le bleu se diffuse plus que le rouge, et le bleu remplit le ciel.', hold: 2},
  },
  anchors: {l1: {Light: 'La lumière'}, l2: {blue: {word: 'le bleu', nth: 2}, scatters: 'se diffuse'}},
  texts: {title: 'Pourquoi le ciel est bleu'},
  assets: {bed: {src: 'audio-fr/bed.wav'}},
};

test('overlay: a complete overlay has nothing wrong with it, and the document it makes validates', () => {
  assert.deepEqual(checkOverlay(doc, fr), []);
  assert.deepEqual(validate(localize(doc, fr)).filter((i) => !i.code.startsWith('spec')), []);
});

test('overlay: the localized document has the language, the words and the files of the overlay, and nothing else changes', () => {
  const d = localize(doc, fr);
  assert.equal(d.meta.id, 'sky-fr', 'a language has its own work folder and narration');
  assert.equal(d.meta.lang, 'fr');
  assert.equal(d.meta.title, 'Le ciel');
  assert.equal(d.meta.poster, 4);
  assert.equal(d.voice?.voice, 'minimax:French_Male');
  assert.equal(d.theme?.tokens?.fonts?.sans, '"Newsreader", serif');
  assert.equal(d.exports?.captions, 'sidecar');
  assert.equal(d.texts?.title, 'Pourquoi le ciel est bleu');
  assert.equal(d.assets?.[0].src, 'audio-fr/bed.wav');
  const [l1, l2] = d.scenes[0].lines;
  assert.deepEqual(l1, {id: 'l1', text: 'La lumière va à 300 000 km/s.', say: 'La lumière va à trois cent mille kilomètres par seconde.'});
  assert.deepEqual(l2, {id: 'l2', text: 'Le bleu se diffuse plus que le rouge, et le bleu remplit le ciel.', hold: 2});
  assert.deepEqual(d.scenes[0].animations.map((a) => a.at), [{line: 'l1', word: 'La lumière'}, {line: 'l2', word: 'le bleu', nth: 2}]);
  assert.deepEqual(d.scenes[0].sounds?.[0].at, {line: 'l2', word: 'se diffuse'});
  assert.deepEqual(d.scenes[0].parts, doc.scenes[0].parts);
  assert.equal(doc.meta.id, 'sky', 'the source document is not changed');
});

test('overlay: a missing line, an untranslated anchor and names the document lacks are reported', () => {
  const bad: Overlay = {lang: 'fr', lines: {l1: {text: 'x'}, l9: {text: 'y'}}, anchors: {l1: {Light: 'x', Dark: 'y'}}, assets: {music: {src: 'm.wav'}}};
  assert.deepEqual(checkOverlay(doc, bad).map((i) => i.code).sort(),
    ['overlay.anchor.missing', 'overlay.anchor.missing', 'overlay.anchor.unknown', 'overlay.asset.unknown', 'overlay.line.missing', 'overlay.line.unknown']);
  assert.deepEqual(checkOverlay(doc, {...fr, lang: 'EN'}).map((i) => i.code), ['overlay.lang'], 'an overlay in the document\'s own language');
});

test('overlay: a phrase the new words do not contain is the validator\'s to report, on the localized document', () => {
  const wrong = {...fr, anchors: {...fr.anchors, l1: {Light: 'Le soleil'}}};
  assert.deepEqual(checkOverlay(doc, wrong), []);
  assert.ok(validate(localize(doc, wrong)).some((i) => i.code.startsWith('anchor')));
});
