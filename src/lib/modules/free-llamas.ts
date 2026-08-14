import { composeMCP } from '$lib/modules/mcp';
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

export async function claimCardPacks(account: AccountData, cardPackItemIds: string[]): Promise<number> {
  if (!cardPackItemIds.length) return 0;
  await composeMCP(account, 'OpenCardPackBatch', 'campaign', { cardPackItemIds });
  return cardPackItemIds.length;
}
