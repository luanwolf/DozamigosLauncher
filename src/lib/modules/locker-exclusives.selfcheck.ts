import assert from 'node:assert/strict';
import { isLockerExclusiveId, LOCKER_EXCLUSIVE_IDS } from './locker-exclusives';

assert.ok(LOCKER_EXCLUSIVE_IDS.size > 50);
assert.equal(isLockerExclusiveId('CID_095_Athena_Commando_M_Founder'), true);
assert.equal(isLockerExclusiveId('cid_001_athena_commando_f_default'), false);

console.log(`locker-exclusives self-check passed (${LOCKER_EXCLUSIVE_IDS.size} ids)`);
