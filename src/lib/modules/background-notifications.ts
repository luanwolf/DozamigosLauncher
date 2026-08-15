import { get } from 'svelte/store';
import { language, t } from '$lib/i18n';
import { logger } from '$lib/logger';
import { fetchShop } from '$lib/modules/fortnite-api';
import { isLeavingSoon } from '$lib/modules/shop-history';
import { fetchAvailableCardPacks } from '$lib/modules/free-llamas';
import { aggregateMissionAlertsOverview } from '$lib/modules/mission-alerts-buckets';
import { sendNotificationMessage } from '$lib/modules/notification';
import { getLightswitch } from '$lib/modules/server-status';
import { fetchSteamFreeGames } from '$lib/modules/steam-free-games';
import { findNewSteamFreeAppIds } from '$lib/modules/steam-free-games-notify';
import { setWorldInfoCache } from '$lib/modules/world-info';
import { accountStore, settingsStore } from '$lib/storage';
import { getShopWishlist, getWishlistedOffersInShop } from '$lib/stores/shop-wishlist';
import { activityLog } from '$lib/stores/activity-log';
import { worldInfoCache } from '$lib/stores';
import type { AccountData } from '$types/account';
import type { LightswitchData } from '$types/game/server-status';

const STORAGE_KEY = 'backgroundNotificationState';
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const QUEST_DAY_CHECK_MS = 60 * 1000;

type ServerStatusKey = 'UP' | 'PARTIAL_OUTAGE' | 'UNDER_MAINTENANCE' | 'MAJOR_OUTAGE';

type MissionAlertsSnapshot = {
  totalVbucks: number;
  totalSurvivors: number;
  totalUpgradeLlamas: number;
  totalPerkUp: number;
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
  initialized: boolean;
};

let checkInterval: ReturnType<typeof setInterval> | null = null;
let questDayInterval: ReturnType<typeof setInterval> | null = null;

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

function getStatusFromLightswitch(data: LightswitchData): ServerStatusKey {
  if (data.status === 'UP') return 'UP';

  if (data.allowedActions?.includes('PLAY')) return 'PARTIAL_OUTAGE';
  return data.message?.toLowerCase().includes('maintenance') ? 'UNDER_MAINTENANCE' : 'MAJOR_OUTAGE';
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
  type: 'llama' | 'quest' | 'info',
  title: string,
  message: string,
  account?: string
) {
  if (!notificationsEnabled()) return;

  await sendNotificationMessage(message, title);
  activityLog.add(type, message, account, { notify: false });
}

async function checkLlamas(state: PersistedState, accounts: AccountData[]) {
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

        await pushNotification('llama', title, message, account.displayName);
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
    const lightswitch = await getLightswitch();
    const current = getStatusFromLightswitch(lightswitch);
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

async function checkMissionAlerts(state: PersistedState): Promise<MissionAlertsSnapshot | null> {
  try {
    let cache = get(worldInfoCache);
    if (!cache?.size) {
      await setWorldInfoCache();
      cache = get(worldInfoCache);
    }

    const overview = aggregateMissionAlertsOverview(cache);
    if (!overview) return state.missionAlertsSnapshot;

    const snapshot: MissionAlertsSnapshot = {
      totalVbucks: overview.totalVbucks,
      totalSurvivors: overview.totalSurvivors,
      totalUpgradeLlamas: overview.totalUpgradeLlamas,
      totalPerkUp: overview.totalPerkUp
    };

    const previous = state.missionAlertsSnapshot;
    if (state.initialized && previous) {
      const highlights: string[] = [];

      if (snapshot.totalVbucks > previous.totalVbucks && snapshot.totalVbucks > 0) {
        highlights.push(
          get(t)('backgroundNotifications.missionAlerts.vbucks', { count: snapshot.totalVbucks })
        );
      }

      if (snapshot.totalSurvivors > previous.totalSurvivors && snapshot.totalSurvivors > 0) {
        highlights.push(
          get(t)('backgroundNotifications.missionAlerts.survivors', { count: snapshot.totalSurvivors })
        );
      }

      if (snapshot.totalUpgradeLlamas > previous.totalUpgradeLlamas && snapshot.totalUpgradeLlamas > 0) {
        highlights.push(
          get(t)('backgroundNotifications.missionAlerts.llamas', { count: snapshot.totalUpgradeLlamas })
        );
      }

      if (snapshot.totalPerkUp > previous.totalPerkUp && snapshot.totalPerkUp > 0) {
        highlights.push(get(t)('backgroundNotifications.missionAlerts.perkUp', { count: snapshot.totalPerkUp }));
      }

      if (highlights.length) {
        await pushNotification(
          'info',
          get(t)('backgroundNotifications.missionAlerts.title'),
          highlights.join('\n')
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
      const titles = games
        .filter((game) => newIds.includes(game.appId))
        .slice(0, 2)
        .map((game) => game.title);
      const names = titles.join(', ');

      await pushNotification(
        'info',
        get(t)('backgroundNotifications.steamFreeGames.title'),
        get(t)('backgroundNotifications.steamFreeGames.message', {
          count: newIds.length,
          names
        })
      );
    }

    return currentIds;
  } catch (error) {
    logger.debug('Background Steam free games check failed', { error });
    return state.steamAppIds;
  }
}

async function runBackgroundChecks() {
  const { accounts } = accountStore.get();
  if (!accounts.length && !steamNotificationsEnabled()) return;

  const state = readState();
  const llamasByAccount = accounts.length ? await checkLlamas(state, accounts) : state.llamasByAccount;
  const { shopHash, shopLocale, wishlistLeavingSoonKeys } = await checkShop(state);
  const serverStatus = await checkServerStatus(state);
  const missionAlertsSnapshot = await checkMissionAlerts(state);
  const steamAppIds = await checkSteamFreeGames(state);

  const nextState: PersistedState = {
    llamasByAccount,
    shopHash,
    shopLocale,
    lastQuestNotifyUtcDay: state.lastQuestNotifyUtcDay ?? utcDayString(),
    serverStatus,
    missionAlertsSnapshot,
    wishlistLeavingSoonKeys,
    steamAppIds,
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
 * Polls llamas, item shop, and server status in the background and sends
 * Windows notifications when something new is detected.
 */
export function startBackgroundNotifications() {
  if (checkInterval) return;

  void runBackgroundChecks();
  runQuestDayCheck();

  checkInterval = setInterval(() => {
    void runBackgroundChecks();
  }, CHECK_INTERVAL_MS);

  questDayInterval = setInterval(runQuestDayCheck, QUEST_DAY_CHECK_MS);
}
