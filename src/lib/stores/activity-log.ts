import { derived, get, writable } from 'svelte/store';
import { sendNotificationMessage } from '$lib/modules/notification';
import { isAppWindowVisible } from '$lib/modules/window-visibility';
import { floatingNotifications, type FloatingAction } from '$lib/stores/floating-notifications';
import { settingsStore } from '$lib/storage';
import type { GrantedItem } from '$lib/utils/mcp-loot';

export type ActivityType = 'llama' | 'game' | 'quest' | 'info' | 'error' | 'update';

export type ActivityItemPreview = {
  templateId: string;
  quantity: number;
};

export type ActivityEntry = {
  id: string;
  timestamp: string;
  type: ActivityType;
  title?: string;
  message: string;
  account?: string;
  read: boolean;
  items?: ActivityItemPreview[];
};

export type NotifyOptions = {
  title?: string;
  account?: string;
  items?: GrantedItem[];
  actions?: FloatingAction[];
  sticky?: boolean;
  /** Skip floating + native; only write history. */
  historyOnly?: boolean;
  /** Skip native when window is hidden. */
  skipNative?: boolean;
  /** Skip activity history write. */
  skipHistory?: boolean;
  /** Reuse a floating card id (updater progress). */
  id?: string;
};

const STORAGE_KEY = 'dozamigos.activityLog';
const MAX_ENTRIES = 80;

function loadEntries(): ActivityEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ActivityEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

function persist(entries: ActivityEntry[]) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // quota / private mode
  }
}

function notificationsEnabled() {
  return get(settingsStore).app?.windowsNotifications !== false;
}

function createActivityLog() {
  const { subscribe, update, set } = writable<ActivityEntry[]>(loadEntries());

  function writeEntry(entry: ActivityEntry) {
    update((entries) => {
      const next = [entry, ...entries.filter((item) => item.id !== entry.id)].slice(0, MAX_ENTRIES);
      persist(next);
      return next;
    });
  }

  async function notify(type: ActivityType, message: string, options: NotifyOptions = {}) {
    const id = options.id ?? Math.random().toString(36).slice(2);
    const title = options.title;
    const account = options.account;
    const items = options.items?.map((item) => ({
      templateId: item.templateId,
      quantity: item.quantity
    }));

    if (!options.skipHistory) {
      writeEntry({
        id,
        timestamp: new Date().toISOString(),
        type,
        title,
        message,
        account,
        read: false,
        items
      });
    }

    if (options.historyOnly) return id;
    if (!notificationsEnabled()) return id;

    const visible = await isAppWindowVisible();
    if (visible) {
      floatingNotifications.push({
        id,
        type,
        title: title ?? 'Dozamigos Launcher',
        message,
        account,
        items: options.items,
        actions: options.actions,
        sticky: options.sticky
      });
    } else if (!options.skipNative) {
      const body = account ? `${message}\n${account}` : message;
      await sendNotificationMessage(body, title);
    }

    return id;
  }

  return {
    subscribe,
    notify,
    add(type: ActivityType, message: string, account?: string, options?: NotifyOptions) {
      return notify(type, message, { ...options, account: options?.account ?? account });
    },
    markAllRead() {
      update((entries) => {
        const next = entries.map((entry) => ({ ...entry, read: true }));
        persist(next);
        return next;
      });
    },
    clear() {
      set([]);
      persist([]);
    }
  };
}

export const activityLog = createActivityLog();

export const unreadCount = derived(activityLog, ($log) => $log.filter((entry) => !entry.read).length);

/** Convenience re-export so callers can `import { notify }`. */
export function notify(type: ActivityType, message: string, options?: NotifyOptions) {
  return activityLog.notify(type, message, options);
}
