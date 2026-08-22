import type { AccountData } from '@/fortnite/clients';
import type { ProfileItem, QueryProfile } from '@/fortnite/mcp';

export type BrOverview = {
  accountLevel: number;
  seasonNumber: number;
  battlePassLevel: number;
  battlePassOwned: boolean;
  mfaClaimed: boolean;
};

export type StwOverview = {
  accountLevel: number;
  matchesPlayed: number;
  mfaClaimed: boolean;
  hasCampaignAccess: boolean;
};

export type AccountOverview = {
  br: BrOverview;
  stw: StwOverview | null;
  mtxPlatform: string;
  mfaEnabled: boolean;
};

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

export function parseBrOverview(athena: QueryProfile<'athena'>): BrOverview {
  const attrs = athena.profileChanges[0]!.profile.stats.attributes;
  return {
    accountLevel: Number(attrs.accountLevel ?? attrs.level ?? 0),
    seasonNumber: Number(attrs.season_num ?? 0),
    battlePassLevel: Number(attrs.book_level ?? 0),
    battlePassOwned: !!attrs.book_purchased,
    mfaClaimed: !!attrs.mfa_reward_claimed
  };
}

export function parseStwOverview(
  campaign: QueryProfile<'campaign'>,
  commonCore: QueryProfile<'common_core'> | null
): StwOverview {
  const attrs = campaign.profileChanges[0]!.profile.stats.attributes;
  const hasCampaignAccess = commonCore
    ? Object.values(commonCore.profileChanges[0]!.profile.items).some((i) =>
        i.templateId.toLowerCase().includes('campaignaccess')
      )
    : true;

  return {
    accountLevel: Number(attrs.level ?? 0) + Number(attrs.rewards_claimed_post_max_level ?? 0),
    matchesPlayed: Number(attrs.matches_played ?? 0),
    mfaClaimed: !!attrs.mfa_reward_claimed,
    hasCampaignAccess
  };
}

export async function fetchAccountOverview(account: AccountData): Promise<AccountOverview> {
  const { queryProfile } = await import('@/fortnite/mcp');
  const [athena, campaign, commonCore] = await Promise.all([
    queryProfile(account, 'athena'),
    queryProfile(account, 'campaign').catch(() => null),
    queryProfile(account, 'common_core')
  ]);
  const coreAttrs = commonCore.profileChanges[0]!.profile.stats.attributes;
  return {
    br: parseBrOverview(athena),
    stw: campaign ? parseStwOverview(campaign, commonCore) : null,
    mtxPlatform: String(coreAttrs.current_mtx_platform ?? 'EpicPC'),
    mfaEnabled: !!coreAttrs.mfa_enabled
  };
}
