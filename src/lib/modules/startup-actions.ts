import { get } from 'svelte/store';
import { toast } from 'svelte-sonner';
import { dailyQuests } from '$lib/data';
import { language, t } from '$lib/i18n';
import { logger } from '$lib/logger';
import type { Locale } from '$lib/paraglide/runtime';
import { clientQuestLogin, composeMCP } from '$lib/modules/mcp';
import { accountStore } from '$lib/storage';
import { activityLog } from '$lib/stores/activity-log';
import { getErrorDetail } from '$lib/utils';
import type { AccountData } from '$types/account';
import type { FullQueryProfile } from '$types/game/mcp';

function readLocalStorage<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function claimLlamasForAll(accounts: AccountData[], { logEmpty = true } = {}) {
  let totalOpened = 0;

  await Promise.allSettled(
    accounts.map(async (account) => {
      try {
        const populateResult = await composeMCP<FullQueryProfile<'campaign'>>(
          account,
          'PopulatePrerolledOffers',
          'campaign',
          {}
        );

        const profile = populateResult.profileChanges[0].profile;
        const cardPackIds = Object.entries(profile.items)
          .filter(([, item]) => item.templateId.startsWith('CardPack:'))
          .map(([id]) => id);

        if (cardPackIds.length > 0) {
          await composeMCP(account, 'OpenCardPackBatch', 'campaign', { cardPackItemIds: cardPackIds });
          totalOpened += cardPackIds.length;
          activityLog.add(
            'llama',
            get(t)('activityLog.llamasClaimed', { count: cardPackIds.length }),
            account.displayName
          );
        } else if (logEmpty) {
          // Only log "none available" on explicit runs to avoid spamming the
          // activity log on every scheduled hourly check.
          activityLog.add('info', get(t)('activityLog.llamasNone'), account.displayName);
        }
      } catch (error) {
        logger.error('Failed to claim llamas', { accountId: account.accountId, error });
        activityLog.add(
          'error',
          get(t)('activityLog.llamasError', { detail: getErrorDetail(error) }),
          account.displayName
        );
      }
    })
  );

  if (totalOpened > 0) {
    toast.success(get(t)('freeLlamas.claimed', { count: totalOpened }));
  }
}

function questName(templateKey: string, locale: Locale): string {
  const names = dailyQuests[templateKey]?.names;
  return names?.[locale] || names?.['pt-br' as Locale] || templateKey;
}

async function autoRerollQuestsForAll(accounts: AccountData[]) {
  const blacklist = new Set<string>(readLocalStorage<string[]>('questBlacklist', []));

  // Only reroll quests the user explicitly marked. With nothing marked there is
  // nothing to do — never reroll quests blindly.
  if (blacklist.size === 0) return;

  const locale = get(language);

  await Promise.allSettled(
    accounts.map(async (account) => {
      try {
        const campaignProfile = await clientQuestLogin(account, 'campaign');
        const initialProfile = campaignProfile.profileChanges[0].profile;
        let rerollsRemaining = initialProfile.stats.attributes.quest_manager?.dailyQuestRerolls || 0;

        if (rerollsRemaining <= 0) return;

        const extractQuests = (profile: FullQueryProfile<'campaign'>['profileChanges'][0]['profile']) =>
          Object.entries(profile.items)
            .filter(([, item]) => item.templateId.startsWith('Quest:') && item.attributes.quest_state === 'Active')
            .map(([id, item]) => ({ id, templateKey: item.templateId.split(':')[1].toLowerCase() }))
            .filter((q) => !!dailyQuests[q.templateKey]);

        let currentQuests = extractQuests(initialProfile);
        const shouldReroll = (q: { templateKey: string }) => blacklist.has(q.templateKey);

        let rerolledCount = 0;

        while (rerollsRemaining > 0) {
          const quest = currentQuests.find(shouldReroll);
          if (!quest) break;

          const oldName = questName(quest.templateKey, locale);
          const previousIds = new Set(currentQuests.map((q) => q.id));

          try {
            const response = await composeMCP<FullQueryProfile<'campaign'>>(
              account,
              'FortRerollDailyQuest',
              'campaign',
              { questId: quest.id }
            );
            const updatedProfile = response.profileChanges[0].profile;
            rerollsRemaining = updatedProfile.stats.attributes.quest_manager?.dailyQuestRerolls || 0;
            currentQuests = extractQuests(updatedProfile);
            rerolledCount++;

            const newQuest = currentQuests.find((q) => !previousIds.has(q.id));
            const newName = newQuest ? questName(newQuest.templateKey, locale) : '?';

            activityLog.add(
              'quest',
              get(t)('activityLog.questRerolledDetail', { old: oldName, new: newName }),
              account.displayName
            );
          } catch (error) {
            logger.warn('Failed to auto-reroll quest', { accountId: account.accountId, error });
            activityLog.add(
              'error',
              get(t)('activityLog.questError', { detail: getErrorDetail(error) }),
              account.displayName
            );
            break;
          }
        }

        if (rerolledCount > 0) {
          toast.success(get(t)('dailyQuests.rerollDone'));
        }
      } catch (error) {
        logger.error('Failed to fetch quests for auto-reroll', { accountId: account.accountId, error });
      }
    })
  );
}

export async function runStartupActions() {
  const { accounts } = accountStore.get();
  if (!accounts.length) return;

  const shouldClaimLlamas = readLocalStorage<boolean>('autoClaimLlamas', false);
  const shouldAutoReroll = readLocalStorage<boolean>('autoReroll', false);
  if (!shouldClaimLlamas && !shouldAutoReroll) return;

  const actions: Promise<void>[] = [];

  if (shouldClaimLlamas) actions.push(claimLlamasForAll(accounts));
  if (shouldAutoReroll) actions.push(autoRerollQuestsForAll(accounts));

  await Promise.allSettled(actions);
}

let llamaHourlyTimeout: ReturnType<typeof setTimeout> | null = null;

/** Milliseconds from now until the next UTC hour boundary (:00). */
function msUntilNextUtcHour(): number {
  const now = new Date();
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1, 0, 0, 0)
  );
  return next.getTime() - now.getTime();
}

/**
 * Runs the hourly background pass across every connected account: claims free
 * llamas, if that setting is enabled. Empty llama results are not logged to
 * avoid spamming the activity log on each scheduled run.
 */
async function runScheduledHourlyTasks() {
  const shouldClaimLlamas = readLocalStorage<boolean>('autoClaimLlamas', false);
  if (!shouldClaimLlamas) return;

  const { accounts } = accountStore.get();
  if (!accounts.length) return;

  try {
    await claimLlamasForAll(accounts, { logEmpty: false });
  } catch (error) {
    logger.error('Scheduled hourly tasks failed', { error });
  }
}

/**
 * Schedules free-llama auto-claim on each UTC hour (:00), for every connected
 * account when `autoClaimLlamas` is enabled. Safe to call multiple times; only
 * one timeout chain is ever active.
 */
export function startLlamaAutoClaimScheduler() {
  if (llamaHourlyTimeout) return;

  const scheduleNext = () => {
    // Small buffer after the hour so Epic's prerolls are already live.
    const delay = msUntilNextUtcHour() + 5_000;
    llamaHourlyTimeout = setTimeout(async () => {
      await runScheduledHourlyTasks();
      scheduleNext();
    }, delay);
  };

  scheduleNext();
}

let questRerollTimeout: ReturnType<typeof setTimeout> | null = null;

/** Milliseconds from now until the next 00:00 UTC (the STW daily quest reset). */
function msUntilNextUtcMidnight(): number {
  const now = new Date();
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)
  );
  return next.getTime() - now.getTime();
}

async function runScheduledQuestReroll() {
  if (!readLocalStorage<boolean>('autoReroll', false)) return;

  const { accounts } = accountStore.get();
  if (!accounts.length) return;

  try {
    await autoRerollQuestsForAll(accounts);
  } catch (error) {
    logger.error('Scheduled quest reroll failed', { error });
  }
}

/**
 * Schedules the daily quest auto-reroll to run right after the STW daily reset
 * (00:00 UTC), then every 24 hours. Only quests the user marked for replacement
 * are rerolled. Safe to call multiple times; only one timer chain is active.
 */
export function startDailyQuestRerollScheduler() {
  if (questRerollTimeout) return;

  const scheduleNext = () => {
    // A small buffer after midnight so the new daily quests are already live.
    const delay = msUntilNextUtcMidnight() + 60_000;
    questRerollTimeout = setTimeout(async () => {
      await runScheduledQuestReroll();
      scheduleNext();
    }, delay);
  };

  scheduleNext();
}
