import { strict as assert } from 'node:assert';
import { findNewSteamFreeAppIds } from './steam-free-games-notify';

assert.deepEqual(findNewSteamFreeAppIds(['1', '2'], null), []);
assert.deepEqual(findNewSteamFreeAppIds(['1', '2'], ['1', '2']), []);
assert.deepEqual(findNewSteamFreeAppIds(['1', '2', '3'], ['1', '2']), ['3']);
assert.deepEqual(findNewSteamFreeAppIds(['3'], ['1', '2']), ['3']);
assert.deepEqual(findNewSteamFreeAppIds([], ['1']), []);

// eslint-disable-next-line no-console
console.log('steam-free-games-notify selfcheck ok');
