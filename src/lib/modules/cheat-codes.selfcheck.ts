import { strict as assert } from 'node:assert';
import {
  aggregateCheatCodeResults,
  classifyLobbyHackError,
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

assert.deepEqual(
  classifyLobbyHackError({
    errorCode: 'errors.com.epicgames.fortnite.terminal_command_failure',
    errorMessage: 'command not currently available'
  }),
  { status: 'failed', reason: 'unavailable' }
);
assert.deepEqual(
  classifyLobbyHackError({
    errorCode: 'errors.com.epicgames.fortnite.terminal_command_failure',
    errorMessage: 'errors.com.epicgames.fortnite.terminal_command_failure',
    messageVars: ['Lobby Hack not currently available']
  }),
  { status: 'failed', reason: 'unavailable' }
);
assert.deepEqual(
  classifyLobbyHackError({
    errorCode: 'errors.com.epicgames.fortnite.terminal_command_failure',
    errorMessage: 'Lobby Hack already used.'
  }),
  { status: 'skipped', reason: 'used' }
);
assert.deepEqual(
  classifyLobbyHackError({
    errorCode: 'errors.com.epicgames.fortnite.terminal_command_failure',
    errorMessage: 'Unknown Lobby Hack. Try something else.'
  }),
  { status: 'failed', reason: 'unknown' }
);
assert.deepEqual(
  classifyLobbyHackError({
    errorCode: 'errors.com.epicgames.fortnite.terminal_command_failure',
    errorMessage: 'Still cooling off. You\'ll live.'
  }),
  { status: 'failed', reason: 'cooldown' }
);
assert.deepEqual(
  classifyLobbyHackError({
    errorCode: 'errors.com.epicgames.fortnite.terminal_command_failure',
    errorMessage: 'errors.com.epicgames.fortnite.terminal_command_failure',
    messageVars: ['The island has questions about your choices.']
  }),
  { status: 'failed', reason: 'unknown' }
);
assert.deepEqual(
  classifyLobbyHackError({
    errorCode: 'errors.com.epicgames.common.server_error',
    errorMessage: 'upstream timed out'
  }),
  { status: 'failed', reason: 'rejected', detail: 'upstream timed out' }
);

assert.equal(LOBBY_HACK_CODES.includes('LetsBlockAndRoll' as never), false);
assert.equal(LOBBY_HACK_CODES.includes('DontBlockMe' as never), false);
assert.ok(LOBBY_HACK_CODES.includes('GottaGoFast'));
assert.ok(LOBBY_HACK_CODES.includes('OverrideXP'));
assert.ok(LOBBY_HACK_CODES.includes('JonesyIsGolden'));
assert.ok(LOBBY_HACK_CODES.includes('GatherAndCraft'));
assert.ok(LOBBY_HACK_CODES.includes('INVALIDCHEAT'));
assert.ok(LOBBY_HACK_CODES.includes('ChatWhereDoYouFindTheKey'));
assert.ok(LOBBY_HACK_CODES.includes('YourThoughtsAreMine'));
assert.ok(LOBBY_HACK_CODES.includes('MagicIsReal'));
assert.ok(LOBBY_HACK_CODES.includes('WhoCrackedTheCode'));
assert.ok(LOBBY_HACK_CODES.includes('9Years'));
assert.ok(LOBBY_HACK_CODES.includes('WeAreTheWorldChampionsToday'));
assert.ok(LOBBY_HACK_CODES.includes('BoneRattler'));
assert.ok(LOBBY_HACK_CODES.includes('AlmostScaringSeason'));
assert.ok(LOBBY_HACK_CODES.includes('IThinkTheKeyFoundMeChat'));
assert.ok(LOBBY_HACK_CODES.includes('DustySprites'));
assert.ok(LOBBY_HACK_CODES.includes('ImTheRealEdgelord'));
assert.ok(LOBBY_HACK_CODES.includes('runSystemOverride'));
assert.ok(LOBBY_HACK_CODES.includes('NoProLlama'));
assert.equal(LOBBY_HACK_CODES.includes('S7H-50P-R03' as never), false);
assert.ok(LOBBY_HACK_CODES.includes('PlayToLevelUp'));
assert.ok(LOBBY_HACK_CODES.includes('ChatFindMeAnotherCode'));
assert.ok(LOBBY_HACK_CODES.includes('BLINKYINKYPINKYCLYDE'));
assert.equal(LOBBY_HACK_CODES.includes('InsertCoinToContinue' as never), false);
assert.equal(LOBBY_HACK_CODES.includes('NOPROLLAMA' as never), false);
assert.equal(LOBBY_HACK_CODES.includes('BRB' as never), false);
assert.equal(LOBBY_HACK_CODES.includes('PowerOut' as never), false);
assert.equal(LOBBY_HACK_CODES.includes('CrowsAreAfraid' as never), false);
assert.equal(LOBBY_HACK_CODES.includes('PumpkinSpiceLife' as never), false);
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
