import assert from 'node:assert/strict';
import { findSeasonNews, formatSeasonNameFromNews } from './fortnite-season';

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

console.log('fortnite-season.selfcheck: ok');
