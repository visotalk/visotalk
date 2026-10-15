import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {createServer, type Server} from 'node:http';
import type {AddressInfo} from 'node:net';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {after, before, test} from 'node:test';
import {download} from '../../packages/cli/src/doctor.ts';

const GOOD = Buffer.from('the whole file');
const want = {bytes: GOOD.length, sha256: createHash('sha256').update(GOOD).digest('hex')};
let server: Server;
let base = '';
const dir = mkdtempSync(join(tmpdir(), 'doctor-'));

before(async () => {
  server = createServer((req, res) => {
    if (req.url === '/good') return void res.end(GOOD);
    if (req.url === '/swapped') return void res.end(Buffer.from('THE WHOLE FILE')); // the same length as GOOD: only the hash tells them apart
    // a connection cut halfway: the length promised is the whole file's
    res.writeHead(200, {'content-length': GOOD.length});
    res.write(GOOD.subarray(0, 4));
    setTimeout(() => res.destroy(), 20);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

test('a download that matches its size and hash is written whole', async () => {
  const dest = join(dir, 'good.bin');
  await download(`${base}/good`, dest, want, {retries: 1});
  assert.deepEqual(readFileSync(dest), GOOD);
  assert.equal(existsSync(`${dest}.part`), false);
});

test('a file that is not the expected one is refused and leaves nothing behind', async () => {
  const dest = join(dir, 'swapped.bin');
  await assert.rejects(download(`${base}/swapped`, dest, want, {retries: 1}), /not the expected file/);
  assert.equal(existsSync(dest), false);
  assert.equal(existsSync(`${dest}.part`), false);
});

test('a cut connection keeps the file that was already there', async () => {
  const dest = join(dir, 'cut.bin');
  writeFileSync(dest, 'older copy');
  await assert.rejects(download(`${base}/cut`, dest, want, {retries: 1}));
  assert.equal(readFileSync(dest, 'utf8'), 'older copy');
  assert.equal(existsSync(`${dest}.part`), false);
});
