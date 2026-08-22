import {
  parseBrOverview,
  parseStwOverview,
  type BrOverview,
  type StwOverview
} from '$lib/modules/account-overview-parse';
import { queryProfile } from '$lib/modules/mcp';
import type { AccountData } from '$types/account';

export type AccountOverview = {
  br: BrOverview;
  stw: StwOverview | null;
  mtxPlatform: string;
  mfaEnabled: boolean;
};

export async function fetchAccountOverview(account: AccountData): Promise<AccountOverview> {
  const [athena, campaign, commonCore] = await Promise.all([
    queryProfile(account, 'athena'),
    queryProfile(account, 'campaign').catch(() => null),
    queryProfile(account, 'common_core')
  ]);

  const coreAttrs = commonCore.profileChanges[0].profile.stats.attributes;

  return {
    br: parseBrOverview(athena, campaign),
    stw: campaign ? parseStwOverview(campaign, commonCore) : null,
    mtxPlatform: coreAttrs.current_mtx_platform ?? 'EpicPC',
    mfaEnabled: !!coreAttrs.mfa_enabled
  };
}

export type { BrOverview, StwOverview };
