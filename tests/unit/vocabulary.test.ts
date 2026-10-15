import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// @ts-expect-error plain .mjs script without declarations
import {buildVocabulary} from '../../scripts/generate-vocabulary.mjs';

test('packages/ir/src/vocabulary.json matches the spec and the patterns (run `pnpm vocabulary`)', () => {
  const committed = JSON.parse(readFileSync(new URL('../../packages/ir/src/vocabulary.json', import.meta.url), 'utf8'));
  assert.deepEqual(JSON.parse(JSON.stringify(buildVocabulary())), committed);
});
