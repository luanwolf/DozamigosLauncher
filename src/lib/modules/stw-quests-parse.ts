import type { CampaignProfile } from '$types/game/mcp';

export type StwQuestBucket = 'daily' | 'save' | 'event' | 'other';

export type StwQuestEntry = {
  id: string;
  templateId: string;
  state: string;
  bucket: StwQuestBucket;
  progressLabel?: string;
};

const DAILY_RE = /quest_.*daily|daily_/i;
const SAVE_RE =
  /outpost|stormshield|ssd|homebase|quest_h(?:omebase)?|quest_outpost|quest_twine|quest_canny|quest_plank|quest_stone/i;
const EVENT_RE = /event|venture|dungeon|urn|miniboss|dudebro/i;
const AUTO_PIN_RE = /urn|miniboss|dudebro|keep/i;
const SSD_RE = /outpostquest|stormshield|ssd|outpost_quest|quest_outpost/i;

export function bucketQuest(templateId: string): StwQuestBucket {
  if (DAILY_RE.test(templateId)) return 'daily';
  if (SAVE_RE.test(templateId)) return 'save';
  if (EVENT_RE.test(templateId)) return 'event';
  return 'other';
}

export function isAutoPinQuest(templateId: string) {
  return AUTO_PIN_RE.test(templateId);
}

export function isSsdRewardQuest(templateId: string) {
  return SSD_RE.test(templateId) && !DAILY_RE.test(templateId);
}

function progressLabel(attributes: Record<string, unknown>) {
  for (const [key, value] of Object.entries(attributes)) {
    if (!key.toLowerCase().includes('completion')) continue;
    if (typeof value === 'number') return `${key}: ${value}`;
  }
  return undefined;
}

export function parseCampaignQuests(items: CampaignProfile['items']): StwQuestEntry[] {
  const quests: StwQuestEntry[] = [];
  for (const [id, item] of Object.entries(items)) {
    if (!item.templateId.startsWith('Quest:')) continue;
    const state = String(item.attributes?.quest_state ?? 'Unknown');
    quests.push({
      id,
      templateId: item.templateId,
      state,
      bucket: bucketQuest(item.templateId),
      progressLabel: progressLabel((item.attributes ?? {}) as Record<string, unknown>)
    });
  }
  return quests;
}

/** Merge auto-pin targets into existing pinned list (Epic replaces the whole array). */
export function mergePinnedQuestIds(existing: string[], autoPinIds: string[], max = 5) {
  const merged = [...autoPinIds];
  for (const id of existing) {
    if (!merged.includes(id)) merged.push(id);
    if (merged.length >= max) break;
  }
  return merged.slice(0, max);
}
