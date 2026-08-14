import { composeMCP, queryProfile } from '@/core/mcp';
import type { AccountData } from '@/core/types';

export { fetchStwStore } from '@/stw/catalog';

export async function fetchAvailableCardPacks(account: AccountData) {
  const result = await composeMCP<{ profileChanges: { profile: { items: Record<string, { templateId: string }> } }[] }>(
    account,
    'PopulatePrerolledOffers',
    'campaign',
    {}
  );
  const profile = result.profileChanges[0].profile;
  return Object.entries(profile.items)
    .filter(([, item]) => item.templateId.startsWith('CardPack:'))
    .map(([id, item]) => ({ id, templateId: item.templateId }));
}

export async function claimCardPacks(account: AccountData, cardPackItemIds: string[]) {
  if (!cardPackItemIds.length) return 0;
  await composeMCP(account, 'OpenCardPackBatch', 'campaign', { cardPackItemIds });
  return cardPackItemIds.length;
}

export async function getVbucksBalance(account: AccountData) {
  const profile = await queryProfile<{
    profileChanges: { profile: { items: Record<string, { templateId: string; quantity: number }> } }[];
  }>(account, 'common_core');

  const items = Object.values(profile.profileChanges[0].profile.items);
  const mtxItems = items.filter(
    (item) => item.templateId.startsWith('Currency:Mtx') && !item.templateId.includes('Debt')
  );

  const purchased = mtxItems.find((i) => i.templateId === 'Currency:MtxPurchased')?.quantity ?? 0;
  const earned = mtxItems.find((i) => i.templateId === 'Currency:MtxEarned')?.quantity ?? 0;
  const total = mtxItems.reduce((acc, item) => acc + Math.max(0, item.quantity ?? 0), 0);

  return { purchased, earned, total };
}

export async function getDailyQuests(account: AccountData) {
  const profile = await queryProfile<{
    profileChanges: {
      profile: {
        stats: { attributes: { quest_manager?: { dailyQuestRerolls: number } } };
        items: Record<
          string,
          { templateId: string; attributes: { quest_state?: string; completion_progress?: number } }
        >;
      };
    }[];
  }>(account, 'campaign');

  const data = profile.profileChanges[0].profile;
  const rerolls = data.stats.attributes.quest_manager?.dailyQuestRerolls ?? 0;
  const quests = Object.entries(data.items)
    .filter(([, item]) => item.templateId.startsWith('Quest:') && item.attributes.quest_state === 'Active')
    .map(([id, item]) => ({
      id,
      templateId: item.templateId,
      progress: item.attributes.completion_progress ?? 0
    }));

  return { rerolls, quests };
}

export async function rerollDailyQuest(account: AccountData, questId: string) {
  await composeMCP(account, 'AbandonQuest', 'campaign', { questId, fastAbandon: true });
}

export async function getAffiliateCode(account: AccountData) {
  const profile = await queryProfile<{
    profileChanges: { profile: { stats: { attributes: { mtx_affiliate?: string } } } }[];
  }>(account, 'common_core');
  return profile.profileChanges[0].profile.stats.attributes.mtx_affiliate ?? '';
}

export async function setAffiliateCode(account: AccountData, code: string) {
  await composeMCP(account, 'SetAffiliateName', 'common_core', { affiliateName: code });
}
