import assert from 'node:assert/strict';
import { msUntilNextUtcHour, parseServerTimeMs, shouldRunHourlyClaim, utcHourBucket } from './epic-server-time';

const noonUtc = Date.UTC(2026, 7, 15, 12, 0, 0);
assert.equal(utcHourBucket(noonUtc), '2026-08-15T12');
assert.equal(utcHourBucket(Date.UTC(2026, 7, 15, 0, 59, 59)), '2026-08-15T00');

assert.equal(parseServerTimeMs('2026-08-15T12:00:00.000Z'), noonUtc);
assert.equal(parseServerTimeMs('not-a-date'), null);

// 12:30 UTC → next hour is 13:00 + 5s buffer = 30m5s
assert.equal(msUntilNextUtcHour(Date.UTC(2026, 7, 15, 12, 30, 0), 5_000), 30 * 60_000 + 5_000);

// Exactly on the hour → schedule the *next* hour (not immediate), plus buffer
assert.equal(msUntilNextUtcHour(Date.UTC(2026, 7, 15, 0, 0, 0), 5_000), 60 * 60_000 + 5_000);

assert.equal(shouldRunHourlyClaim(null, '2026-08-15T00'), true);
assert.equal(shouldRunHourlyClaim('2026-08-15T00', '2026-08-15T00'), false);
assert.equal(shouldRunHourlyClaim('2026-08-15T00', '2026-08-15T01'), true);

// Local PC clock being wrong must not change the server-derived delay.
const wrongLocal = Date.UTC(2099, 0, 1);
void wrongLocal;
assert.equal(msUntilNextUtcHour(Date.UTC(2026, 7, 15, 23, 59, 0), 0), 60_000);

console.log('epic-server-time.selfcheck: ok');
