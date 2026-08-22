import { resolveStwTemplateDisplay } from '$lib/utils/stw-template-display';
import type { FullQueryProfile, ProfileItem } from '$types/game/mcp';
import type { Locale } from '$lib/paraglide/runtime';
import type { RarityType } from '$types/game/stw/resources';

export type StwResourceRow = {
  templateId: string;
  resourceId: string;
  name: string;
  quantity: number;
  imageUrl: string;
  rarity: RarityType;
};

export function isOwnedAccountResource(item: ProfileItem): boolean {
  return item.templateId.startsWith('AccountResource:') && (item.quantity ?? 0) > 0;
}

/** Account resources currently held in the campaign profile (qty > 0). */
export function parseStwResources(
  campaign: FullQueryProfile<'campaign'>,
  locale: Locale = 'pt-br'
): StwResourceRow[] {
  const items = campaign.profileChanges[0].profile.items;
  const rows: StwResourceRow[] = [];

  for (const item of Object.values(items)) {
    if (!isOwnedAccountResource(item)) continue;

    const resourceId = item.templateId.slice('AccountResource:'.length);
    const display = resolveStwTemplateDisplay(item.templateId, locale);
    rows.push({
      templateId: item.templateId,
      resourceId,
      name: display.name,
      quantity: item.quantity ?? 0,
      imageUrl: display.imageUrl,
      rarity: display.rarity
    });
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name, locale) || b.quantity - a.quantity);
}
