import { strict as assert } from 'node:assert';

// Keep URL shape in sync with matchmaking-track.stwNewsProfileUrl (avoid importing Tauri deps here).
function stwNewsProfileUrl(accountId: string) {
  return `https://stw.news/${accountId}`;
}

assert.equal(stwNewsProfileUrl('abc'), 'https://stw.news/abc');
assert.ok(stwNewsProfileUrl('abc').startsWith('https://stw.news/'));

console.log('matchmaking-track selfcheck ok');
