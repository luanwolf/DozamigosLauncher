import assert from 'node:assert/strict';
import { createCache } from './data-cache.svelte.ts';

let calls = 0;
let fail = false;

const cache = createCache<string, string>(
  (key) => key,
  async (key) => {
    calls += 1;
    if (fail) throw new Error('boom');
    return `${key}-${calls}`;
  }
);

// First load fills the entry; a second ensure reuses it instead of refetching.
assert.equal(await cache.ensure('a'), 'a-1');
assert.equal(await cache.ensure('a'), 'a-1');
assert.equal(calls, 1);
assert.equal(cache.get('a').loading, false);

// Concurrent ensures for the same key share a single request.
const [first, second] = await Promise.all([cache.ensure('b'), cache.ensure('b')]);
assert.equal(first, second);
assert.equal(calls, 2);

// Different keys (accounts/locales) are cached independently.
assert.equal(cache.get('a').data, 'a-1');

// force refetches even when cached.
assert.equal(await cache.ensure('a', { force: true }), 'a-3');
assert.equal(calls, 3);

// A failed refresh keeps the previous data on screen and exposes the error.
fail = true;
assert.equal(await cache.refresh('a'), null);
assert.equal(cache.get('a').data, 'a-3');
assert.ok(cache.get('a').error);
assert.equal(cache.get('a').refreshing, false);

// Retry after the failure clears the error.
fail = false;
assert.equal(await cache.refresh('a'), 'a-5');
assert.equal(cache.get('a').error, null);

// Unknown keys read as empty, never undefined.
assert.deepEqual(cache.get('missing'), { data: null, loading: false, refreshing: false, error: null });
assert.equal(await cache.ensure(null), null);

cache.clear('a');
assert.equal(cache.get('a').data, null);

console.log('data-cache.selfcheck: ok');
