import { strict as assert } from 'node:assert';
import {
  aggregateCheatCodeResults,
  emptyCheatCodeSummary,
  isLobbyHackUnavailable,
  LOBBY_HACK_CODES,
  normalizeLobbyHackCode
} from './cheat-codes';

assert.equal(normalizeLobbyHackCode(' GottaGoFast '), 'GottaGoFast');
assert.equal(
  isLobbyHackUnavailable({
    errorCode: 'errors.com.epicgames.fortnite.terminal_command_failure',
    errorMessage: 'command not currently available',
    numericErrorCode: 16206,
    messageVars: []
  }),
  false
);
assert.equal(
  isLobbyHackUnavailable({
    errorCode: 'errors.com.epicgames.modules.profiles.invalid_command',
    errorMessage: 'ExecuteTerminalCommand is not valid'
  }),
  true
);
assert.equal(isLobbyHackUnavailable({ errorCode: 'errors.com.epicgames.bad_request' }), false);

assert.equal(LOBBY_HACK_CODES.includes('LetsBlockAndRoll' as never), false);
assert.equal(LOBBY_HACK_CODES.includes('DontBlockMe' as never), false);
assert.ok(LOBBY_HACK_CODES.includes('GottaGoFast'));
assert.ok(LOBBY_HACK_CODES.includes('OverrideXP'));
assert.equal(new Set(LOBBY_HACK_CODES).size, LOBBY_HACK_CODES.length);

const empty = emptyCheatCodeSummary();
assert.equal(empty.redeemed, 0);
assert.equal(empty.skipped, 0);
assert.equal(empty.failed, 0);
assert.equal(empty.unavailable, false);
assert.deepEqual(empty.results, []);

const pending = aggregateCheatCodeResults([{ code: 'GottaGoFast', status: 'redeemed' }]);
assert.equal(pending.redeemed, 1);
assert.equal(pending.skipped, 0);
assert.equal(pending.failed, 0);

const used = aggregateCheatCodeResults([{ code: 'Play4All', status: 'skipped', errorCode: 'already_used' }]);
assert.equal(used.skipped, 1);
assert.equal(used.redeemed, 0);

const mixed = aggregateCheatCodeResults(
  [
    { code: 'Play4All', status: 'redeemed' },
    { code: 'GottaGoFast', status: 'skipped' },
    { code: 'OverrideXP', status: 'failed' }
  ],
  false
);
assert.equal(mixed.redeemed, 1);
assert.equal(mixed.skipped, 1);
assert.equal(mixed.failed, 1);
assert.equal(mixed.unavailable, false);

const down = aggregateCheatCodeResults(
  LOBBY_HACK_CODES.map((code) => ({ code, status: 'failed' as const })),
  true
);
assert.equal(down.unavailable, true);
assert.equal(down.failed, LOBBY_HACK_CODES.length);

console.log(`cheat-codes self-check passed (${LOBBY_HACK_CODES.length} codes)`);
