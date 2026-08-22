import type { AccountData } from '@/fortnite/clients';
import { queryProfile } from '@/fortnite/mcp';

const MTX_PREFIX = 'Currency:Mtx';

export type VbucksBreakdown = {
  purchased: number;
  earned: number;
  other: number;
  total: number;
  platform: string;
};

export async function fetchVbucks(account: AccountData): Promise<VbucksBreakdown> {
  const profile = await queryProfile(account, 'common_core');
  const attrs = profile.profileChanges[0]!.profile.stats.attributes;
  let purchased = 0;
  let earned = 0;
  let other = 0;
  for (const item of Object.values(profile.profileChanges[0]!.profile.items)) {
    if (!item.templateId.startsWith(MTX_PREFIX) || item.templateId.includes('Debt')) continue;
    const qty = Math.max(0, item.quantity ?? 0);
    if (item.templateId === 'Currency:MtxPurchased') purchased += qty;
    else if (item.templateId === 'Currency:MtxEarned') earned += qty;
    else other += qty;
  }
  return {
    purchased,
    earned,
    other,
    total: purchased + earned + other,
    platform: String(attrs.current_mtx_platform ?? 'EpicPC')
  };
}
