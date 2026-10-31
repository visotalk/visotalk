import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {FONTS, fontPlan, fontWarning, isInstalled, unavailableFonts, writeFontFaces} from '../../packages/cli/src/fonts.ts';

const doc = (lang: string, sans?: string) => ({meta: {lang}, theme: sans ? {id: 'visotalk/dark', tokens: {fonts: {sans, mono: '"JetBrains Mono", monospace'}}} : undefined}) as Parameters<typeof fontPlan>[0];

test('fonts: a CJK document gets the sans of its language after the Latin face, and an English one gets nothing', () => {
  assert.deepEqual(fontPlan(doc('zh-CN')), {fonts: [FONTS[0]], sans: '"Inter", "Noto Sans SC", sans-serif'});
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
  assert.deepEqual(fontPlan(doc('en', '"Newsreader", serif')).fonts.map((f) => f.style ?? 'normal'), ['normal', 'italic'], 'a family with an italic brings both');
});

test('fonts: a family a part names is embedded too, without losing the language default', () => {
  const part = `export const T = {display: '"Noto Serif SC", serif'};`;
  const zh = fontPlan(doc('zh-CN'), part);
  assert.deepEqual(zh.fonts.map((f) => f.family), ['Noto Sans SC', 'Noto Serif SC'], 'the Chinese sans stays the text face; the heading face comes beside it');
  assert.equal(zh.sans, '"Inter", "Noto Sans SC", sans-serif');
  const named = fontPlan(doc('zh-CN', '"Noto Sans SC", sans-serif'), part);
  assert.deepEqual(named.fonts.map((f) => f.family), ['Noto Sans SC', 'Noto Serif SC'], 'beside the stack\'s faces, once each');
  assert.deepEqual(fontPlan(doc('en'), `fontFamily: "'Newsreader', serif"`).fonts.map((f) => f.style ?? 'normal'), ['normal', 'italic'], 'an English document with a display face');
  assert.deepEqual(fontPlan(doc('en'), '<text fontFamily="LXGW WenKai">x</text>').fonts.map((f) => f.family), ['LXGW WenKai'], 'a JSX attribute names it too');
  assert.deepEqual(fontPlan(doc('en'), 'a serif display face for headings').fonts, [], 'a family is named in quotes, not mentioned in prose');
});

test('fonts: the display stack is embedded like the others, and a CJK document keeps its script beside Latin faces', () => {
  const styled = {meta: {lang: 'zh-CN'}, theme: {id: 'visotalk/dark', tokens: {fonts: {sans: '"Hanken Grotesk", sans-serif', mono: '"JetBrains Mono", monospace', display: '"Big Shoulders Display", sans-serif'}}}} as Parameters<typeof fontPlan>[0];
  const plan = fontPlan(styled);
  assert.deepEqual(plan.fonts.map((f) => f.family), ['Big Shoulders Display', 'Hanken Grotesk', 'Noto Sans SC']);
  assert.equal(plan.sans, '"Hanken Grotesk", "Noto Sans SC", sans-serif');
  assert.equal(plan.display, '"Big Shoulders Display", "Noto Sans SC", sans-serif');
  const english = fontPlan({...styled, meta: {...styled.meta, lang: 'en'}});
  assert.deepEqual(english.fonts.map((f) => f.family), ['Big Shoulders Display', 'Hanken Grotesk']);
  assert.equal(english.display, '"Big Shoulders Display", sans-serif');
});

test('fonts: a face no player carries is named, and bundled, catalogued and generic families are not', () => {
  assert.deepEqual(unavailableFonts(doc('en', 'Georgia, "Liberation Serif", serif')), ['Georgia', 'Liberation Serif']);
  assert.deepEqual(unavailableFonts(doc('en', '"Inter", "Caveat", system-ui, sans-serif')), []);
  assert.deepEqual(unavailableFonts(doc('en')), []);
  assert.equal(fontWarning([]), '');
  assert.match(fontWarning(['Georgia']), /^font\.unavailable: "Georgia" is not a face.*Shantell Sans/);
});

test('fonts: an italic is written under its own name, with its own rule', (t) => {
  const dir = process.env.VISOTALK_FONTS;
  const python = process.env.VISOTALK_PYTHON;
  const faces = FONTS.filter((f) => f.family === 'Newsreader');
  if (!dir || !python || !faces.every((f) => isInstalled(dir, f))) return t.skip('no Newsreader (visotalk doctor --fix)');
  const out = mkdtempSync('/tmp/vt-fonts-');
  writeFontFaces(faces, dir, python, 'Light', out);
  assert.ok(existsSync(join(out, 'fonts', 'newsreader.woff2')) && existsSync(join(out, 'fonts', 'newsreader-italic.woff2')));
  const css = readFileSync(join(out, 'fonts.css'), 'utf8');
  assert.match(css, /newsreader\.woff2\) format\("woff2"\); font-weight: 200 800; font-style: normal;/);
  assert.match(css, /newsreader-italic\.woff2\) format\("woff2"\); font-weight: 200 800; font-style: italic;/);
});

test('fonts: a face is cut down to the document\'s characters and written with its @font-face rule', (t) => {
  const dir = process.env.VISOTALK_FONTS;
  const python = process.env.VISOTALK_PYTHON;
  if (!dir || !python || !isInstalled(dir, FONTS[0])) return t.skip('no CJK fonts (visotalk doctor --fix)');
  const out = mkdtempSync('/tmp/vt-fonts-');
  assert.equal(writeFontFaces([FONTS[0]], dir, python, '\u5929\u7a7a', out), 'fonts.css');
  assert.ok(existsSync(join(out, 'fonts', 'noto-sans-sc.woff2')));
  assert.match(readFileSync(join(out, 'fonts.css'), 'utf8'), /font-family: "Noto Sans SC"; src: url\(\.\/fonts\/noto-sans-sc\.woff2\) format\("woff2"\); font-weight: 100 900/);
  assert.throws(() => writeFontFaces([FONTS[0]], '/nowhere', python, 'x', out), /not installed.*doctor --fix/);
  // the same face cut to the same characters is kept (a Python that cannot run proves nothing was cut); new characters cut it again
  assert.equal(writeFontFaces([FONTS[0]], dir, '/bin/false', '\u5929\u7a7a', out), 'fonts.css');
  assert.throws(() => writeFontFaces([FONTS[0]], dir, '/bin/false', '\u5929\u7a7a\u84dd', out), /could not cut/);
});

test('fonts: an artifact carries its CJK face as a file beside the page, with the rule inline', async (t) => {
  const dir = process.env.VISOTALK_FONTS;
  const python = process.env.VISOTALK_PYTHON;
  if (!dir || !python || !isInstalled(dir, FONTS[0])) return t.skip('no CJK fonts (visotalk doctor --fix)');
  const {mkdtempSync: mk, mkdirSync, writeFileSync} = await import('node:fs');
  const {spawnSync} = await import('node:child_process');
  const {buildPlayer, load} = await import('../../packages/cli/src/project.ts');
  const root = mk('/tmp/vt-artifact-font-');
  const wav = root + '/l1.wav';
  if (spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', wav]).status !== 0) return t.skip('no ffmpeg');
  writeFileSync(root + '/doc.tsx', `import {Doc, Scene, Line, Part, Animation, Appear} from '@visotalk/jsx';
export default <Doc id="zh" title="t" lang="zh-CN" voice="minimax:v" theme="visotalk/dark" canvas="16x9">
  <Scene id="s"><Line id="l1">\u5929\u7a7a</Line><Part id="p">{() => <div>\u5929</div>}</Part><Animation><Appear target="p" at="start"/></Animation></Scene>
</Doc>;`);
  mkdirSync(root + '/.visotalk/zh/audio', {recursive: true});
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'aac', root + '/.visotalk/zh/audio/l1.m4a']);
  writeFileSync(root + '/.visotalk/zh/voice.json', JSON.stringify({l1: {duration: 1, audio: 'audio/l1.m4a'}}));
  const out = await buildPlayer(load(root + '/doc.tsx'), {artifact: true});
  const {readFileSync} = await import('node:fs');
  // the file is named by its content, like every file a player carries
  const face = (JSON.parse(readFileSync(out + '/artifact.json', 'utf8')).files as string[]).find((f) => /^fonts\/noto-sans-sc-[0-9a-f]{12}\.woff2$/.test(f));
  assert.ok(face);
  assert.ok(readFileSync(out + '/player.html', 'utf8').includes(`@font-face {font-family: "Noto Sans SC"; src: url(${face})`));
});
