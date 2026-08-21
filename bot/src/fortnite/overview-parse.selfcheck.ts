import { parseBattleStars, parseBrOverview, parseStwOverview } from '@/fortnite/overview';
import type { ProfileItem, QueryProfile } from '@/fortnite/mcp';

function profile(items: Record<string, ProfileItem>, attrs: Record<string, unknown>, profileId: QueryProfile['profileId']): QueryProfile {
  return {
    profileRevision: 1,
    profileChangesBaseRevision: 1,
    profileChanges: [{ profile: { items, stats: { attributes: attrs } } }],
    profileId
  };
}

const athena = profile(
  { a: { templateId: 'Token:BattleStar', attributes: {}, quantity: 12 } },
  { accountLevel: 210, season_num: 42, book_level: 80, book_purchased: true, mfa_reward_claimed: true },
  'athena'
) as QueryProfile<'athena'>;

const br = parseBrOverview(athena);
if (br.accountLevel !== 210) throw new Error('accountLevel');
if (br.seasonNumber !== 42) throw new Error('season');
if (br.battlePassLevel !== 80) throw new Error('bp');
if (!br.battlePassOwned) throw new Error('owned');
if (parseBattleStars(athena.profileChanges[0]!.profile.items) !== 12) throw new Error('stars');

const campaign = profile(
  { x: { templateId: 'Token:campaignaccess', attributes: {}, quantity: 1 } },
  { level: 10, rewards_claimed_post_max_level: 5, matches_played: 3, mfa_reward_claimed: false },
  'campaign'
) as QueryProfile<'campaign'>;
const core = profile(
  { y: { templateId: 'Token:campaignaccess', attributes: {}, quantity: 1 } },
  {},
  'common_core'
) as QueryProfile<'common_core'>;
const stw = parseStwOverview(campaign, core);
if (stw.accountLevel !== 15) throw new Error('stw level');
if (!stw.hasCampaignAccess) throw new Error('access');

process.stdout.write('overview-parse.selfcheck ok\n');
