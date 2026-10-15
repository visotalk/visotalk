import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {test} from 'node:test';

const cli = (...args: string[]) => spawnSync(process.execPath, ['--experimental-strip-types', 'packages/cli/src/main.ts', ...args], {encoding: 'utf8'});

test('a command the CLI does not know is refused, not read as a document path', () => {
  const r = cli('dcotor', '--fix');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /unknown command "dcotor"; one of: doctor /);
  assert.doesNotMatch(r.stderr, /ENOENT/);
});

test('--help and no arguments print the usage', () => {
  for (const args of [[], ['--help']]) {
    const r = cli(...args);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /usage: visotalk <doctor\|validate/);
  }
});
