import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {Compiled} from '../../packages/ir/src/index.ts';
import {captionBlocks} from '../../packages/runtime/src/caption-blocks.ts';

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
