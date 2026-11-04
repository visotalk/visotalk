/** Chinese stroke order on demand: only a document whose code reads it asks, only for its own characters, each fetched once and kept, and a failure never fails the build. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ARPHIC_LICENCE, STROKES_GLOBAL, hanziOf, installAllStrokes, strokesFor, strokesScript, strokesWarning, wantsStrokes} from '../../packages/cli/src/strokes.ts';

const XIE = '\u659c', LV = '\u7387', NONE = '\u3400';

/** A stand-in for the CDN that counts what it is asked for: a character it knows, one it does not (404), and one that times out */
function cdn(known: Record<string, number[][][]>, down: string[] = []) {
  const asked: string[] = [];
  const get = (async (url: string | URL | Request) => {
    const ch = decodeURIComponent(String(url).split('/').pop()!.replace(/\.json$/, ''));
    asked.push(ch);
    if (down.includes(ch)) throw new Error('timeout');
    if (!known[ch]) return new Response('', {status: 404});
    return new Response(JSON.stringify({strokes: ['M 0 0 Z'], medians: known[ch]}), {status: 200});
  }) as typeof fetch;
  return {get, asked};
}

test('a build asks only when the document\'s code names the global, and only for Han characters, each once', () => {
  assert.equal(wantsStrokes(`const s = (globalThis as any).${STROKES_GLOBAL}?.[ch];`), true);
  assert.equal(wantsStrokes('no chalk hand here'), false);
  assert.deepEqual(hanziOf(`${XIE}${LV} = rise / run, ${XIE}，。 0.5`), [XIE, LV]);
  const part = `export const meta = {\n  name: {en: 'Wipe', 'zh-CN': '\u64e6'},\n};\nexport function Wipe() { return '${LV}'; }`;
  assert.deepEqual(hanziOf(part), [LV], 'a component\'s name in its meta is not drawn, so it is not fetched');
});

test('characters are fetched once and kept: a second build asks the network for nothing', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'strokes-')), c = cdn({[XIE]: [[[10.4, 20.6], [30, 40]]]});
  const first = await strokesFor([XIE], {dir, fetch: c.get});
  assert.deepEqual(first.strokes[XIE], [[[10, 21], [30, 40]]], 'medians kept, rounded to whole units');
  const again = await strokesFor([XIE], {dir, fetch: c.get});
  assert.deepEqual(again.strokes[XIE], first.strokes[XIE]);
  assert.deepEqual(c.asked, [XIE], 'the second build read the cache');
});

test('a character the data lacks is remembered as missing; one that could not be fetched is tried again and never cached', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'strokes-')), c = cdn({[XIE]: [[[0, 0], [1, 1]]]}, [LV]);
  const r = await strokesFor([XIE, NONE, LV], {dir, fetch: c.get});
  assert.deepEqual(Object.keys(r.strokes), [XIE]);
  assert.deepEqual(r.missing, [NONE]);
  assert.deepEqual(r.failed, [LV]);
  assert.equal(readFileSync(join(dir, `${NONE.codePointAt(0)!.toString(16)}.json`), 'utf8'), 'null');
  assert.equal(existsSync(join(dir, `${LV.codePointAt(0)!.toString(16)}.json`)), false);
  const later = await strokesFor([NONE, LV], {dir, fetch: c.get});
  assert.deepEqual(c.asked.filter((ch) => ch === NONE), [NONE], 'a missing character is not asked for twice');
  assert.deepEqual(c.asked.filter((ch) => ch === LV), [LV, LV], 'a failed one is');
  assert.match(strokesWarning(later)!, /could not be fetched now.*have no stroke data.*drawn whole/);
  assert.equal(strokesWarning({missing: [], failed: []}), undefined);
});

test('the licence text that goes beside an embedding build is the Arphic Public License, and it ships with the CLI', () => {
  assert.match(readFileSync(ARPHIC_LICENCE, 'utf8'), /^ARPHIC PUBLIC LICENSE/);
});

const fileOf = (dir: string, ch: string) => join(dir, `${ch.codePointAt(0)!.toString(16)}.json`);

test('the map is in the document\'s order whatever order the fetches finish in, so a cold and a warm build embed the same bytes', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'strokes-')), m = [[[0, 0], [9, 9]]];
  const slow = (async (url: string | URL | Request) => {
    const ch = decodeURIComponent(String(url).split('/').pop()!.replace(/\.json$/, ''));
    await new Promise((r) => setTimeout(r, ch === XIE ? 30 : 0));
    return new Response(JSON.stringify({medians: m}), {status: 200});
  }) as typeof fetch;
  const cold = await strokesFor([XIE, LV], {dir, fetch: slow}), warm = await strokesFor([XIE, LV], {dir, fetch: slow});
  assert.equal(JSON.stringify(cold.strokes), JSON.stringify(warm.strokes));
  assert.deepEqual(Object.keys(cold.strokes), [XIE, LV]);
});

test('a damaged cache file, or one that is not strokes, is fetched again instead of failing the build or the player', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'strokes-')), c = cdn({[XIE]: [[[1, 1], [2, 2]]], [LV]: [[[3, 3], [4, 4]]]});
  writeFileSync(fileOf(dir, XIE), '[[[1, 1], [2');
  writeFileSync(fileOf(dir, LV), '{}');
  const r = await strokesFor([XIE, LV], {dir, fetch: c.get});
  assert.deepEqual(r.strokes, {[XIE]: [[[1, 1], [2, 2]]], [LV]: [[[3, 3], [4, 4]]]});
  assert.deepEqual(c.asked, [XIE, LV]);
  const bad = (async () => new Response(JSON.stringify({medians: [['x']]}), {status: 200})) as typeof fetch;
  assert.deepEqual((await strokesFor([NONE], {dir: mkdtempSync(join(tmpdir(), 'strokes-')), fetch: bad})).failed, [NONE], 'a response that is not strokes is never embedded');
});

test('after a full install a character with no file is missing and nothing is fetched; a tarball that fails its integrity is refused', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'strokes-')), c = cdn({[XIE]: [[[0, 0], [1, 1]]]});
  writeFileSync(join(dir, 'complete'), 'test');
  const r = await strokesFor([XIE], {dir, fetch: c.get});
  assert.deepEqual([r.missing, c.asked], [[XIE], []]);
  const tampered = (async () => new Response(new Uint8Array([1, 2, 3]), {status: 200})) as typeof fetch;
  await assert.rejects(installAllStrokes(mkdtempSync(join(tmpdir(), 'strokes-')), tampered), /does not match its pinned integrity/);
});

test('the player\'s copy is a script of its own whose header says where the data comes from, how it was changed and under what licence', () => {
  const js = strokesScript({[XIE]: [[[1, 2], [3, 4]]]});
  assert.match(js, /^\/\*! Chinese stroke order/);
  assert.match(js, /Make Me a Hanzi.*hanzi-writer-data 2\.0\.1.*Arphic Technology/s);
  assert.match(js, /Changed by visotalk build.*outlines are dropped.*rounded/s);
  assert.match(js, /ARPHICPL\.txt beside this file/);
  const scope: Record<string, unknown> = {};
  new Function('globalThis', js)(scope);
  assert.deepEqual(scope[STROKES_GLOBAL], {[XIE]: [[[1, 2], [3, 4]]]});
});
