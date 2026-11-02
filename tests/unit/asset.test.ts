import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';

test('asset search: a picture library that cannot be reached is given up on at once, not waited for as a busy one', async () => {
  const {assetCmd} = await import('../../packages/cli/src/asset.ts');
  const dir = mkdtempSync('/tmp/vt-asset-');
  const cwd = process.cwd();
  const fetched: string[] = [];
  const printed: string[] = [];
  const realFetch = globalThis.fetch;
  const realLog = console.log;
  // a network that refuses the hosts, as a sandbox's egress rule does
  globalThis.fetch = (async (url: string | URL) => {
    fetched.push(new URL(String(url)).host);
    throw new TypeError('fetch failed');
  }) as typeof fetch;
  console.log = (line: string) => void printed.push(line);
  process.chdir(dir);
  const started = Date.now();
  try {
    await assetCmd('search', ['Tsing Ma Bridge']);
  } finally {
    process.chdir(cwd);
    globalThis.fetch = realFetch;
    console.log = realLog;
    rmSync(dir, {recursive: true, force: true});
  }
  assert.ok(Date.now() - started < 2000, `took ${Date.now() - started} ms`);
  assert.deepEqual(fetched, ['commons.wikimedia.org', 'commons.wikimedia.org', 'api.openverse.org', 'api.openverse.org'], 'each source is tried twice, no more');
  assert.match(printed.join('\n'), /nothing usable for "Tsing Ma Bridge" \(no answer from commons\.wikimedia\.org \(fetch failed\): it cannot be reached from here; no answer from api\.openverse\.org/);
});
