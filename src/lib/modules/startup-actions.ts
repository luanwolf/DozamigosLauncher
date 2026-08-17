import { get } from 'svelte/store';
import { dailyQuests } from '$lib/data';
import { language, t } from '$lib/i18n';
import { logger } from '$lib/logger';
import type { Locale } from '$lib/paraglide/runtime';
import {
  msUntilNextUtcHour,
  shouldRunHourlyClaim,
  utcHourBucket
} from '$lib/modules/epic-server-time';
import { fetchEpicServerTimeMs } from '$lib/modules/epic-server-time-fetch';
import { mapPool } from '$lib/modules/map-pool';
import { clientQuestLogin, composeMCP } from '$lib/modules/mcp';
import { accountStore } from '$lib/storage';
import { activityLog, notify } from '$lib/stores/activity-log';
import { getErrorDetail } from '$lib/utils';
import type { AccountData } from '$types/account';
import type { FullQueryProfile } from '$types/game/mcp';
import type { GrantedItem } from '$lib/utils/mcp-loot';

const HOURLY_CLAIM_BUCKET_KEY = 'dozamigos.lastLlamaUtcHour';

/** True while startup/hourly llama claims are hitting MCP — background polls should skip. */
let mcpBusyUntil = 0;

export function isMcpBusy() {
  return Date.now() < mcpBusyUntil;
}

function markMcpBusy(ms = 45_000) {
  mcpBusyUntil = Math.max(mcpBusyUntil, Date.now() + ms);
}

function readLocalStorage<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readLastHourBucket(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(HOURLY_CLAIM_BUCKET_KEY);
}

function writeLastHourBucket(bucket: string) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(HOURLY_CLAIM_BUCKET_KEY, bucket);
}

export { fetchEpicServerTimeMs };

async function claimLlamasForAll(accounts: AccountData[], { logEmpty = true } = {}) {
  let totalOpened = 0;
  const allReceived: GrantedItem[] = [];
  let errorCount = 0;
  let lastErrorDetail = '';
  const { claimFreeLlamas } = await import('$lib/modules/stw-auto-llama');

  markMcpBusy();

  // Sequential — parallel PopulatePrerolledOffers across accounts trips Epic MCP 500s.
  await mapPool(
    accounts,
    async (account) => {
      try {
        const result = await claimFreeLlamas(account);
        const count = result.opened;
        totalOpened += count;
        allReceived.push(...result.received);

        if (count > 0) {
          await notify('llama', get(t)('activityLog.llamasClaimed', { count }), {
            title: get(t)('activityLog.llamasTitle'),
            account: account.displayName,
            items: result.received,
            historyOnly: true
          });
        } else if (logEmpty) {
          await notify('info', get(t)('activityLog.llamasNone'), {
            account: account.displayName,
            historyOnly: true
          });
        }
      } catch (error) {
        errorCount++;
        lastErrorDetail = getErrorDetail(error);
        logger.error('Failed to claim llamas', { accountId: account.accountId, error });
        await notify('error', get(t)('activityLog.llamasError', { detail: lastErrorDetail }), {
          account: account.displayName,
          historyOnly: true
        });
      }
    },
    1
  );

  if (totalOpened > 0) {
    await notify(
      'llama',
      get(t)('activityLog.llamasClaimedSummary', {
        count: totalOpened,
        accounts: accounts.length
      }),
      {
        title: get(t)('activityLog.llamasTitle'),
        items: allReceived,
        skipHistory: true
      }
    );
  } else if (errorCount > 0) {
    await notify(
      'error',
      get(t)('activityLog.llamasErrorSummary', {
        count: errorCount,
        detail: lastErrorDetail
      }),
      {
        title: get(t)('activityLog.llamasTitle'),
        skipHistory: true
      }
    );
  }

  return totalOpened;
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
  markMcpBusy();

  await mapPool(
    accounts,
    async (account) => {
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
              account.displayName,
              { historyOnly: true }
            );
          } catch (error) {
            logger.warn('Failed to auto-reroll quest', { accountId: account.accountId, error });
            activityLog.add(
              'error',
              get(t)('activityLog.questError', { detail: getErrorDetail(error) }),
              account.displayName,
              { historyOnly: true }
            );
            break;
          }
        }

        if (rerolledCount > 0) {
          await notify('quest', get(t)('dailyQuests.rerollDone'), {
            title: get(t)('activityLog.questsTitle'),
            account: account.displayName
          });
        }
      } catch (error) {
        logger.error('Failed to fetch quests for auto-reroll', { accountId: account.accountId, error });
      }
    },
    1
  );
}

export async function runStartupActions() {
  const { accounts } = accountStore.get();
  if (!accounts.length) return;

  const shouldClaimLlamas = readLocalStorage<boolean>('autoClaimLlamas', false);
  const shouldAutoReroll = readLocalStorage<boolean>('autoReroll', false);
  if (!shouldClaimLlamas && !shouldAutoReroll) return;

  const actions: Promise<void>[] = [];

  if (shouldClaimLlamas) {
    actions.push(
      claimLlamasForAll(accounts).then(async () => {
        const serverMs = await fetchEpicServerTimeMs(accounts);
        if (serverMs != null) writeLastHourBucket(utcHourBucket(serverMs));
      })
    );
  }
  if (shouldAutoReroll) actions.push(autoRerollQuestsForAll(accounts));

  await Promise.allSettled(actions);
}

let llamaHourlyTimeout: ReturnType<typeof setTimeout> | null = null;

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
    const serverMs = await fetchEpicServerTimeMs(accounts);
    if (serverMs == null) {
      logger.warn('Skipping hourly llama claim — no Epic serverTime available');
      return;
    }

    const bucket = utcHourBucket(serverMs);
    if (!shouldRunHourlyClaim(readLastHourBucket(), bucket)) return;

    await claimLlamasForAll(accounts, { logEmpty: false });
    writeLastHourBucket(bucket);
  } catch (error) {
    logger.error('Scheduled hourly tasks failed', { error });
  }
}

/**
 * Schedules free-llama auto-claim on each Epic UTC hour (:00), using MCP
 * `serverTime` — not the PC clock. Safe to call multiple times; only one
 * timeout chain is ever active.
 */
export function startLlamaAutoClaimScheduler() {
  if (llamaHourlyTimeout) return;

  const scheduleNext = async () => {
    const { accounts } = accountStore.get();
    const serverMs = accounts.length ? await fetchEpicServerTimeMs(accounts) : null;
    // Fallback delay only used when no account can answer — still ~1h, not "local hour".
    const delay = serverMs != null ? msUntilNextUtcHour(serverMs) : 60 * 60_000;

    llamaHourlyTimeout = setTimeout(async () => {
      await runScheduledHourlyTasks();
      void scheduleNext();
    }, delay);
  };

  void scheduleNext();
}

let questRerollTimeout: ReturnType<typeof setTimeout> | null = null;

/** Milliseconds from Epic server time until the next 00:00 UTC (STW daily reset). */
function msUntilNextUtcMidnightFromServer(serverMs: number): number {
  const d = new Date(serverMs);
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0);
  return Math.max(1_000, next - serverMs + 60_000);
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
 * Schedules the daily quest auto-reroll right after the STW daily reset
 * (00:00 UTC on Epic server time). Only quests the user marked for replacement
 * are rerolled. Safe to call multiple times; only one timer chain is active.
 */
export function startDailyQuestRerollScheduler() {
  if (questRerollTimeout) return;

  const scheduleNext = async () => {
    const { accounts } = accountStore.get();
    const serverMs = accounts.length ? await fetchEpicServerTimeMs(accounts) : null;
    const delay =
      serverMs != null ? msUntilNextUtcMidnightFromServer(serverMs) : 24 * 60 * 60_000;

    questRerollTimeout = setTimeout(async () => {
      await runScheduledQuestReroll();
      void scheduleNext();
    }, delay);
  };

  void scheduleNext();
}
