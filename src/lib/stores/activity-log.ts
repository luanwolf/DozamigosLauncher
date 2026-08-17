import { derived, writable } from 'svelte/store';
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
  sticky?: boolean;
  /** Always history-only until a new notification UI ships. */
  historyOnly?: boolean;
  skipNative?: boolean;
  skipHistory?: boolean;
  id?: string;
  /** Kept for call-site compatibility; actions are ignored without a UI. */
  actions?: { id: string; label: string; onClick: () => void | Promise<void> }[];
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

function createActivityLog() {
  const { subscribe, update, set } = writable<ActivityEntry[]>(loadEntries());

  function writeEntry(entry: ActivityEntry) {
    update((entries) => {
      const next = [entry, ...entries.filter((item) => item.id !== entry.id)].slice(0, MAX_ENTRIES);
      persist(next);
      return next;
    });
  }

  /**
   * ponytail: notification UI was removed; callers keep writing history so a
   * future panel can light up without rewiring every claim/reroll site.
   */
  async function notify(type: ActivityType, message: string, options: NotifyOptions = {}) {
    const id = options.id ?? Math.random().toString(36).slice(2);
    if (options.skipHistory) return id;

    writeEntry({
      id,
      timestamp: new Date().toISOString(),
      type,
      title: options.title,
      message,
      account: options.account,
      read: false,
      items: options.items?.map((item) => ({
        templateId: item.templateId,
        quantity: item.quantity
      }))
    });

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

export function notify(type: ActivityType, message: string, options?: NotifyOptions) {
  return activityLog.notify(type, message, options);
}
