import { language } from '$lib/i18n';
import { get } from 'svelte/store';
import { parseStwResources, type StwResourceRow } from '$lib/modules/stw-resources-parse';
import { queryProfile } from '$lib/modules/mcp';
import type { AccountData } from '$types/account';

export type { StwResourceRow };

export async function fetchStwResources(account: AccountData): Promise<{
  powerLevel: number;
  resources: StwResourceRow[];
}> {
  const { campaignPowerLevel } = await import('$lib/modules/stw-power-level');
  const campaign = await queryProfile(account, 'campaign');
  const items = campaign.profileChanges[0].profile.items;
  return {
    powerLevel: campaignPowerLevel(items),
    resources: parseStwResources(campaign, get(language))
  };
}
