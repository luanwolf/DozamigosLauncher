import { derived, get, writable } from 'svelte/store';
import type { ActivityType } from '$lib/stores/activity-log';
import type { GrantedItem } from '$lib/utils/mcp-loot';

export type FloatingAction = {
  id: string;
  label: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  onClick: () => void | Promise<void>;
};

export type FloatingNotification = {
  id: string;
  type: ActivityType;
  title: string;
  message: string;
  account?: string;
  items?: GrantedItem[];
  actions?: FloatingAction[];
  /** Sticky cards stay until dismissed or replaced (updater prompts). */
  sticky?: boolean;
  createdAt: number;
};

const DEFAULT_TTL_MS = 8_000;
const MAX_VISIBLE = 4;

function createFloatingNotifications() {
  const { subscribe, update, set } = writable<FloatingNotification[]>([]);
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  function clearTimer(id: string) {
    const timer = timers.get(id);
    if (timer) clearTimeout(timer);
    timers.delete(id);
  }

  function dismiss(id: string) {
    clearTimer(id);
    update((list) => list.filter((entry) => entry.id !== id));
  }

  function push(notification: Omit<FloatingNotification, 'createdAt'> & { createdAt?: number }) {
    const entry: FloatingNotification = {
      ...notification,
      createdAt: notification.createdAt ?? Date.now()
    };

    update((list) => {
      const withoutDup = list.filter((item) => item.id !== entry.id);
      return [entry, ...withoutDup].slice(0, MAX_VISIBLE);
    });

    clearTimer(entry.id);
    if (!entry.sticky) {
      timers.set(
        entry.id,
        setTimeout(() => dismiss(entry.id), DEFAULT_TTL_MS)
      );
    }

    return entry.id;
  }

  function patch(id: string, patch: Partial<FloatingNotification>) {
    update((list) => list.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  return {
    subscribe,
    push,
    patch,
    dismiss,
    clear() {
      for (const id of timers.keys()) clearTimer(id);
      set([]);
    }
  };
}

export const floatingNotifications = createFloatingNotifications();

export const floatingCount = derived(floatingNotifications, ($list) => $list.length);
