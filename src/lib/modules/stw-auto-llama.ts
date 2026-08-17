import { openCardPacks, type CardPackOffer } from '$lib/modules/free-llamas';
import { composeMCP } from '$lib/modules/mcp';
import type { AccountData } from '$types/account';
import type { FullQueryProfile } from '$types/game/mcp';
import type { GrantedItem } from '$lib/utils/mcp-loot';

export type LlamaClaimResult = {
  opened: number;
  received: GrantedItem[];
};

export async function populatePrerollProfile(account: AccountData) {
  return composeMCP<FullQueryProfile<'campaign'>>(account, 'PopulatePrerolledOffers', 'campaign', {});
}

/** Opens only card packs already granted for free. Never purchases store offers. */
export async function claimFreeLlamas(account: AccountData): Promise<LlamaClaimResult> {
  const populate = await populatePrerollProfile(account);
  const profile = populate.profileChanges[0].profile;
  const freePacks: CardPackOffer[] = Object.entries(profile.items)
    .filter(([, item]) => item.templateId.startsWith('CardPack:'))
    .map(([id, item]) => ({ id, templateId: item.templateId }));

  if (!freePacks.length) return { opened: 0, received: [] };

  return {
    opened: freePacks.length,
    received: await openCardPacks(
      account,
      freePacks.map((pack) => pack.id)
    )
  };
}
