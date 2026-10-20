import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {Compiled} from '../../packages/ir/src/index.ts';
import {captionsSrt, cut} from '../../packages/ir/src/captions.ts';

const w = (s: string) => s.split(' ');
const fixture = (lines: Array<{text: string; from: number; duration: number; words?: Array<{w: string; t0: number; t1: number}>}>) =>
  ({scenes: [{id: 's', from: 0, end: 99, lines: lines.map((l, i) => ({id: `l${i}`, say: l.text, ...l}))}]}) as unknown as Compiled;

test('captions: a line of five words or fewer is one cue; twelve words are cut 4 / 4 / 4, never 5 / 5 / 2', () => {
  assert.deepEqual(cut(w('Does that really even things out?')).map((p) => p.length), [3, 3]);
  assert.deepEqual(cut(w('one two three four five')).map((p) => p.length), [5]);
  assert.deepEqual(cut(w('a b c d e f g h i j k l')).map((p) => p.length), [3, 3, 3, 3]);
  assert.ok(cut(w('a b c d e f g h i j k l m n o p q r s t')).every((p) => p.length <= 5));
});

test('captions: a cut falls at the sentence end nearest the middle, then at a clause, before the plain middle', () => {
  assert.deepEqual(cut(w('Short nights all week, then a long lie-in on Sunday.')).map((p) => p.join(' ')), ['Short nights all week,', 'then a long lie-in on Sunday.'].flatMap((s) => cut(w(s)).map((p) => p.join(' '))));
  const two = cut(w('It is one. Then there are many more words after it'));
  assert.equal(two[0].join(' '), 'It is one.');
});

test('captions: times come from the heard words when their count matches, else from each cue\'s share of the line', () => {
  const aligned = captionsSrt(fixture([{text: 'Hello there, my friend. Welcome back to the show', from: 10, duration: 5, words: [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({w: 'x', t0: i * 0.5, t1: i * 0.5 + 0.4}))}]));
  assert.match(aligned, /^1\n00:00:10,000 --> 00:00:11,900\nHello there, my friend\./);
  const proportional = captionsSrt(fixture([{text: 'Short nights all week, then a long lie-in on Sunday.', from: 1, duration: 4}]));
  const cues = proportional.trim().split('\n\n');
  assert.equal(cues.length, 3);
  assert.match(cues[0], /^1\n00:00:01,000 --> /);
  assert.match(cues[cues.length - 1], /--> 00:00:05,000\n/);
});
