import assert from 'node:assert/strict';
import {
  isFreeGameRedeemed,
  markFreeGamesRedeemed,
  redeemedFreeGameIds
} from './free-games-owned.ts';

redeemedFreeGameIds.set(new Set());

const game = { id: 'offer-1', title: 'Cool Game' };

assert.equal(isFreeGameRedeemed(game, []), false);
assert.equal(isFreeGameRedeemed(game, [{ id: 'other', title: 'Nope' }]), false);
assert.equal(isFreeGameRedeemed(game, [{ id: 'offer-1', title: 'Cool Game' }]), true);
assert.equal(isFreeGameRedeemed(game, [{ id: 'x', title: '  Cool   Game ' }]), true);

markFreeGamesRedeemed(['offer-2']);
assert.equal(isFreeGameRedeemed({ id: 'offer-2', title: 'Other' }, []), true);

console.log('free-games-owned.selfcheck: ok');
