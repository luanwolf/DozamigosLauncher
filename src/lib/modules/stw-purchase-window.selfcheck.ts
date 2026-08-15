import assert from 'node:assert/strict';
import { exhaustedUntil, pruneExhausted } from './stw-purchase-window';

const now = Date.UTC(2026, 7, 15, 16, 42);
const nextUtcMidnight = Date.UTC(2026, 7, 16);
const rotation = new Date(now + 20 * 60 * 1000).toISOString();

// Free daily llama: must stay hidden past the 20-minute llama rotation, up to the UTC reset.
assert.equal(exhaustedUntil('daily', rotation, now), nextUtcMidnight);

// Weekly/event offers rotate with the catalog, so the rotation end is the right window.
assert.equal(exhaustedUntil('weekly', rotation, now), now + 20 * 60 * 1000);
assert.equal(exhaustedUntil('none', 'not-a-date', now), 0);

// A daily marker written just before midnight still lands on the next reset, not the past.
assert.ok(exhaustedUntil('daily', 'not-a-date', Date.UTC(2026, 7, 15, 23, 59)) > Date.UTC(2026, 7, 15, 23, 59));

assert.deepEqual(pruneExhausted({ keep: now + 1000, drop: now - 1000 }, now), { keep: now + 1000 });
assert.deepEqual(pruneExhausted({ expiration: '2026-08-15', ids: ['a'] }, now), {});
assert.deepEqual(pruneExhausted(null, now), {});

console.log('stw-purchase-window.selfcheck: ok');
