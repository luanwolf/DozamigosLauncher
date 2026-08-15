import { strict as assert } from 'node:assert';
import { isWorldInfoPayload } from './world-info-validate';

assert.equal(isWorldInfoPayload({ theaters: [], missions: [] }), true);
assert.equal(isWorldInfoPayload({ foo: 1 }), false);
assert.equal(isWorldInfoPayload(null), false);

console.log('world-info-files selfcheck ok');
