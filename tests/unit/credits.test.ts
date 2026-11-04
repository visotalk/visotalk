/** credits.md: a credit is a line a reader sees, so assets cut from one source under one licence are credited once. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {creditsMarkdown} from '../../packages/ir/src/credits.ts';
import type {VisoDoc} from '../../packages/ir/src/spec.ts';

const cut = (id: string) => ({id, kind: 'audio', src: `media/${id}.mp3`, source: 'https://example.org/chalk.ogg', license: {id: 'CC0-1.0', attribution: 'A. Recordist'}});

test('three cuts of one recording are one credit; a different source is its own', () => {
  const doc = {meta: {title: 'T'}, assets: [cut('a'), cut('b'), cut('c'), {...cut('d'), source: 'https://example.org/other.ogg'}]} as unknown as VisoDoc;
  const lines = creditsMarkdown(doc).split('\n').filter((l) => l.startsWith('- '));
  assert.deepEqual(lines, ['- A. Recordist · CC0-1.0 · https://example.org/chalk.ogg', '- A. Recordist · CC0-1.0 · https://example.org/other.ogg']);
});

test('a player that embeds the stroke-order data credits it, with its copyright holder and licence file; one that does not, does not', () => {
  const doc = {meta: {title: 'T'}, assets: []} as unknown as VisoDoc;
  assert.match(creditsMarkdown(doc, {strokes: true}), /## Data\n\n- Chinese stroke order: Make Me a Hanzi \(hanzi-writer-data 2\.0\.1\), from fonts © 1999 Arphic Technology Co\., Ltd\. · Arphic Public License \(ARPHICPL\.txt\)/);
  assert.doesNotMatch(creditsMarkdown(doc), /## Data/);
});
