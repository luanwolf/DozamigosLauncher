import assert from 'node:assert/strict';
import { findSeasonNews, formatSeasonNameFromNews, parsePublicSeasonResponse } from './fortnite-season';

// Live MOTD list: the promoted broadcast outranks the season announcement.
const news = [
  { title: 'Ao vivo - UE - FNCS Última Chance', image: 'fncs.jpg' },
  { title: 'Fortnite: No Corre Chegou!', image: 'season.jpg' },
  { title: 'Garanta a Vitória com Elementais!', image: 'elementals.jpg' }
];

const season = findSeasonNews(news);
assert.equal(season?.image, 'season.jpg');
assert.equal(formatSeasonNameFromNews(season!.title), 'No Corre');

assert.equal(formatSeasonNameFromNews('Fortnite: Demon Rush is Here!'), 'Demon Rush');
// A headline that only says "Fortnite:" must not pass as a season name.
assert.equal(findSeasonNews([{ title: 'Fortnite: ' }]), null);
assert.equal(findSeasonNews([{ title: 'Baba Yaga Entra em Cena' }]), null);

const publicSeason = parsePublicSeasonResponse(
  {
    seasonDateBegin: '2026-05-30T13:00:00Z',
    seasonDateEnd: '2026-08-21T13:00:00Z',
    seasonNumber: 41
  },
  'No Corre'
);
assert.equal(publicSeason?.name, 'No Corre');
assert.equal(publicSeason?.seasonNumber, 41);
assert.equal(publicSeason?.hasTimeline, true);
assert.equal(parsePublicSeasonResponse({ seasonDateBegin: '', seasonDateEnd: '', seasonNumber: 0 }), null);

console.log('fortnite-season.selfcheck: ok');
