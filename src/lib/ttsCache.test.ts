import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ttsCacheClear,
  ttsCacheCount,
  ttsCacheGet,
  ttsCachePut,
} from './ttsCache';

/**
 * In the bun/node test env there is no IndexedDB: every function must
 * degrade gracefully (get -> null, put/count/clear -> no-op, never throw).
 * Real IndexedDB behaviour is verified in the browser harness instead.
 */
test('ttsCache: degrades gracefully without IndexedDB', async () => {
  assert.equal(typeof indexedDB, 'undefined');
  assert.equal(await ttsCacheGet('ru:normal:Окно'), null);
  await ttsCachePut('ru:normal:Окно', 'data:audio/wav;base64,AAAA');
  assert.equal(await ttsCacheCount(), 0);
  await ttsCacheClear();
  assert.equal(await ttsCacheGet('ru:normal:Окно'), null);
});
