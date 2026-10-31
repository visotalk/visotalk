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

test('the usage names every command the CLI accepts', () => {
  const commands = cli('nosuchcommand').stderr.match(/one of: (.+)/)![1].trim().split(' ');
  const usage = cli('--help').stderr;
  for (const c of commands) assert.match(usage, new RegExp(`[<|\\s]${c}[|>\\s]`), `usage does not name "${c}"`);
});

test('schema lists the tags, the motions, the hooks a part calls and the theme tokens\' values, and refuses another topic', () => {
  const all = cli('schema');
  assert.equal(all.status, 0);
  for (const word of ['Scene ', 'Appear ', 'where it starts', 'useTarget(id)', 'useProp(name, base)', 'useProp(id, name, base)', 'random(key)']) assert.match(all.stdout, new RegExp(word.replace(/[()]/g, '\\$&')));
  assert.doesNotMatch(all.stdout, /Beat|pattern|PartRef/);
  assert.match(cli('schema', 'hooks').stdout, /^hooks:/);
  assert.match(cli('schema', 'themes').stdout, /visotalk\/dark\s+--vt-bg #0B0E14 .*--vt-data #6CB6FF/);
  assert.deepEqual(Object.keys(JSON.parse(cli('schema', '--json').stdout)), ['tags', 'motions', 'hooks', 'themes']);
  const bad = cli('schema', 'objects');
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /unknown topic "objects"; one of: tags motions hooks themes/);
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

test('build opens the page it made in Chrome, presses Play and says that it plays, so nobody has to check it in a browser again', {skip: !process.env.VISOTALK_CHROME}, () => {
  const dir = mkdtempSync(join(tmpdir(), 'vt-build-'));
  writeFileSync(join(dir, 'doc.tsx'), `import {Doc, Scene, Part, Animation, Appear} from '@visotalk/jsx';
export default <Doc id="build-check" title="t" lang="en" canvas="16x9"><Scene id="s" duration={4}>
  <Part id="dot" x={800} y={400} w={200} h={200}><div style={{width: 200, height: 200, borderRadius: 100, background: 'var(--vt-data)'}} /></Part>
  <Animation><Appear target="dot" at="start" /></Animation></Scene></Doc>;`);
  const r = cli('build', join(dir, 'doc.tsx'), '--out', join(dir, 'out'));
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /checked in Chrome from file:\/\/: Play \(#vt-start, or Space\) started it and the film ran/);
  assert.match(r.stdout, /nothing is loaded from outside the folder/);
  assert.match(r.stdout, /Deliver it as it is/);
});

test('a film on the theme\'s default ground and faces, with no style, is warned about; the example\'s own look is not', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vt-look-'));
  try {
    for (const f of ['doc.tsx', 'parts/kit.tsx', 'parts/count.tsx', 'parts/orbit.tsx']) {
      mkdirSync(join(dir, 'parts'), {recursive: true});
      writeFileSync(join(dir, f), readFileSync(join('skills/visotalk/example', f), 'utf8'));
    }
    assert.doesNotMatch(cli('validate', join(dir, 'doc.tsx')).stderr, /look\.default/);
    writeFileSync(join(dir, 'doc.tsx'), readFileSync(join(dir, 'doc.tsx'), 'utf8').replace(/\n\s*tokens=\{\{[^\n]*\}\}\}/, ''));
    const r = cli('validate', join(dir, 'doc.tsx'));
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /^look\.default: /m);
    mkdirSync(join(dir, 'style'));
    assert.doesNotMatch(cli('validate', join(dir, 'doc.tsx')).stderr, /look\.default/, 'a work with a style has a look');
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
});
