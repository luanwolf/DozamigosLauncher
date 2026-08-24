import { clientQuestLogin, composeMCP } from '$lib/modules/mcp';
import {
  bucketQuest,
  isAutoPinQuest,
  mergePinnedQuestIds,
  parseCampaignQuests,
  type StwQuestBucket,
  type StwQuestEntry
} from '$lib/modules/stw-quests-parse';
import type { AccountData } from '$types/account';

export type { StwQuestBucket, StwQuestEntry };
export {
  bucketQuest,
  isAutoPinQuest,
  mergePinnedQuestIds,
  parseCampaignQuests
};

export async function fetchCampaignQuests(account: AccountData) {
  const profile = await clientQuestLogin(account, 'campaign');
  return {
    quests: parseCampaignQuests(profile.profileChanges[0].profile.items),
    pinned: (profile.profileChanges[0].profile.stats.attributes.client_settings?.pinnedQuestInstances ??
      []) as string[],
    profile
  };
}

export async function claimCompletedQuests(account: AccountData, questIds: string[]) {
  let claimed = 0;
  for (const questId of questIds) {
    await composeMCP(account, 'ClaimQuestReward', 'campaign', { questId, selectedRewardIndex: 0 });
    claimed++;
  }
  return claimed;
}

export async function setPinnedQuests(account: AccountData, pinnedQuestIds: string[]) {
  await composeMCP(account, 'SetPinnedQuests', 'campaign', { pinnedQuestIds });
}

export async function autoPinUrnAndMiniBoss(account: AccountData) {
  const { quests, pinned } = await fetchCampaignQuests(account);
  const targets = quests
    .filter((q) => q.state === 'Active' && isAutoPinQuest(q.templateId))
    .map((q) => q.id);
  if (!targets.length) return { pinned, changed: false };
  const next = mergePinnedQuestIds(pinned, targets);
  await setPinnedQuests(account, next);
  return { pinned: next, changed: true };
}
