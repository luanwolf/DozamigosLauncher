import { get } from 'svelte/store';
import { openUrl } from '@tauri-apps/plugin-opener';
import { language, t } from '$lib/i18n';
import { logger } from '$lib/logger';
import { fetchFortniteStatus, fetchShop } from '$lib/modules/fortnite-api';
import { isLeavingSoon } from '$lib/modules/shop-history';
import { fetchAvailableCardPacks } from '$lib/modules/free-llamas';
import { fetchFreeGames } from '$lib/modules/free-games';
import { refreshLiveBrData } from '$lib/modules/account-data';
import { getStatusPage, statusFromFortniteApi, statusFromStatusPage } from '$lib/modules/server-status';
import { fetchSteamFreeGames } from '$lib/modules/steam-free-games';
import { findNewSteamFreeAppIds } from '$lib/modules/steam-free-games-notify';
import { setWorldInfoCache } from '$lib/modules/world-info';
import { aggregateMissionAlertsOverview } from '$lib/modules/mission-alerts-buckets';
import { accountStore, settingsStore } from '$lib/storage';
import { getShopWishlist, getWishlistedOffersInShop } from '$lib/stores/shop-wishlist';
import { notify } from '$lib/stores/activity-log';
import { worldInfoCache } from '$lib/stores';
import { isMcpBusy } from '$lib/modules/startup-actions';
import type { AccountData } from '$types/account';
import type { ParsedWorldInfo } from '$types/game/stw/world-info';

const STORAGE_KEY = 'backgroundNotificationState';
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const QUEST_DAY_CHECK_MS = 60 * 1000;

type ServerStatusKey = 'UP' | 'PARTIAL_OUTAGE' | 'UNDER_MAINTENANCE' | 'MAJOR_OUTAGE';

type MissionAlertsSnapshot = {
  totalVbucks: number;
  totalSurvivors: number;
  totalUpgradeLlamas: number;
  totalPerkUp: number;
  /** Sorted alert guids — changes when STW mission alerts rotate. */
  fingerprint: string;
};

type PersistedState = {
  llamasByAccount: Record<string, number>;
  shopHash: string | null;
  shopLocale: string | null;
  lastQuestNotifyUtcDay: string | null;
  serverStatus: ServerStatusKey | null;
  missionAlertsSnapshot: MissionAlertsSnapshot | null;
  wishlistLeavingSoonKeys: string[];
  steamAppIds: string[] | null;
  epicGameIds: string[] | null;
  initialized: boolean;
};

let checkInterval: ReturnType<typeof setInterval> | null = null;

function defaultState(): PersistedState {
  return {
    llamasByAccount: {},
    shopHash: null,
    shopLocale: null,
    lastQuestNotifyUtcDay: null,
    serverStatus: null,
    missionAlertsSnapshot: null,
    wishlistLeavingSoonKeys: [],
    steamAppIds: null,
    epicGameIds: null,
    initialized: false
  };
}

function readState(): PersistedState {
  if (typeof localStorage === 'undefined') return defaultState();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultState(), ...(JSON.parse(raw) as PersistedState) } : defaultState();
  } catch {
    return defaultState();
  }
}

function writeState(state: PersistedState) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function utcDayString(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function notificationsEnabled(): boolean {
  return get(settingsStore).app?.windowsNotifications !== false;
}

function steamNotificationsEnabled(): boolean {
  return notificationsEnabled() && get(settingsStore).app?.steamFreeGamesNotifications === true;
}

function serverStatusLabel(status: ServerStatusKey): string {
  switch (status) {
    case 'UP':
      return get(t)('serverStatus.statuses.operational');
    case 'PARTIAL_OUTAGE':
      return get(t)('serverStatus.statuses.partialOutage');
    case 'UNDER_MAINTENANCE':
      return get(t)('serverStatus.statuses.underMaintenance');
    default:
      return get(t)('serverStatus.statuses.down');
  }
}

async function pushNotification(
  type: 'llama' | 'quest' | 'info' | 'game',
  title: string,
  message: string,
  options?: {
    account?: string;
    actions?: { id: string; label: string; variant?: 'default' | 'outline' | 'secondary'; onClick: () => void | Promise<void> }[];
  }
) {
  if (!notificationsEnabled()) return;

  await notify(type, message, {
    title,
    account: options?.account,
    actions: options?.actions
  });
}

async function checkLlamas(state: PersistedState, accounts: AccountData[]) {
  // Avoid doubling PopulatePrerolledOffers while startup/hourly claims are mid-flight.
  if (isMcpBusy()) return state.llamasByAccount;

  const nextCounts: Record<string, number> = { ...state.llamasByAccount };

  await Promise.allSettled(
    accounts.map(async (account) => {
      try {
        const packs = await fetchAvailableCardPacks(account);
        const count = packs.length;
        const previous = state.llamasByAccount[account.accountId] ?? 0;
        nextCounts[account.accountId] = count;

        if (!state.initialized || count <= previous) return;

        const title = get(t)('backgroundNotifications.llamas.title');
        const message =
          accounts.length === 1
            ? get(t)('backgroundNotifications.llamas.message', { count })
            : get(t)('backgroundNotifications.llamas.messageWithAccount', {
                count,
                account: account.displayName
              });

        // Account stays in history only — body already matches auto-kick "Name: …" when multi-account.
        await pushNotification('llama', title, message, { account: account.displayName });
      } catch (error) {
        logger.debug('Background llama check failed', { accountId: account.accountId, error });
      }
    })
  );

  return nextCounts;
}

async function checkShop(state: PersistedState) {
  const locale = get(language);
  let shopHash = state.shopHash;
  let shopLocale = state.shopLocale;
  let wishlistLeavingSoonKeys = [...state.wishlistLeavingSoonKeys];

  try {
    const shop = await fetchShop(locale);
    const previousHash = state.shopHash;
    const hashChanged =
      state.initialized &&
      previousHash !== null &&
      (previousHash !== shop.hash || state.shopLocale !== locale);

    shopHash = shop.hash;
    shopLocale = locale;

    const wishlist = getShopWishlist();
    const wishlistedInShop = getWishlistedOffersInShop(shop.offers, wishlist);
    const leavingSoonWishlist = wishlistedInShop.filter((offer) => isLeavingSoon(offer));
    const newLeavingSoon = leavingSoonWishlist.filter(
      (offer) => !wishlistLeavingSoonKeys.includes(offer.offerId)
    );

    if (newLeavingSoon.length) {
      const names = newLeavingSoon
        .slice(0, 2)
        .map((offer) => offer.name)
        .join(', ');

      await pushNotification(
        'info',
        get(t)('backgroundNotifications.wishlistLeavingSoon.title'),
        get(t)('backgroundNotifications.wishlistLeavingSoon.message', {
          count: newLeavingSoon.length,
          names
        })
      );

      wishlistLeavingSoonKeys = [
        ...wishlistLeavingSoonKeys,
        ...newLeavingSoon.map((offer) => offer.offerId)
      ];
    }

    if (hashChanged) {
      const newItems = shop.offers.filter((offer) => offer.shopHistory.length < 2).length;
      const leavingSoonCount = shop.offers.filter((offer) => isLeavingSoon(offer)).length;

      if (wishlistedInShop.length) {
        const names = wishlistedInShop
          .slice(0, 3)
          .map((offer) => offer.name)
          .join(', ');

        await pushNotification(
          'info',
          get(t)('backgroundNotifications.wishlist.title'),
          get(t)('backgroundNotifications.wishlist.message', {
            count: wishlistedInShop.length,
            names
          })
        );
      } else {
        await pushNotification(
          'info',
          get(t)('backgroundNotifications.itemShop.title'),
          get(t)('backgroundNotifications.itemShop.messageDetailed', {
            newCount: newItems,
            leavingCount: leavingSoonCount
          })
        );
      }

      wishlistLeavingSoonKeys = [];
    }
  } catch (error) {
    logger.debug('Background shop check failed', { error });
  }

  return { shopHash, shopLocale, wishlistLeavingSoonKeys };
}

async function checkServerStatus(state: PersistedState) {
  let serverStatus = state.serverStatus;

  try {
    const account = accountStore.getActive();
    const current = account
      ? statusFromFortniteApi(await fetchFortniteStatus(account))
      : statusFromStatusPage((await getStatusPage()).status?.indicator);
    const previous = state.serverStatus;

    if (state.initialized && previous !== null && previous !== current) {
      if (current === 'UP') {
        await pushNotification(
          'info',
          get(t)('serverStatus.notification.title'),
          get(t)('serverStatus.notification.message')
        );
      } else if (previous === 'UP') {
        await pushNotification(
          'info',
          get(t)('backgroundNotifications.serverStatus.offline.title'),
          get(t)('backgroundNotifications.serverStatus.offline.message')
        );
      } else {
        await pushNotification(
          'info',
          get(t)('backgroundNotifications.serverStatus.changed.title'),
          get(t)('backgroundNotifications.serverStatus.changed.message', {
            status: serverStatusLabel(current)
          })
        );
      }
    }

    serverStatus = current;
  } catch (error) {
    logger.debug('Background server status check failed', { error });
  }

  return serverStatus;
}

function checkDailyQuestReset(state: PersistedState): string {
  const today = utcDayString();
  const last = state.lastQuestNotifyUtcDay ?? today;

  if (!state.initialized) return last;

  if (last !== today) {
    void pushNotification(
      'quest',
      get(t)('backgroundNotifications.dailyQuests.title'),
      get(t)('backgroundNotifications.dailyQuests.message')
    );
    return today;
  }

  return last;
}

function missionAlertsFingerprint(cache: ParsedWorldInfo) {
  const guids: string[] = [];
  for (const missions of cache.values()) {
    for (const mission of missions.values()) {
      if (mission.alert?.guid) guids.push(mission.alert.guid);
    }
  }
  return guids.sort().join(',');
}

async function checkMissionAlerts(state: PersistedState): Promise<MissionAlertsSnapshot | null> {
  try {
    let cache = get(worldInfoCache);
    if (!cache?.size) {
      await setWorldInfoCache();
      cache = get(worldInfoCache);
    }

    const overview = aggregateMissionAlertsOverview(cache);
    if (!overview || !cache?.size) return state.missionAlertsSnapshot;

    const snapshot: MissionAlertsSnapshot = {
      totalVbucks: overview.totalVbucks,
      totalSurvivors: overview.totalSurvivors,
      totalUpgradeLlamas: overview.totalUpgradeLlamas,
      totalPerkUp: overview.totalPerkUp,
      fingerprint: missionAlertsFingerprint(cache)
    };

    const previous = state.missionAlertsSnapshot;
    // Skip once when upgrading old state without fingerprint — avoid a false “rotation” toast.
    if (
      state.initialized &&
      previous?.fingerprint &&
      previous.fingerprint !== snapshot.fingerprint
    ) {
      if (snapshot.totalVbucks > 0) {
        await pushNotification(
          'info',
          get(t)('backgroundNotifications.missionAlerts.vbucksTitle'),
          get(t)('backgroundNotifications.missionAlerts.vbucks', { count: snapshot.totalVbucks })
        );
      } else {
        const bits: string[] = [];
        if (snapshot.totalSurvivors > 0) {
          bits.push(
            get(t)('backgroundNotifications.missionAlerts.survivors', { count: snapshot.totalSurvivors })
          );
        }
        if (snapshot.totalUpgradeLlamas > 0) {
          bits.push(
            get(t)('backgroundNotifications.missionAlerts.llamas', { count: snapshot.totalUpgradeLlamas })
          );
        }
        if (snapshot.totalPerkUp > 0) {
          bits.push(get(t)('backgroundNotifications.missionAlerts.perkUp', { count: snapshot.totalPerkUp }));
        }

        await pushNotification(
          'info',
          get(t)('backgroundNotifications.missionAlerts.title'),
          bits.length
            ? bits.join(' · ')
            : get(t)('backgroundNotifications.missionAlerts.rotated')
        );
      }
    }

    return snapshot;
  } catch (error) {
    logger.debug('Background mission alerts check failed', { error });
    return state.missionAlertsSnapshot;
  }
}

async function checkSteamFreeGames(state: PersistedState): Promise<string[] | null> {
  if (!steamNotificationsEnabled()) return state.steamAppIds;

  try {
    const games = await fetchSteamFreeGames();
    const currentIds = games.map((game) => game.appId);
    const previous = state.initialized ? state.steamAppIds : null;
    const newIds = findNewSteamFreeAppIds(currentIds, previous);

    if (newIds.length) {
      const fresh = games.filter((game) => newIds.includes(game.appId));
      const names = fresh
        .slice(0, 2)
        .map((game) => game.title)
        .join(', ');
      const first = fresh[0];

      await pushNotification(
        'game',
        get(t)('backgroundNotifications.steamFreeGames.title'),
        get(t)('backgroundNotifications.steamFreeGames.message', {
          count: newIds.length,
          names
        }),
        first
          ? {
              actions: [
                {
                  id: 'open-steam',
                  label: get(t)('backgroundNotifications.viewGame'),
                  onClick: () => openUrl(first.storeUrl)
                }
              ]
            }
          : undefined
      );
    }

    return currentIds;
  } catch (error) {
    logger.debug('Background Steam free games check failed', { error });
    return state.steamAppIds;
  }
}

async function checkEpicFreeGames(state: PersistedState): Promise<string[] | null> {
  if (!notificationsEnabled()) return state.epicGameIds;

  try {
    const games = await fetchFreeGames();
    const currentIds = games.map((game) => game.id);
    const previous = state.initialized ? state.epicGameIds : null;
    const newIds = findNewSteamFreeAppIds(currentIds, previous);

    if (newIds.length) {
      const fresh = games.filter((game) => newIds.includes(game.id));
      const names = fresh
        .slice(0, 2)
        .map((game) => game.title)
        .join(', ');
      const first = fresh[0];

      await pushNotification(
        'game',
        get(t)('backgroundNotifications.epicFreeGames.title'),
        get(t)('backgroundNotifications.epicFreeGames.message', {
          count: newIds.length,
          names
        }),
        first
          ? {
              actions: [
                {
                  id: 'open-epic',
                  label: get(t)('backgroundNotifications.viewGame'),
                  onClick: () => openUrl(first.storeUrl)
                }
              ]
            }
          : undefined
      );
    }

    return currentIds;
  } catch (error) {
    logger.debug('Background Epic free games check failed', { error });
    return state.epicGameIds;
  }
}

async function runBackgroundChecks() {
  const { accounts } = accountStore.get();
  const active = accountStore.getActive();
  // TTL-aware: no-ops when still fresh; refreshes map/leaks even without a login.
  await refreshLiveBrData(active ?? accounts[0] ?? null);

  if (!accounts.length && !steamNotificationsEnabled() && !notificationsEnabled()) return;

  const state = readState();
  const llamasByAccount = accounts.length ? await checkLlamas(state, accounts) : state.llamasByAccount;
  const { shopHash, shopLocale, wishlistLeavingSoonKeys } = await checkShop(state);
  const serverStatus = await checkServerStatus(state);
  const missionAlertsSnapshot = await checkMissionAlerts(state);
  const steamAppIds = await checkSteamFreeGames(state);
  const epicGameIds = await checkEpicFreeGames(state);

  const nextState: PersistedState = {
    llamasByAccount,
    shopHash,
    shopLocale,
    lastQuestNotifyUtcDay: state.lastQuestNotifyUtcDay ?? utcDayString(),
    serverStatus,
    missionAlertsSnapshot,
    wishlistLeavingSoonKeys,
    steamAppIds,
    epicGameIds,
    initialized: true
  };

  writeState(nextState);
}

function runQuestDayCheck() {
  const state = readState();
  if (!state.initialized) return;

  writeState({
    ...state,
    lastQuestNotifyUtcDay: checkDailyQuestReset(state)
  });
}

/**
 * Polls llamas, item shop, STW mission alerts, free games, server status, and
 * TTL-stale BR live data (map / leaks / locker / Status BR).
 * Sends native Windows toasts when "Notificações do Windows" is enabled.
 */
export function startBackgroundNotifications() {
  if (checkInterval) return;

  void runBackgroundChecks();
  runQuestDayCheck();

  checkInterval = setInterval(() => {
    void runBackgroundChecks();
  }, CHECK_INTERVAL_MS);

  setInterval(runQuestDayCheck, QUEST_DAY_CHECK_MS);
}
