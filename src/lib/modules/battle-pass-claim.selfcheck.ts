import { strict as assert } from 'node:assert';
import {
  findSeasonPassTemplateId,
  isBattleStarPrice,
  isPassStorefrontName,
  parseBattlePassClaimStatus,
  parseBattlePassOffersFromCatalog
} from './battle-pass-claim-parse';

const status = parseBattlePassClaimStatus(
  {
    book_level: 42,
    book_xp: 100,
    book_purchased: true,
    season_num: 41,
    battlestars: 15
  },
  {
    a: { templateId: 'AthenaSeason:athenaseason40' },
    b: { templateId: 'AthenaSeason:athenaseason41' }
  }
);

assert.equal(status.level, 42);
assert.equal(status.xp, 100);
assert.equal(status.purchased, true);
assert.equal(status.seasonNum, 41);
assert.equal(status.battleStars, 15);
assert.equal(status.seasonPassTemplateId, 'AthenaSeason:athenaseason41');

assert.equal(
  findSeasonPassTemplateId({ x: { templateId: 'AthenaSeason:athenaseason39' } }),
  'AthenaSeason:athenaseason39'
);

assert.equal(isBattleStarPrice('GameItem', 'AccountResource:AthenaBattleStar'), true);
assert.equal(isBattleStarPrice('MtxCurrency', ''), false);
assert.equal(isPassStorefrontName('BRSeasonStorefront'), true);
assert.equal(isPassStorefrontName('CardPackStorePreroll'), false);

const offers = parseBattlePassOffersFromCatalog(
  [
    {
      name: 'BRSeasonStorefront',
      catalogEntries: [
        {
          offerId: 'offer-free',
          title: 'Already owned',
          prices: [{ currencyType: 'GameItem', currencySubType: 'AccountResource:AthenaBattleStar', finalPrice: 5 }],
          itemGrants: [{ templateId: 'AthenaCharacter:CID_Owned', quantity: 1 }]
        },
        {
          offerId: 'offer-claim',
          title: 'Claimable',
          prices: [{ currencyType: 'GameItem', currencySubType: 'AccountResource:AthenaBattleStar', finalPrice: 10 }],
          itemGrants: [{ templateId: 'AthenaCharacter:CID_New', quantity: 1 }]
        }
      ]
    }
  ],
  new Set(['athenacharacter:cid_owned'])
);

assert.equal(offers.length, 1);
assert.equal(offers[0]?.offerId, 'offer-claim');
assert.equal(offers[0]?.price, 10);

console.log('battle-pass-claim selfcheck ok');
