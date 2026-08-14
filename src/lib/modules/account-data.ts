import { get } from 'svelte/store';
import { isFortniteApiConfigured } from '$lib/env';
import { language } from '$lib/i18n';
import { logger } from '$lib/logger';
import { createCache } from '$lib/modules/data-cache.svelte';
import { fetchBrStatsByAccountId } from '$lib/modules/br-stats';
import type { BrStatsSummary } from '$lib/modules/br-stats-summary';
import { fetchEpicBrStats } from '$lib/modules/epic-stats';
import { fetchFreeGames, type FreeGame } from '$lib/modules/free-games';
import { fetchMap, type FortniteMapData } from '$lib/modules/fortnite-api';
import { fetchFortniteLeaks, type LeaksData } from '$lib/modules/fortnite-leaks';
import { ensureLibrary } from '$lib/modules/legendary';
import { fetchLocker, type LockerData } from '$lib/modules/locker';
import { fetchAccountProfile } from '$lib/modules/lookup';
import { clientQuestLogin, queryProfile } from '$lib/modules/mcp';
import { runProbes } from '$lib/modules/process-validator';
import { fetchStwStore } from '$lib/modules/stw-catalog';
import type { AccountData } from '$types/account';
import type { EpicAccountById } from '$types/game/lookup';
import type { StwStoreData } from '$types/game/stw-store';

const byAccount = (account: AccountData) => account.accountId;
const byLocale = (locale: string) => locale;

// ponytail: account caches are keyed by account only, not by locale. Switching
// language keeps localized names from the previous locale until a manual
// refresh — acceptable while the UI ships pt-br only. Add the locale to the key
// if a second language is ever exposed.
export const lockerCache = createCache<AccountData, LockerData>(byAccount, (account) =>
  fetchLocker(account, get(language))
);

export const accountProfileCache = createCache<AccountData, EpicAccountById>(byAccount, (account) =>
  fetchAccountProfile(account, account.accountId)
);

export const stwStoreCache = createCache<AccountData, StwStoreData>(
  byAccount,
  async (account) => {
    const [profile, commonCore] = await Promise.all([
      clientQuestLogin(account, 'campaign'),
      queryProfile(account, 'common_core')
    ]);

    return fetchStwStore(
      account,
      profile.profileChanges[0].profile,
      commonCore.profileChanges[0].profile,
      get(language)
    );
  }
);

export const brStatsCache = createCache<AccountData, BrStatsSummary>(
  byAccount,
  async (account) => {
    const stats = isFortniteApiConfigured()
      ? await fetchBrStatsByAccountId(account.accountId).catch(() => fetchEpicBrStats(account))
      : await fetchEpicBrStats(account);

    void runProbes('brStats', [
      {
        id: 'fn-stats',
        label: 'fortnite-api stats',
        hostPath: 'fortnite-api.com/v2/stats/br/v2/{id}',
        run: async () => {
          if (!isFortniteApiConfigured()) return { status: 0, empty: true };
          const probe = await fetchBrStatsByAccountId(account.accountId);
          return { status: 200, empty: probe.matches === 0 && probe.wins === 0 };
        }
      }
    ]);

    return stats;
  }
);

export const mapCache = createCache<string, FortniteMapData>(byLocale, (locale) => fetchMap(locale));

export const leaksCache = createCache<string, LeaksData>(byLocale, (locale) =>
  fetchFortniteLeaks(locale)
);

export const freeGamesCache = createCache<string, FreeGame[]>(byLocale, () => fetchFreeGames());

/**
 * Loads everything the account-scoped pages need up front — at startup and on
 * every account switch — so opening a tab renders from cache instead of showing
 * a loading screen. Failures are swallowed: each page retries on its own.
 */
export async function warmAccountData(account: AccountData | null | undefined): Promise<void> {
  const locale = get(language);

  const work: Promise<unknown>[] = [
    mapCache.ensure(locale),
    leaksCache.ensure(locale),
    freeGamesCache.ensure(locale)
  ];

  if (account) {
    work.push(
      lockerCache.ensure(account),
      accountProfileCache.ensure(account),
      stwStoreCache.ensure(account),
      brStatsCache.ensure(account),
      ensureLibrary(account).catch((error) => {
        logger.warn('Failed to warm game library', { error });
      })
    );
  }

  await Promise.allSettled(work);
}
