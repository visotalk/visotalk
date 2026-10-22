import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {CJK_FONTS, fontPlan, isInstalled, writeFontFaces} from '../../packages/cli/src/fonts.ts';

const doc = (lang: string, sans?: string) => ({meta: {lang}, theme: sans ? {id: 'visotalk/dark', tokens: {fonts: {sans, mono: '"JetBrains Mono", monospace'}}} : undefined}) as Parameters<typeof fontPlan>[0];

test('fonts: a CJK document gets the sans of its language after the Latin face, and an English one gets nothing', () => {
  assert.deepEqual(fontPlan(doc('zh-CN')), {fonts: [CJK_FONTS[0]], sans: '"Inter", "Noto Sans SC", sans-serif'});
  assert.equal(fontPlan(doc('ja')).fonts[0].family, 'Noto Sans JP');
  assert.equal(fontPlan(doc('ko-KR')).fonts[0].family, 'Noto Sans KR');
  assert.deepEqual(fontPlan(doc('en')), {fonts: [], sans: '"Inter", sans-serif'});
  assert.deepEqual(fontPlan(doc('zhx')), {fonts: [], sans: '"Inter", sans-serif'}, 'a code that merely starts with zh');
});

test('fonts: a family named in the stack is the one used, whatever the language', () => {
  const serif = fontPlan(doc('zh-CN', '"Noto Serif SC", serif'));
  assert.deepEqual(serif.fonts.map((f) => f.family), ['Noto Serif SC']);
  assert.equal(serif.sans, '"Noto Serif SC", serif', 'the stack is the author\'s');
  assert.deepEqual(fontPlan(doc('en', "'LXGW WenKai', sans-serif")).fonts.map((f) => f.family), ['LXGW WenKai'], 'single quotes too, in an English document');
});

test('fonts: a face is cut down to the document\'s characters and written with its @font-face rule', (t) => {
  const dir = process.env.VISOTALK_FONTS;
  const python = process.env.VISOTALK_PYTHON;
  if (!dir || !python || !isInstalled(dir, CJK_FONTS[0])) return t.skip('no CJK fonts (visotalk doctor --fix)');
  const out = mkdtempSync('/tmp/vt-fonts-');
  assert.equal(writeFontFaces([CJK_FONTS[0]], dir, python, '\u5929\u7a7a', out), 'fonts.css');
  assert.ok(existsSync(join(out, 'fonts', 'noto-sans-sc.woff2')));
  assert.match(readFileSync(join(out, 'fonts.css'), 'utf8'), /font-family: "Noto Sans SC"; src: url\(\.\/fonts\/noto-sans-sc\.woff2\) format\("woff2"\); font-weight: 100 900/);
  assert.throws(() => writeFontFaces([CJK_FONTS[0]], '/nowhere', python, 'x', out), /not installed.*doctor --fix/);
});

test('fonts: an artifact carries its CJK face as a file beside the page, with the rule inline', async (t) => {
  const dir = process.env.VISOTALK_FONTS;
  const python = process.env.VISOTALK_PYTHON;
  if (!dir || !python || !isInstalled(dir, CJK_FONTS[0])) return t.skip('no CJK fonts (visotalk doctor --fix)');
  const {mkdtempSync: mk, mkdirSync, writeFileSync} = await import('node:fs');
  const {spawnSync} = await import('node:child_process');
  const {buildPlayer, load} = await import('../../packages/cli/src/project.ts');
  const root = mk('/tmp/vt-artifact-font-');
  const wav = root + '/l1.wav';
  if (spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', wav]).status !== 0) return t.skip('no ffmpeg');
  writeFileSync(root + '/doc.tsx', `import {Doc, Scene, Line, Part, Animation, Appear} from '@visotalk/jsx';
export default <Doc id="zh" title="t" lang="zh-CN" voice="minimax:v" theme="visotalk/dark" canvas="16x9">
  <Scene id="s"><Line id="l1">\u5929\u7a7a</Line><Part id="p">{() => <div>\u5929</div>}</Part><Animation><Appear on="p" at="start"/></Animation></Scene>
</Doc>;`);
  mkdirSync(root + '/.visotalk/zh/audio', {recursive: true});
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'aac', root + '/.visotalk/zh/audio/l1.m4a']);
  writeFileSync(root + '/.visotalk/zh/voice.json', JSON.stringify({l1: {duration: 1, audio: 'audio/l1.m4a'}}));
  const out = await buildPlayer(load(root + '/doc.tsx'), {artifact: true});
  const {readFileSync} = await import('node:fs');
  assert.ok(JSON.parse(readFileSync(out + '/artifact.json', 'utf8')).files.includes('fonts/noto-sans-sc.woff2'));
  assert.match(readFileSync(out + '/player.html', 'utf8'), /@font-face \{font-family: "Noto Sans SC"; src: url\(fonts\/noto-sans-sc\.woff2\)/);
});
