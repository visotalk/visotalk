import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {Compiled} from '../../packages/ir/src/index.ts';
import {captionBlocks, captionWords} from '../../packages/ir/src/caption-blocks.ts';

const film = (scenes: Array<Array<{text: string; from: number; duration: number}>>) =>
  ({scenes: scenes.map((lines, s) => ({id: `s${s}`, from: 0, end: 99, lines: lines.map((l, i) => ({id: `s${s}l${i}`, say: l.text, ...l}))}))}) as unknown as Compiled;

test('caption blocks: words come from the line\'s letters when nothing was aligned, in order, and a short film is one block', () => {
  const [b, ...rest] = captionBlocks(film([[{text: 'Short nights, then a long lie-in.', from: 2, duration: 4}]]));
  assert.equal(rest.length, 0);
  assert.deepEqual(b.words.map((w) => w.w), ['Short', 'nights,', 'then', 'a', 'long', 'lie-in.']);
  assert.equal(b.words[0].t0, 2);
  assert.ok(b.words.every((w, i) => i === 0 || w.t0 >= b.words[i - 1].t0));
  assert.ok(b.to >= 6);
});

test('caption blocks: a scene change, a full block and a pause after enough text each start a new block', () => {
  assert.equal(captionBlocks(film([[{text: 'One scene.', from: 0, duration: 1}], [{text: 'Another scene.', from: 1, duration: 1}]])).length, 2);
  const long = 'word '.repeat(60).trim();
  const full = captionBlocks(film([[{text: long, from: 0, duration: 20}]]), 96);
  assert.ok(full.length >= 3 && full.every((b) => b.words.map((w) => w.w).join(' ').length <= 96));
  const paused = captionBlocks(film([[{text: 'A fairly long sentence goes first here.', from: 0, duration: 2}, {text: 'And the next one.', from: 4, duration: 1}]]));
  assert.equal(paused.length, 2);
});

test('caption blocks: heard word times are used when their count matches the words', () => {
  const c = {scenes: [{id: 's', from: 0, end: 9, lines: [{id: 'l', say: 'a b c', text: 'a b c', from: 10, duration: 3, words: [{w: 'a', t0: 0, t1: 0.2}, {w: 'b', t0: 1, t1: 1.2}, {w: 'c', t0: 2.5, t1: 2.9}]}]}]} as unknown as Compiled;
  assert.deepEqual(captionBlocks(c)[0].words.map((w) => w.t0), [10, 11, 12.5]);
});

// CJK text is built from code points: the language lint keeps this file English
const cp = (...codes: number[]) => String.fromCodePoint(...codes);
const [TIAN, KONG, SHI, LAN, DE, COMMA, YIN, WEI, GUANG, BEI, SAN, SHE, LE, STOP, ZAI, JIAN] =
  [0x5929, 0x7a7a, 0x662f, 0x84dd, 0x7684, 0xff0c, 0x56e0, 0x4e3a, 0x5149, 0x88ab, 0x6563, 0x5c04, 0x4e86, 0x3002, 0x518d, 0x89c1].map((c) => cp(c));

test('caption blocks: a language written without spaces is one character a word, punctuation stays with its character, and a block holds about half as many', () => {
  const text = [TIAN, KONG, SHI, LAN, DE, COMMA, YIN, WEI, GUANG, BEI, SAN, SHE, LE, STOP].join('');
  assert.deepEqual(captionWords(text).map((w) => w.w), [TIAN, KONG, SHI, LAN, DE + COMMA, YIN, WEI, GUANG, BEI, SAN, SHE, LE + STOP]);
  assert.ok(captionWords(text).every((w) => w.cjk));
  assert.deepEqual(captionWords(`Use the API, then ${ZAI}${JIAN}.`).map((w) => w.w), ['Use', 'the', 'API,', 'then', ZAI, `${JIAN}.`], 'Latin words stay whole; a full stop after a character stays with it');
  // English is unchanged: whitespace words, even a lone dash
  assert.deepEqual(captionWords('So — what?').map((w) => w.w), ['So', '—', 'what?']);
  // 60 characters at 4.4 a second: more than one block, none past the limit in letters (2.2 each)
  const blocks = captionBlocks(film([[{text: TIAN.repeat(60), from: 0, duration: 14}]]));
  assert.ok(blocks.length >= 2);
  assert.ok(blocks.every((b) => b.words.length * 2.2 <= 96 + 2.2));
  assert.ok(blocks[0].words[0].cjk);
  // each character appears on its share of the line
  const [b] = captionBlocks(film([[{text: [TIAN, KONG, SHI, LAN].join(''), from: 0, duration: 4}]]));
  assert.deepEqual(b.words.map((w) => w.t0), [0, 1, 2, 3]);
});

test('caption blocks: the characters of one word share a unit, so a line can be kept whole', () => {
  // sky (two characters, one word), is, blue (one word): the segmenter of the platform decides, these are plain words in any ICU
  const words = captionWords([0x5929, 0x7a7a, 0x662f, 0x84dd, 0x8272].map((c) => cp(c)).join(''));
  assert.equal(words[0].unit, words[1].unit, 'the two characters of the first word');
  assert.notEqual(words[1].unit, words[2].unit, 'and not the next word');
  assert.equal(captionWords('plain English words')[0].unit, undefined, 'a spaced language has no units');
});

test('caption blocks: a one-character word keeps the word after it, so a compound the dictionary cuts is not split across lines', () => {
  // blue light, sky: the dictionary cuts the first into blue | light, which would let a line end between them
  const words = captionWords([0x84dd, 0x5149, 0xff0c, 0x5929, 0x7a7a].map((c) => cp(c)).join(''));
  assert.equal(words[0].unit, words[1].unit, 'blue and light are one unit');
  assert.notEqual(words[1].unit, words[2].unit, 'and the comma ends it');
});

test('caption blocks: Korean is spaced, so its words are whitespace words timed by the heard words, each syllable as wide as a character', () => {
  const [A, N, H, S, Y] = [0xc548, 0xb155, 0xd558, 0xc138, 0xc694].map((c) => cp(c));
  const hello = `${A}${N} ${H}${S}${Y}.`;
  assert.deepEqual(captionWords(hello).map((w) => [w.w, w.cjk]), [[`${A}${N}`, false], [`${H}${S}${Y}.`, false]]);
  const c = {scenes: [{id: 's', from: 0, end: 9, lines: [{id: 'l', say: hello, text: hello, from: 10, duration: 3, words: [{w: `${A}${N}`, t0: 0, t1: 0.8}, {w: `${H}${S}${Y}`, t0: 1.5, t1: 2.8}]}]}]} as unknown as Compiled;
  assert.deepEqual(captionBlocks(c)[0].words.map((w) => w.t0), [10, 11.5]);
  // thirty three-syllable words: a block holds about half as many as Latin words of that length, not all of them
  const long = Array.from({length: 30}, () => `${H}${S}${Y}`).join(' ');
  const blocks = captionBlocks(film([[{text: long, from: 0, duration: 30}]]), 96);
  assert.ok(blocks.length >= 2 && blocks.every((b) => b.words.length * (3 * 2.2 + 1) <= 96 + 7.6));
});
