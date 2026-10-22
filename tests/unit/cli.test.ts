import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
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
    assert.match(r.stderr, /usage: visotalk <doctor\|init\|validate/);
  }
});

test('schema lists the tags, the motions and the hooks a part calls, and refuses another topic', () => {
  const all = cli('schema');
  assert.equal(all.status, 0);
  for (const word of ['Scene ', 'Appear ', 'where it starts', 'useTarget(id)', 'useProp(name, base)', 'useProp(id, name, base)', 'random(key)']) assert.match(all.stdout, new RegExp(word.replace(/[()]/g, '\\$&')));
  assert.doesNotMatch(all.stdout, /Beat|pattern|PartRef/);
  assert.match(cli('schema', 'hooks').stdout, /^hooks:/);
  assert.deepEqual(Object.keys(JSON.parse(cli('schema', '--json').stdout)), ['tags', 'motions', 'hooks']);
  const bad = cli('schema', 'objects');
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /unknown topic "objects"; one of: tags motions hooks/);
});


test('a relative --out of still lands in the document\'s work folder, not in the directory the command runs in', {skip: !process.env.VISOTALK_CHROME}, () => {
  const dir = mkdtempSync(join(tmpdir(), 'vt-out-'));
  writeFileSync(join(dir, 'doc.tsx'), `import {Doc, Scene, Line} from '@visotalk/jsx';
export default <Doc id="out-test" title="t" lang="en" canvas="16x9"><Scene id="s"><Line id="l">One two three.</Line></Scene></Doc>;`);
  const r = cli('still', join(dir, 'doc.tsx'), '--time', '1', '--out', 'look.png');
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(join(dir, '.visotalk', 'out-test', 'look.png')), 'next to the document\'s work files');
  assert.ok(!existsSync('look.png'), 'not in the working directory');
});
