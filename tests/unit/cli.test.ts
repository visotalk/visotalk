import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
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


test('still refuses what it is asked for before it speaks or builds anything', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vt-still-args-'));
  try {
    const file = join(dir, 'doc.tsx');
    writeFileSync(file, "import {Doc, Scene, Line} from '@visotalk/jsx';\n" + 'export default <Doc id="d" title="t" lang="en" voice="am_adam"><Scene id="s"><Line id="l1">One.</Line><Line id="l2">Two.</Line></Scene></Doc>;');
    const run = (...args: string[]) => spawnSync(process.execPath, ['--experimental-strip-types', 'packages/cli/src/main.ts', 'still', file, ...args], {encoding: 'utf8', env: {...process.env, KOKORO_DIR: '', VISOTALK_HOME: dir}});
    for (const [args, said] of [
      [['--at', '2.5'], /--at is how far through the line, 0 to 1 \(got 2\.5\); a moment after the words \(the pause or hold\) is --time SECONDS/],
      [['--time', '1,-2'], /--time is seconds from the start, or several separated by commas \(got 1,-2\)/],
      [['--time', 'soon'], /--time is seconds from the start/],
      [[], /still needs --line SCENE\/LINE\[,SCENE\/LINE…\] or --time SECONDS\[,SECONDS…\]; the lines are: s\/l1, s\/l2/],
    ] as const) {
      const r = run(...args);
      assert.equal(r.status, 1, r.stderr);
      assert.match(r.stderr, said);
      assert.equal(existsSync(join(dir, '.visotalk', 'd', 'dist')), false, 'nothing was built');
      assert.equal(existsSync(join(dir, '.visotalk', 'd', 'voice.json')), false, 'nothing was timed');
    }
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
});

test('prepare and build reject CJK Kokoro with lang=en before reusing voice.json', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vt-cjk-cli-'));
  try {
    const file = join(dir, 'doc.tsx');
    const work = join(dir, '.visotalk', 'd');
    mkdirSync(work, {recursive: true});
    writeFileSync(file, "import {Doc, Scene, Line} from '@visotalk/jsx';\n" + 'export default <Doc id="d" title="t" lang="en" voice="am_adam"><Scene id="s"><Line id="l1">\u4e2d\u6587</Line><Line id="l2">A newly added line.</Line></Scene></Doc>;');
    writeFileSync(join(work, 'voice.json'), '{"l1":{"duration":1}}');
    for (const command of ['prepare', 'build']) {
      const r = spawnSync(process.execPath, ['--experimental-strip-types', 'packages/cli/src/main.ts', command, file], {encoding: 'utf8', env: {...process.env, KOKORO_DIR: '', VISOTALK_HOME: dir}});
      assert.equal(r.status, 1, r.stderr);
      assert.match(r.stderr, /line "l1" with voice "am_adam": Kokoro is English only/);
      assert.match(r.stderr, /correct lang and a real provider voice ID/);
      assert.equal(readFileSync(join(work, 'voice.json'), 'utf8'), '{"l1":{"duration":1}}');
      assert.equal(existsSync(join(work, 'dist')), false);
    }
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
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
