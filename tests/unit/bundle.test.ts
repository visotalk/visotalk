import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, truncateSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {BUNDLE_MIME, BundleError, contentIssue, formatCompatible, localImports, packBundle, packPlayerBundle, pathIssue, revisionOf, sha256, sourceClosure, unzipBundle, verifyBundle, zipBundle, zipIssue, openBundle, type BundleManifest} from '../../packages/ir/src/bundle.ts';
import {exportBundle, importBundle} from '../../packages/cli/src/bundle.ts';
import {spawn} from 'node:child_process';
import {kokoroKey} from '../../packages/cli/src/clip_key.ts';
import {load, prepare} from '../../packages/cli/src/project.ts';

const enc = new TextEncoder();
const tmp = (what: string) => mkdtempSync(join(tmpdir(), `vt-${what}-`));
process.env.SOURCE_DATE_EPOCH = '1760000000';

const DOC = (extra = '', voice = '') => `import {Doc, Asset, Scene, Line, Part, Animation, Appear} from '@visotalk/jsx';
export default <Doc id="bundled" title="Bundled" lang="en"${voice}>
  <Asset id="pic" kind="image" src="media/pic.png" license={{id: 'CC0-1.0', obligations: []}}/>
  <Scene id="s1">
    <Line id="l1">Hello there, world.</Line>
    <Part id="box">{() => <div>box</div>}</Part>
    <Animation><Appear target="box" line="l1" word="world"/></Animation>
  </Scene>${extra}
</Doc>;`;

/** A project directory with a document, one picture and, when asked, a prepared voice (the clip is a few bytes: nothing here decodes it) */
function project(opts: {voice?: boolean; doc?: string} = {}) {
  const dir = tmp('proj');
  mkdirSync(join(dir, 'media'));
  writeFileSync(join(dir, 'media/pic.png'), Buffer.from([137, 80, 78, 71, 1, 2, 3]));
  writeFileSync(join(dir, 'doc.tsx'), opts.doc ?? DOC());
  if (opts.voice) {
    const work = join(dir, '.visotalk/bundled');
    mkdirSync(join(work, 'audio'), {recursive: true});
    // a build mixes the clips into the soundtrack, so the clip is a real (silent) one
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', '1.5', '-c:a', 'aac', join(work, 'audio/abc123.m4a')]);
    writeFileSync(join(work, 'voice.json'), JSON.stringify({l1: {duration: 1.5, audio: 'audio/abc123.m4a', key: 'abc123'}}));
  }
  return load(join(dir, 'doc.tsx'));
}

test('a path is relative, NFC, short and plain', () => {
  for (const ok of ['source/doc.tsx', 'source/media/a b.png', 'voice/audio/x.m4a', 'captions/zh-CN.srt', 'source/é.png']) assert.equal(pathIssue(ok), undefined, ok);
  for (const bad of ['', '/etc/passwd', 'C:/x', '../x', 'a/../b', 'a//b', 'a/./b', 'a\\b', 'a\u0000b', 'e\u0301.png', 'dir/', 'x'.repeat(256), ('a/'.repeat(600))]) assert.ok(pathIssue(bad), JSON.stringify(bad.slice(0, 20)));
});

test('what a ZIP claims is judged before anything is inflated', () => {
  const one = (originalSize: number, size = 10) => zipIssue([{name: 'source/a.bin', size, originalSize}]);
  assert.equal(one(500), undefined);
  assert.match(one(2_000_000_000)!, /100×|MB/); // a bomb: 10 bytes that claim two gigabytes
  assert.match(zipIssue([{name: 'a/B.png', size: 1, originalSize: 1}, {name: 'a/b.PNG', size: 1, originalSize: 1}])!, /used twice/);
  assert.match(zipIssue(Array.from({length: 2001}, (_, i) => ({name: `f${i}`, size: 1, originalSize: 1})))!, /2000/);
  assert.match(zipIssue([{name: '../x', size: 1, originalSize: 1}])!, /segment/);
  assert.match(zipIssue([{name: 'a', size: 1e8, originalSize: 1e8}, {name: 'b', size: 1e8, originalSize: 1e8}, {name: 'c', size: 1e7, originalSize: 1e7}])!, /MB/);
});

test('a bundle format is read by the version that wrote it, and in 0.x only that minor', () => {
  assert.ok(formatCompatible('0.1.0') && formatCompatible('0.1.7'));
  assert.ok(!formatCompatible('0.2.0') && !formatCompatible('1.0.0') && !formatCompatible('0.0.9'));
});

test('an SVG that runs script and a page are not assets', () => {
  assert.equal(contentIssue('source/a.svg', enc.encode('<svg><path d="M0 0"/></svg>')), undefined);
  for (const svg of ['<svg><script>x</script></svg>', '<svg onload="x()"/>', '<a href="javascript:x"/>']) assert.ok(contentIssue('source/a.svg', enc.encode(svg)), svg);
  assert.ok(contentIssue('source/page.html', enc.encode('hi')));
});

test('export, then import, gives the talk back: the same files, the same revision, the same bytes', async () => {
  const p = project({voice: true});
  const out = join(tmp('out'), 'a.visotalk');
  const first = await exportBundle(p, out);
  assert.equal(first.voice, true);
  assert.deepEqual(Object.keys(first.manifest.files).sort(), ['captions/en.srt', 'credits.md', 'source/doc.tsx', 'source/media/pic.png', 'voice/audio/abc123.m4a', 'voice/voice.json']);
  assert.equal(first.manifest.entry, 'source/doc.tsx');
  assert.deepEqual(first.manifest.voice, {}, 'a voice is carried, and the document names none');
  assert.equal(first.manifest.spec, '0.7');
  assert.equal(first.manifest.created, '2025-10-09T08:53:20Z');

  const back = join(tmp('back'), 'talk');
  const r = await importBundle(out, back);
  assert.equal(readFileSync(join(back, 'doc.tsx'), 'utf8'), readFileSync(join(p.dir, 'doc.tsx'), 'utf8'));
  assert.deepEqual(readFileSync(join(back, 'media/pic.png')), readFileSync(join(p.dir, 'media/pic.png')));
  assert.equal(readFileSync(join(back, '.visotalk/bundled/voice.json'), 'utf8'), readFileSync(join(p.work, 'voice.json'), 'utf8'));
  assert.ok(existsSync(join(back, '.visotalk/bundled/audio/abc123.m4a')));

  const again = join(tmp('out'), 'b.visotalk');
  const second = await exportBundle(r.project, again);
  assert.equal(second.manifest.id, first.manifest.id);
  assert.equal(second.manifest.revision, first.manifest.revision);
  assert.deepEqual(readFileSync(again), readFileSync(out));
});

test('an adapted style keeps all its files through CLI export, import and re-export', async () => {
  const p = project();
  const files = new Map<string, Uint8Array>([
    ['style.json', enc.encode('{"slug":"red-pencil","version":"1","locked":[]}')],
    ['STYLE.md', enc.encode('Adapted guidance, not a catalogue lookup.')],
    ['parts/unused.tsx', enc.encode('export const unused = 42;')],
    ['demo/doc.tsx', enc.encode(DOC())],
    ['assets/unreferenced.png', new Uint8Array([137, 80, 78, 71, 0, 255])],
  ]);
  for (const [name, bytes] of files) {
    mkdirSync(join(p.dir, 'style', name, '..'), {recursive: true});
    writeFileSync(join(p.dir, 'style', name), bytes);
  }
  writeFileSync(join(p.dir, 'style/.env'), 'LOCAL_SECRET=must-not-export');
  const out = join(tmp('out'), 'style.visotalk');
  const first = await exportBundle(p, out);
  const opened = await openBundle(readFileSync(out));
  for (const [name, bytes] of files) assert.deepEqual(opened.entries.get(`source/style/${name}`), bytes, name);
  assert.ok(!opened.entries.has('source/style/.env'));
  const imported = await importBundle(out, join(tmp('style-back'), 'work'));
  const again = join(tmp('out'), 'style-again.visotalk');
  const second = await exportBundle(imported.project, again);
  assert.equal(second.manifest.revision, first.manifest.revision);
  assert.deepEqual(readFileSync(again), readFileSync(out));
});

test('an oversized style file is refused before it is read into the bundle', async () => {
  const p = project();
  mkdirSync(join(p.dir, 'style'));
  const file = join(p.dir, 'style/oversized.bin');
  writeFileSync(file, '');
  truncateSync(file, 200_000_001);
  const out = join(tmp('style-out'), 'oversized.visotalk');
  await assert.rejects(exportBundle(p, out), /style.*budget/);
  assert.ok(!existsSync(out));
});

test('style collection refuses linked roots, linked files and linked directories', async () => {
  const outside = tmp('style-outside');
  writeFileSync(join(outside, 'private.txt'), 'must not leave this directory');
  for (const kind of ['root', 'file', 'directory']) {
    const p = project();
    if (kind === 'root') symlinkSync(outside, join(p.dir, 'style'));
    else {
      mkdirSync(join(p.dir, 'style'));
      symlinkSync(kind === 'file' ? join(outside, 'private.txt') : outside, join(p.dir, 'style', kind));
    }
    const out = join(tmp('style-out'), 'refused.visotalk');
    await assert.rejects(exportBundle(p, out), /style.*link|link.*style/i, kind);
    assert.ok(!existsSync(out));
  }
});

test('music and effects travel as the assets they are, and the sound that plays them is checked on import', async () => {
  const doc = DOC().replace('import {Doc, Asset,', 'import {Doc, Asset, Sound,')
    .replace('  <Scene id="s1">', '  <Asset id="bed" kind="audio" src="media/bed.mp3" license={{id: \'CC-BY-4.0\', attribution: \'A. Composer\', obligations: [\'attribution\']}}/>\n  <Scene id="s1">')
    .replace('    <Part id="box">', '    <Sound asset="bed" at="start" loop volume={-8} duck={4}/>\n    <Part id="box">');
  const p = project({doc});
  writeFileSync(join(p.dir, 'media/bed.mp3'), Buffer.from('ID3 pretend music'));
  const out = join(tmp('out'), 'a.visotalk');
  const { manifest } = await exportBundle(p, out);
  assert.ok(manifest.files['source/media/bed.mp3']);
  const back = await importBundle(out, join(tmp('back'), 'talk'));
  assert.equal(back.project.doc.scenes[0].sounds?.[0].asset, 'bed');
  assert.match(readFileSync(join(back.dir, 'doc.tsx'), 'utf8'), /<Sound asset="bed"/);
});

test('a document id that is a path is refused before anything is written, and so is a voice module outside the project', async () => {
  const evil = DOC().replace('id="bundled"', 'id="../../../escaped"');
  const bundle = await packBundle({ source: new Map([['doc.tsx', enc.encode(evil)], ['media/pic.png', Buffer.from([137, 80, 78, 71, 1])]]), entry: 'doc.tsx', voice: undefined, id: 'x', generator: { name: 'test' }, created: new Date() });
  const parent = tmp('back');
  const file = join(tmp('out'), 'evil.visotalk');
  writeFileSync(file, bundle.bytes);
  await assert.rejects(importBundle(file, join(parent, 'talk')), /not a valid id/);
  assert.deepEqual(readdirSync(parent), []);
  assert.deepEqual(readdirSync(join(parent, '..')).filter((n) => n === 'escaped'), []);
  const onDisk = join(tmp('proj'), 'doc.tsx');
  writeFileSync(onDisk, evil);
  assert.throws(() => load(onDisk), /not a valid id/);
  assert.throws(() => sourceClosure('doc.tsx', (p) => (p === 'doc.tsx' ? enc.encode(DOC('', ' voice="/etc/mod.mjs:me"')) : p === 'media/pic.png' ? new Uint8Array(1) : undefined)), /outside the project directory/);
});

test('an entry named like a member of Object is not listed by being named so', async () => {
  const entries = await forge(GOOD);
  entries.set('constructor', enc.encode('x'));
  await assert.rejects(verifyBundle(entries), /constructor is in the bundle but not listed/);
});

test('a remix has an id of its own and remembers where it came from', async () => {
  const p = project();
  const out = join(tmp('out'), 'a.visotalk');
  const { manifest } = await exportBundle(p, out);
  const r = await importBundle(out, join(tmp('back'), 'mine'), {remix: true});
  const next = await exportBundle(r.project, join(tmp('out'), 'b.visotalk'));
  assert.notEqual(next.manifest.id, manifest.id);
  assert.deepEqual(next.manifest.lineage, {id: manifest.id, revision: manifest.revision, relation: 'remix'});
});

test('without a prepared voice the bundle says so and carries none', async () => {
  const r = await exportBundle(project(), join(tmp('out'), 'a.visotalk'));
  assert.equal(r.voice, false);
  assert.equal(r.manifest.voice, undefined);
  assert.ok(!Object.keys(r.manifest.files).some((f) => f.startsWith('voice/') || f.startsWith('captions/')));
});

test('a bundle holds files, not links or files from elsewhere', async () => {
  const link = project({doc: DOC().replace('src="media/pic.png"', 'src="https://example.org/pic.png"')});
  await assert.rejects(exportBundle(link, join(tmp('out'), 'a.visotalk')), /is a link/);
  const outside = project({doc: DOC().replace('src="media/pic.png"', 'src="../pic.png"')});
  await assert.rejects(exportBundle(outside, join(tmp('out'), 'a.visotalk')), /outside the project directory/);
});

test('the same files are the same ZIP bytes in every time zone, with nothing but the pinned time in them', () => {
  const files = new Map([['source/doc.tsx', enc.encode('x')], ['voice/audio/a.m4a', enc.encode('y')]]);
  const was = process.env.TZ;
  const zips = ['UTC', 'Asia/Tokyo', 'America/Los_Angeles'].map((tz) => (process.env.TZ = tz, zipBundle(files)));
  process.env.TZ = was;
  assert.deepEqual(zips[1], zips[0]);
  assert.deepEqual(zips[2], zips[0]);
  const view = new DataView(zips[0].buffer);
  assert.equal(view.getUint16(8, true), 0, 'mimetype is stored');
  assert.equal(new TextDecoder().decode(zips[0].subarray(30, 38)), 'mimetype');
  assert.equal(view.getUint16(10, true), 0, 'DOS time 00:00:00');
  assert.equal(view.getUint16(12, true), 0x0021, 'DOS date 1980-01-01');
  assert.equal(view.getUint16(28, true), 0, 'no extra field');
});

/** A bundle as a stranger could make one: the entries as given, with a manifest that lists them truthfully unless told otherwise */
async function forge(files: Record<string, string>, change: (m: BundleManifest) => void = () => {}, skip: string[] = []) {
  const entries = new Map(Object.entries(files).map(([k, v]) => [k, enc.encode(v)]));
  const listed: BundleManifest['files'] = {};
  for (const [k, v] of entries) if (!skip.includes(k)) listed[k] = {size: v.length, sha256: await sha256(v)};
  const m: BundleManifest = {
    format: 'visotalk.bundle', kind: 'source', formatVersion: '0.1.0', id: 'x', revision: await revisionOf(listed), spec: '0.6', generator: {name: 'test'},
    created: '2026-10-19T00:00:00Z', summary: {title: 'T', lang: 'en', canvases: []}, entry: 'source/doc.tsx', license: {id: 'all-rights-reserved'}, files: listed,
  };
  change(m);
  entries.set('manifest.json', enc.encode(JSON.stringify(m)));
  entries.set('mimetype', enc.encode(BUNDLE_MIME));
  return entries;
}
const GOOD = {'source/doc.tsx': DOC(), 'source/media/pic.png': 'png'};

test('a whole, honest bundle is accepted, and each way of not being one is refused with its reason', async () => {
  assert.equal((await verifyBundle(await forge(GOOD))).entry, 'source/doc.tsx');
  const refused = async (what: RegExp, entries: Map<string, Uint8Array>) => assert.rejects(verifyBundle(entries), (e) => e instanceof BundleError && what.test(e.message));

  const tampered = await forge(GOOD);
  tampered.set('source/media/pic.png', enc.encode('PNG'));
  await refused(/does not match/, tampered);

  await refused(/not listed/, await forge({...GOOD, 'source/extra.txt': 'x'}, () => {}, ['source/extra.txt']));
  const lost = await forge(GOOD);
  lost.delete('source/media/pic.png');
  await refused(/listed in manifest.json but missing/, lost);

  await refused(/format 0.2.0/, await forge(GOOD, (m) => { m.formatVersion = '0.2.0'; }));
  await refused(/VisoTalk spec 0.4/, await forge(GOOD, (m) => { m.spec = '0.4'; }));
  await refused(/revision does not match/, await forge(GOOD, (m) => { m.revision = 'sha256:' + '0'.repeat(64); }));
  await refused(/mimetype/, new Map([...(await forge(GOOD))].filter(([k]) => k !== 'mimetype')));
  await refused(/entry under source/, await forge(GOOD, (m) => { m.entry = 'voice/x'; }));
  await refused(/page or an executable/, await forge({...GOOD, 'source/x.html': '<script>'}));
  await refused(/outside|segment/, await forge({...GOOD, 'source/../evil': 'x'}));
});

test('an entry the reader does not know is carried, hashed and left alone', async () => {
  const ok = await verifyBundle(await forge({...GOOD, 'extras/readme.txt': 'hi'}));
  assert.ok(ok.files['extras/readme.txt']);
});

test('a ZIP that is not a bundle, or lies about its size, is refused before it is inflated', () => {
  const bundle = zipBundle(new Map([['source/doc.tsx', enc.encode('x'.repeat(5000))]]));
  const plain = new Uint8Array(bundle);
  plain[37] = 0x66; // the first entry is named "mimetypf"
  assert.throws(() => unzipBundle(plain), /first entry is "mimetype"/);
  const lying = new Uint8Array(bundle);
  const view = new DataView(lying.buffer);
  for (let i = 0; i < lying.length - 4; i++) if (view.getUint32(i, true) === 0x02014b50) view.setUint32(i + 24, 3_000_000_000, true); // every central header says 3 GB
  assert.throws(() => unzipBundle(lying), /MB|100×/);
  assert.throws(() => unzipBundle(bundle.subarray(0, 60)), BundleError);
});

test('import refuses a document that is not valid, a voice module, a player, and a directory in use; it leaves nothing behind', async () => {
  const bad = project({doc: DOC('\n  <Scene id="s1"><Line id="l1">Again.</Line></Scene>')}); // ids repeat
  const out = join(tmp('out'), 'bad.visotalk');
  await exportBundle(bad, out);
  const parent = tmp('back');
  await assert.rejects(importBundle(out, join(parent, 'x')), /not valid/);
  assert.deepEqual(readdirSync(parent), []);

  const mod = project({doc: DOC('', ' voice="./voice.mjs:me"')});
  writeFileSync(join(mod.dir, 'voice.mjs'), 'export default async () => ({audio: new Uint8Array(), ext: "mp3"});');
  const withModule = join(tmp('out'), 'mod.visotalk');
  const exported = await exportBundle(mod, withModule);
  assert.ok(exported.manifest.files['source/voice.mjs'], 'a voice module belongs to the talk though the document does not import it');
  await assert.rejects(importBundle(withModule, join(parent, 'y')), /--allow-voice-module/);
  assert.deepEqual(readdirSync(parent), []);
  await importBundle(withModule, join(parent, 'y'), {allowVoiceModule: true});
  assert.ok(existsSync(join(parent, 'y/voice.mjs')));

  const full = join(parent, 'z');
  mkdirSync(full);
  writeFileSync(join(full, 'mine.txt'), 'keep');
  await assert.rejects(importBundle(withModule, full, {allowVoiceModule: true}), /not empty/);
  assert.equal(readFileSync(join(full, 'mine.txt'), 'utf8'), 'keep');

  const player = zipBundle(await forge({'player/index.html': '<html/>'}, (m) => { m.kind = 'player'; delete m.entry; }));
  const playerFile = join(tmp('out'), 'p.visotalk');
  writeFileSync(playerFile, player);
  await assert.rejects(importBundle(playerFile, join(parent, 'p')), /player bundle/);
});

test('prepare keeps a line whose clip was made from these words, so a bundle needs no model and no provider to be used', () => {
  const p = project();
  const key = kokoroKey('af_heart', 1, 'Hello there, world.');
  mkdirSync(join(p.work, 'audio'), {recursive: true});
  writeFileSync(join(p.work, 'audio/x.m4a'), 'a');
  const entry = {duration: 1.5, audio: 'audio/x.m4a', key};
  writeFileSync(join(p.work, 'voice.json'), JSON.stringify({l1: entry}));
  assert.deepEqual(prepare(p, undefined), {l1: entry});
  writeFileSync(join(p.work, 'voice.json'), JSON.stringify({l1: {...entry, key: 'other'}}));
  const kokoroDir = process.env.KOKORO_DIR; // a machine with a model installed would speak the line instead of refusing
  delete process.env.KOKORO_DIR;
  try {
    assert.throws(() => prepare(p, undefined), /needs a TTS model/);
  } finally {
    if (kokoroDir !== undefined) process.env.KOKORO_DIR = kokoroDir;
  }
});

test('the key of a Kokoro clip is the one tts_lines.py gives it', () => {
  const py = (voice: string, speed: number, say: string) => spawnSync('python3', ['-c',
    'import hashlib,sys;v,s,t=sys.argv[1:];print(hashlib.sha1(f"{v}|{s}|{t}".encode()).hexdigest()[:12])', voice, String(speed), say], {encoding: 'utf8'}).stdout.trim();
  for (const [v, s, t] of [['af_heart', 1, 'Hello there.'], ['bf_emma', 0.9, 'Hello, world.'], ['af_heart', 1.25, 'It took 123 years.']] as const) {
    assert.equal(kokoroKey(v, s, t), py(v, s, t));
  }
});

test('the CLI exports and imports, and says why it refused', () => {
  const p = project();
  const cwd = tmp('cwd');
  const run = (...args: string[]) => spawnSync(process.execPath, ['--experimental-strip-types', join(process.cwd(), 'packages/cli/src/main.ts'), ...args], {encoding: 'utf8', cwd});
  const out = join(cwd, 't.visotalk');
  const e = run('export', join(p.dir, 'doc.tsx'), '--out', out);
  assert.equal(e.status, 0, e.stderr);
  assert.match(e.stdout, /wrote .*t\.visotalk: .* 3 files, revision sha256:/);
  assert.match(e.stdout, /no voice/);
  const i = run('import', out, join(cwd, 'talk'));
  assert.equal(i.status, 0, i.stderr);
  assert.match(i.stdout, /imported "Bundled"/);
  assert.ok(existsSync(join(cwd, 'talk/doc.tsx')));
  const again = run('import', out, join(cwd, 'talk'));
  assert.equal(again.status, 1);
  assert.match(again.stderr, /not empty/);
  writeFileSync(join(cwd, 'junk.visotalk'), 'not a zip');
  const junk = run('import', join(cwd, 'junk.visotalk'), join(cwd, 'junk'));
  assert.equal(junk.status, 1);
  assert.match(junk.stderr, /^refused: not a VisoTalk bundle/);
});

test('a player bundle is the built talk: it plays, has no document, and says where it came from', async () => {
  const p = project({voice: true});
  const out = join(tmp('out'), 'p.visotalk');
  const source = await exportBundle(p, join(tmp('out'), 's.visotalk'));
  const built = await exportBundle(p, out, {player: true});
  assert.equal(built.manifest.kind, 'player');
  assert.equal(built.manifest.id, source.manifest.id);
  assert.deepEqual(built.manifest.lineage, {id: source.manifest.id, revision: source.manifest.revision, relation: 'player'});
  const paths = Object.keys(built.manifest.files);
  assert.ok(paths.includes('player/index.html') && paths.some((f) => /^player\/app\.[0-9a-f]{12}\.js$/.test(f)) && paths.some((f) => /^player\/soundtrack\.[0-9a-f]{12}\.mp3$/.test(f)));
  assert.ok(paths.some((f) => f.startsWith('player/audio/')), 'the clips of the voice are in the player');
  assert.ok(paths.includes('captions/en.srt') && paths.includes('credits.md'));
  assert.ok(!paths.some((f) => f.startsWith('source/') || f.startsWith('voice/') || f.endsWith('doc.tsx')), 'no document, no source: nothing to edit');
  assert.equal(built.manifest.summary.obligations, undefined, 'the picture is CC0');
  // opened by the same rules, refused as a thing to edit, served as a page
  await openBundle(readFileSync(out));
  await assert.rejects(importBundle(out, join(tmp('back'), 'talk')), /player bundle/);
  const child = spawn(process.execPath, ['--experimental-strip-types', join(process.cwd(), 'packages/cli/src/main.ts'), 'play', out, '--port', '48123'], {stdio: ['ignore', 'pipe', 'pipe']});
  try {
    await new Promise<void>((resolve, reject) => { child.stdout.on('data', (d) => /playing/.test(String(d)) && resolve()); child.on('exit', () => reject(new Error('play ended'))); setTimeout(() => reject(new Error('play did not start')), 20000); });
    const page = await fetch('http://localhost:48123/index.html');
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<script/);
  } finally {
    child.kill();
  }
});

test('a player needs the real narration, and a source and a player are never one file', async () => {
  await assert.rejects(exportBundle(project(), join(tmp('out'), 'p.visotalk'), {player: true}), /real narration/);
  const mixed = await forge({'player/index.html': '<html/>', 'source/doc.tsx': DOC()}, (m) => { m.kind = 'player'; delete m.entry; });
  await assert.rejects(verifyBundle(mixed), /never in one file/);
  const sourceWithPlayer = await forge({...GOOD, 'player/index.html': '<html/>'});
  await assert.rejects(verifyBundle(sourceWithPlayer), /never in one file/);
});

test('the terms of the media stay in a player bundle, which does not hold the document that declares them', async () => {
  const doc = DOC().replace("{id: 'CC0-1.0', obligations: []}", "{id: 'CC-BY-SA-4.0', attribution: 'A. Photographer', obligations: ['attribution', 'share-alike']}");
  const {manifest, bytes} = await packPlayerBundle({player: new Map([['index.html', enc.encode('<html/>')]]), docText: doc, id: 'x', generator: {name: 'test'}, created: new Date()});
  assert.deepEqual(manifest.summary.obligations, ['attribution', 'share-alike']);
  const {entries} = await openBundle(bytes);
  assert.match(new TextDecoder().decode(entries.get('credits.md')), /A\. Photographer/);
  assert.equal(manifest.captions, undefined, 'no voice was given, so there are no captions to make');
});
