/** The public motion catalogue: a package is checked against its SHA-256, unpacked without links or stray paths, and becomes the same pack the built-in copy is. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {mkdirSync,mkdtempSync,readFileSync,symlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {builtinMotion,inspectMotion} from '../../packages/ir/src/motions.ts';
import {hubMotion,packFromPackage,searchHub,untar,type HubMotion} from '../../packages/cli/src/motionhub.ts';

/** A catalogue package of the built-in `slug`, laid out as the catalogue holds it, with `extra` files beside; and its index row */
function hubPackage(slug: string, extra: (root: string) => void = () => {}, tools = true): {row: HubMotion; gz: Buffer} {
  const dir = mkdtempSync(join(tmpdir(), 'hub-')), root = join(dir, slug);
  for (const [path, data] of builtinMotion(slug)!) {
    const dest = join(root, tools ? 'visotalk' : '', path.slice('motion/'.length));
    mkdirSync(dirname(dest), {recursive: true});
    writeFileSync(dest, data);
  }
  writeFileSync(join(root, 'poster.jpg'), 'poster');
  extra(root);
  const gz = execFileSync('tar', ['-czf', '-', '-C', dir, slug]);
  const row: HubMotion = {slug, version: '1.0.1', name: {en: 'Red Pencil'}, line: {en: 'A printed page marked up in red.'}, tags: ['hand-drawn', 'light'],
    authors: [{name: 'VisoTalk', github: 'iamsuosi'}], license: {text: 'CC-BY-4.0', code: 'MIT'}, poster: `/m/${slug}/poster.jpg`, tools: tools ? ['visotalk'] : [],
    package: {url: `/m/${slug}/1.0.1.tgz`, sha256: createHash('sha256').update(gz).digest('hex'), bytes: gz.length}};
  return {row, gz};
}

test('a catalogue package becomes the built-in pack it was exported from, with the poster beside it', () => {
  const {row, gz} = hubPackage('red-pencil');
  const pack = packFromPackage(row, gz);
  assert.equal(Buffer.from(pack.get('motion/poster.jpg')!).toString(), 'poster');
  pack.delete('motion/poster.jpg');
  const builtin = builtinMotion('red-pencil')!;
  assert.deepEqual([...pack.keys()].sort(), [...builtin.keys()].sort());
  for (const [path, data] of builtin) assert.ok(Buffer.from(pack.get(path)!).equals(Buffer.from(data)), path);
  assert.deepEqual(inspectMotion(pack).issues, []);
});

test('a package is refused when its SHA-256, its paths or its entries are wrong, or it has no VisoTalk pack', () => {
  const {row, gz} = hubPackage('red-pencil');
  assert.throws(() => packFromPackage({...row, package: {...row.package, sha256: '0'.repeat(64)}}, gz), /SHA-256/);
  const linked = hubPackage('red-pencil', (root) => symlinkSync('/etc/passwd', join(root, 'visotalk', 'parts', 'link.tsx')));
  assert.throws(() => packFromPackage(linked.row, linked.gz), /link/);
  const bare = hubPackage('red-pencil', () => {}, false);
  assert.throws(() => packFromPackage(bare.row, bare.gz), /no VisoTalk pack/);
  const other = hubPackage('red-pencil');
  assert.throws(() => packFromPackage({...other.row, slug: 'another'}, other.gz), /outside its motion/);
});

test('untar reads a long path through the ustar prefix', () => {
  const dir = mkdtempSync(join(tmpdir(), 'long-')), path = `${'a'.repeat(70)}/${'b'.repeat(70)}/c.txt`;
  mkdirSync(join(dir, dirname(path)), {recursive: true});
  writeFileSync(join(dir, path), 'long');
  const tar = execFileSync('tar', ['--format=ustar', '-cf', '-', '-C', dir, path]);
  assert.equal(Buffer.from(untar(tar).get(path)!).toString(), 'long');
});

test('search matches every word against slugs, names, lines and tags', () => {
  const {row} = hubPackage('red-pencil');
  assert.equal(searchHub([row], ['RED', 'light']).length, 1);
  assert.equal(searchHub([row], ['red', 'dark']).length, 0);
  assert.equal(searchHub([row], []).length, 1);
});

test('a motion is fetched from the catalogue by its slug; an unknown slug is no motion', async () => {
  const {row, gz} = hubPackage('red-pencil');
  const server = createServer((req, res) => {
    if (req.url === '/api/motions.json') { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({spec: 'motion/0.1', motions: [row]})); }
    else if (req.url === row.package.url) res.end(gz);
    else { res.statusCode = 404; res.end(); }
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const base = `http://127.0.0.1:${(server.address() as {port: number}).port}`;
  try {
    assert.deepEqual(inspectMotion((await hubMotion('red-pencil', base))!).issues, []);
    assert.equal(await hubMotion('no-such-motion', base), undefined);
  } finally { server.close(); }
});
