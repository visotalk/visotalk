/** Navigation failures keep bounded browser evidence without leaking URL credentials. */
import {strict as assert} from 'node:assert';
import {EventEmitter} from 'node:events';
import {test} from 'node:test';
import type {Page} from 'puppeteer-core';
import {loadPlayer} from '../../packages/exporter/src/chrome.ts';

test('player navigation reports HTTP, failed requests and page errors, and removes listeners', async () => {
  const page = new EventEmitter();
  Object.assign(page, {
    goto: async () => {
      page.emit('response', {url: () => 'http://127.0.0.1:1234/?token=secret', status: () => 200, headers: () => ({'content-type': 'text/html'}), request: () => ({isNavigationRequest: () => true})});
      page.emit('requestfailed', {url: () => 'https://user:password@example.com/app.js?token=secret', failure: () => ({errorText: 'net::ERR_ABORTED'})});
      page.emit('pageerror', new Error('document failed'));
      throw new Error('net::ERR_ABORTED at http://127.0.0.1:1234/?token=secret');
    },
    waitForFunction: async () => undefined,
  });
  await assert.rejects(loadPlayer(page as unknown as Page, 'http://127.0.0.1:1234/?token=secret'), (error: Error) => {
    assert.match(error.message, /200 text\/html/);
    assert.match(error.message, /net::ERR_ABORTED/);
    assert.match(error.message, /document failed/);
    assert.match(error.message, /https:\/\/example.com\/app.js/);
    assert.doesNotMatch(error.message, /password|token=secret/);
    return true;
  });
  for (const event of ['response', 'requestfailed', 'pageerror', 'error']) assert.equal(page.listenerCount(event), 0);
});

test('player readiness failure is reported too, with bounded evidence', async () => {
  const page = new EventEmitter();
  Object.assign(page, {
    goto: async () => { for (let n = 0; n < 100; n++) page.emit('pageerror', new Error('x'.repeat(1000))); },
    waitForFunction: async () => { throw new Error('readiness timed out'); },
  });
  await assert.rejects(loadPlayer(page as unknown as Page, 'http://127.0.0.1:1234/'), (error: Error) => {
    assert.match(error.message, /readiness timed out/);
    assert.ok(error.message.length < 3000);
    return true;
  });
});
