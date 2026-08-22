import { composeMCP, queryProfile } from '$lib/modules/mcp';
import type { AccountData } from '$types/account';
import type { FullQueryProfile } from '$types/game/mcp';

export type MfaClaimTarget = 'br' | 'stw';

export type MfaClaimStatus = {
  mfaEnabled: boolean;
  brClaimed: boolean;
  stwClaimed: boolean;
  hasCampaignAccess: boolean;
};

export async function fetchMfaClaimStatus(account: AccountData): Promise<MfaClaimStatus> {
  const [athena, campaign, commonCore] = await Promise.all([
    queryProfile(account, 'athena'),
    queryProfile(account, 'campaign').catch(() => null),
    queryProfile(account, 'common_core')
  ]);

  return statusFromProfiles(athena, campaign, commonCore);
}

export function statusFromProfiles(
  athena: FullQueryProfile<'athena'>,
  campaign: FullQueryProfile<'campaign'> | null,
  commonCore: FullQueryProfile<'common_core'>
): MfaClaimStatus {
  const core = commonCore.profileChanges[0].profile;
  const hasCampaignAccess = Object.values(core.items).some((i) =>
    i.templateId.toLowerCase().includes('campaignaccess')
  );

  return {
    mfaEnabled: !!core.stats.attributes.mfa_enabled,
    brClaimed: !!athena.profileChanges[0].profile.stats.attributes.mfa_reward_claimed,
    stwClaimed: !!campaign?.profileChanges[0].profile.stats.attributes.mfa_reward_claimed,
    hasCampaignAccess
  };
}

/**
 * Claims the one-time 2FA reward. Epic bumps profileRevision on success;
 * a no-op / missing 2FA leaves revision unchanged or lower.
 */
export async function claimMfaReward(account: AccountData, target: MfaClaimTarget): Promise<void> {
  const res = await composeMCP<{
    profileRevision: number;
    profileChangesBaseRevision: number;
  }>(account, 'ClaimMfaEnabled', 'common_core', {
    bClaimForStw: target === 'stw'
  });

  if (res.profileRevision < res.profileChangesBaseRevision) {
    throw new Error('MFA_CLAIM_FAILED');
  }
}
