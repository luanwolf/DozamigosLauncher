import {
  campaignFortFromItems,
  campaignPowerLevel,
  type FortStats
} from '$lib/modules/stw-power-level';
import type { FullQueryProfile, ProfileItem } from '$types/game/mcp';

export type BrOverview = {
  accountLevel: number;
  seasonNumber: number;
  battlePassLevel: number;
  battlePassOwned: boolean;
  restedXp: number;
  restedXpMult: number;
  battleStars: number;
  gold: number;
  lastMatchEnd: string | null;
  mfaClaimed: boolean;
};

export type StwOverview = {
  powerLevel: number;
  accountLevel: number;
  matchesPlayed: number;
  collectionBookLevel: number;
  unslotCost: number;
  backpackSize: number;
  storageSize: number;
  researchPoints: number;
  researchLevels: { fortitude: number; resistance: number; offense: number; technology: number };
  fort: FortStats;
  stormShields: Record<string, number>;
  endurance: Record<string, string | null>;
  tutorialCompleted: boolean;
  mfaClaimed: boolean;
  hasCampaignAccess: boolean;
};

const SSD_NAMES = ['Stonewood', 'Plankerton', 'Canny Valley', 'Twine Peaks'] as const;

function itemQty(items: Record<string, ProfileItem>, templateId: string): number {
  for (const item of Object.values(items)) {
    if (item.templateId === templateId) return item.quantity ?? 0;
  }
  return 0;
}

function sumMatching(items: Record<string, ProfileItem>, includes: string): number {
  let total = 0;
  const needle = includes.toLowerCase();
  for (const item of Object.values(items)) {
    if (item.templateId.toLowerCase().includes(needle)) total += item.quantity ?? 0;
  }
  return total;
}

export function parseBattleStars(athenaItems: Record<string, ProfileItem>): number {
  return sumMatching(athenaItems, 'battlestar');
}

export function parseGold(campaignItems: Record<string, ProfileItem>): number {
  return sumMatching(campaignItems, 'eventcurrency_scaling');
}

export function parseBrOverview(
  athena: FullQueryProfile<'athena'>,
  campaign: FullQueryProfile<'campaign'> | null
): BrOverview {
  const attrs = athena.profileChanges[0].profile.stats.attributes;
  const athenaItems = athena.profileChanges[0].profile.items;
  const campaignItems = campaign?.profileChanges[0].profile.items ?? {};

  return {
    accountLevel: attrs.accountLevel ?? attrs.level ?? 0,
    seasonNumber: attrs.season_num ?? 0,
    battlePassLevel: attrs.book_level ?? 0,
    battlePassOwned: !!attrs.book_purchased,
    restedXp: attrs.rested_xp ?? 0,
    restedXpMult: attrs.rested_xp_mult ?? 1,
    battleStars: parseBattleStars(athenaItems),
    gold: parseGold(campaignItems),
    lastMatchEnd: attrs.last_match_end_datetime || null,
    mfaClaimed: !!attrs.mfa_reward_claimed
  };
}

export function parseCompletedStormShields(items: Record<string, ProfileItem>): Record<string, number> {
  const shields: Record<string, number> = {
    Stonewood: 0,
    Plankerton: 0,
    'Canny Valley': 0,
    'Twine Peaks': 0
  };

  for (const item of Object.values(items)) {
    const id = item.templateId.toLowerCase();
    if (!id.includes('quest:outpostquest_t')) continue;
    if (item.attributes?.quest_state !== 'Claimed') continue;

    const split = item.templateId.split('_');
    const theaterToken = (split[split.length - 2] ?? '').replace(/t/gi, '');
    const levelToken = (split[split.length - 1] ?? '').replace(/l/gi, '');
    const ssdNum = (Number.parseInt(theaterToken, 10) || 1) - 1;
    const ssdQuan = Number.parseInt(levelToken, 10) || 0;
    const name = SSD_NAMES[ssdNum];
    if (!name) continue;
    if ((shields[name] ?? 0) < ssdQuan) shields[name] = ssdQuan;
  }

  return shields;
}

export function parseEnduranceCompletions(
  items: Record<string, ProfileItem>
): Record<string, string | null> {
  const completions: Record<string, string | null> = {
    Stonewood: null,
    Plankerton: null,
    'Canny Valley': null,
    'Twine Peaks': null
  };

  for (const item of Object.values(items)) {
    const id = item.templateId.toLowerCase();
    if (!id.includes('quest:endurancewave30theater')) continue;
    const theaterIdx = Number.parseInt(item.templateId.slice(-1), 10) || 1;
    const name = SSD_NAMES[theaterIdx - 1];
    if (!name) continue;
    completions[name] = (item.attributes?.last_state_change_time as string) || null;
  }

  return completions;
}

export function parseStwOverview(
  campaign: FullQueryProfile<'campaign'>,
  commonCore: FullQueryProfile<'common_core'> | null
): StwOverview {
  const profile = campaign.profileChanges[0].profile;
  const attrs = profile.stats.attributes;
  const items = profile.items;
  const mfaClaimed = !!attrs.mfa_reward_claimed;
  const backpackNode = itemQty(items, 'HomebaseNode:skilltree_backpacksize');
  const storageNode = itemQty(items, 'HomebaseNode:skilltree_stormshieldstorage');
  const research = attrs.research_levels ?? {};

  const hasCampaignAccess = commonCore
    ? Object.values(commonCore.profileChanges[0].profile.items).some((i) =>
        i.templateId.toLowerCase().includes('campaignaccess')
      )
    : true;

  return {
    powerLevel: campaignPowerLevel(items),
    accountLevel: (attrs.level ?? 0) + (attrs.rewards_claimed_post_max_level ?? 0),
    matchesPlayed: attrs.matches_played ?? 0,
    collectionBookLevel: attrs.collection_book?.maxBookXpLevelAchieved ?? 0,
    unslotCost: attrs.unslot_mtx_spend ?? 0,
    backpackSize: 50 + backpackNode * 20 + (mfaClaimed ? 10 : 0),
    storageSize: storageNode * 20,
    researchPoints: itemQty(items, 'Token:collectionresource_nodegatetoken01'),
    researchLevels: {
      fortitude: research.fortitude ?? 0,
      resistance: research.resistance ?? 0,
      offense: research.offense ?? 0,
      technology: research.technology ?? 0
    },
    fort: campaignFortFromItems(items),
    stormShields: parseCompletedStormShields(items),
    endurance: parseEnduranceCompletions(items),
    tutorialCompleted: Object.values(items).some(
      (i) =>
        i.templateId.toLowerCase().includes('quest:homebaseonboarding') &&
        (i.attributes?.quest_state === 'Claimed' || i.attributes?.quest_state === 'Completed')
    ),
    mfaClaimed,
    hasCampaignAccess
  };
}
