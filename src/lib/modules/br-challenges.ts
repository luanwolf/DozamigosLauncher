import type { FullQueryProfile } from '$types/game/mcp';

export const BOOK_XP_PER_LEVEL = 80_000;

export type BrChallenge = {
  id: string;
  name: string;
  progress: number;
  total: number;
};

export type BrProgressSummary = {
  battlePassLevel: number;
  battlePassXp: number;
  weeklyBattleRoyaleXp: number;
  weeklyCreativeXp: number;
  challenges: BrChallenge[];
};

const WEEKLY_XP_CAP = 4_000_000;

function formatQuestName(templateId: string) {
  const raw = templateId.replace(/^[^:]+:/, '');
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

export function parseBrProgress(athena: FullQueryProfile<'athena'>): BrProgressSummary {
  const profile = athena.profileChanges[0].profile;
  const attributes = profile.stats.attributes;
  const challenges: BrChallenge[] = [];

  for (const [id, item] of Object.entries(profile.items)) {
    if (item.attributes.quest_state !== 'Active') continue;

    const templateId = item.templateId;
    if (!templateId.startsWith('Quest:') && !templateId.includes('Challenge')) continue;

    const progress = Number(item.attributes.completion_progress ?? 0);
    const total = Number(item.attributes.completion_goal ?? item.attributes.quota ?? 1) || 1;

    challenges.push({
      id,
      name: formatQuestName(templateId),
      progress,
      total
    });
  }

  challenges.sort((a, b) => {
    const aDone = a.progress >= a.total ? 1 : 0;
    const bDone = b.progress >= b.total ? 1 : 0;
    return aDone - bDone || a.name.localeCompare(b.name);
  });

  return {
    battlePassLevel: attributes.book_level ?? 0,
    battlePassXp: attributes.book_xp ?? 0,
    weeklyBattleRoyaleXp: attributes.playtime_xp?.currentWeekXp ?? 0,
    weeklyCreativeXp: attributes.creative_dynamic_xp?.currentWeekXp ?? 0,
    challenges: challenges.slice(0, 8)
  };
}

export { WEEKLY_XP_CAP };
