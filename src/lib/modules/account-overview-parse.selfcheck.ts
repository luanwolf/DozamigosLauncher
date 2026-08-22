import assert from 'node:assert/strict';
import {
  parseBattleStars,
  parseBrOverview,
  parseCompletedStormShields,
  parseGold,
  parseStwOverview
} from './account-overview-parse';
import type { FullQueryProfile, ProfileItem } from '$types/game/mcp';

const athenaItems = {
  stars: { templateId: 'AccountResource:AthenaBattleStar', quantity: 42, attributes: {} }
} as Record<string, ProfileItem>;
assert.equal(parseBattleStars(athenaItems), 42);

const campaignItems = {
  gold: { templateId: 'AccountResource:eventcurrency_scaling', quantity: 1500, attributes: {} },
  ssd: {
    templateId: 'Quest:outpostquest_t1_l5',
    quantity: 1,
    attributes: { quest_state: 'Claimed' }
  },
  endu: {
    templateId: 'Quest:endurancewave30theater1',
    quantity: 1,
    attributes: { last_state_change_time: '2024-01-02T00:00:00Z' }
  },
  pack: { templateId: 'HomebaseNode:skilltree_backpacksize', quantity: 2, attributes: {} },
  store: { templateId: 'HomebaseNode:skilltree_stormshieldstorage', quantity: 3, attributes: {} },
  rp: { templateId: 'Token:collectionresource_nodegatetoken01', quantity: 99, attributes: {} },
  fort: { templateId: 'Stat:fortitude', quantity: 30, attributes: {} },
  res: { templateId: 'Stat:resistance', quantity: 20, attributes: {} },
  off: { templateId: 'Stat:offense', quantity: 25, attributes: {} },
  tech: { templateId: 'Stat:technology', quantity: 15, attributes: {} }
} as Record<string, ProfileItem>;

assert.equal(parseGold(campaignItems), 1500);
assert.equal(parseCompletedStormShields(campaignItems).Stonewood, 5);
assert.equal(parseCompletedStormShields(campaignItems)['Twine Peaks'], 0);

const athena = {
  profileChanges: [
    {
      changeType: 'fullProfileUpdate',
      profile: {
        items: athenaItems,
        stats: {
          attributes: {
            accountLevel: 400,
            season_num: 36,
            book_level: 80,
            book_purchased: true,
            rested_xp: 50000,
            rested_xp_mult: 2,
            last_match_end_datetime: '2024-06-01T12:00:00Z',
            mfa_reward_claimed: false
          }
        }
      }
    }
  ]
} as unknown as FullQueryProfile<'athena'>;

const campaign = {
  profileChanges: [
    {
      changeType: 'fullProfileUpdate',
      profile: {
        items: campaignItems,
        stats: {
          attributes: {
            level: 100,
            rewards_claimed_post_max_level: 20,
            matches_played: 300,
            collection_book: { maxBookXpLevelAchieved: 50 },
            unslot_mtx_spend: 50,
            research_levels: { fortitude: 10, resistance: 9, offense: 8, technology: 7 },
            mfa_reward_claimed: true
          }
        }
      }
    }
  ]
} as unknown as FullQueryProfile<'campaign'>;

const br = parseBrOverview(athena, campaign);
assert.equal(br.accountLevel, 400);
assert.equal(br.battlePassLevel, 80);
assert.equal(br.battleStars, 42);
assert.equal(br.gold, 1500);

const stw = parseStwOverview(campaign, null);
assert.equal(stw.accountLevel, 120);
assert.equal(stw.backpackSize, 100); // 50 + 2*20 + 10 mfa
assert.equal(stw.storageSize, 60);
assert.equal(stw.researchPoints, 99);
assert.equal(stw.stormShields.Stonewood, 5);
assert.equal(stw.endurance.Stonewood, '2024-01-02T00:00:00Z');
assert.ok(stw.powerLevel > 1);

console.log('account-overview-parse self-check passed');
