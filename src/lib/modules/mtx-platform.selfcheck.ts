import assert from 'node:assert/strict';

/** Keep in sync with MTX_PLATFORMS in mtx-platform.ts — avoids pulling MCP/logger into the check. */
const PLATFORMS = [
  'EpicPC',
  'Epic',
  'EpicPCKorea',
  'PSN',
  'Live',
  'Nintendo',
  'IOSAppStore',
  'EpicAndroid',
  'Samsung',
  'Shared',
  'wegame'
] as const;

assert.ok(PLATFORMS.includes('EpicPC'));
assert.equal(PLATFORMS.includes('Banana' as never), false);

console.log('mtx-platform self-check passed');
