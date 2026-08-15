import { composeMCP } from '$lib/modules/mcp';
import { extractGrantedItems, type GrantedItem } from '$lib/utils/mcp-loot';
import type { AccountData } from '$types/account';
import type { FullQueryProfile } from '$types/game/mcp';

export type CardPackOffer = {
  id: string;
  templateId: string;
};

export async function fetchAvailableCardPacks(account: AccountData): Promise<CardPackOffer[]> {
  const populateResult = await composeMCP<FullQueryProfile<'campaign'>>(
    account,
    'PopulatePrerolledOffers',
    'campaign',
    {}
  );

  const profile = populateResult.profileChanges[0].profile;

  return Object.entries(profile.items)
    .filter(([, item]) => item.templateId.startsWith('CardPack:'))
    .map(([id, item]) => ({ id, templateId: item.templateId }));
}

/** Opens card packs and returns what came out of them. */
export async function openCardPacks(account: AccountData, cardPackItemIds: string[]): Promise<GrantedItem[]> {
  if (!cardPackItemIds.length) return [];
  return extractGrantedItems(await composeMCP(account, 'OpenCardPackBatch', 'campaign', { cardPackItemIds }));
}
