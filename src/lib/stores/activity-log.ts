import { get, writable, derived } from 'svelte/store';
import { sendNotificationMessage } from '$lib/modules/notification';
import { settingsStore } from '$lib/storage';

export type ActivityType = 'llama' | 'game' | 'quest' | 'info' | 'error';

export type ActivityEntry = {
  id: string;
  timestamp: Date;
  type: ActivityType;
  message: string;
  account?: string;
  read: boolean;
};

function createActivityLog() {
  const { subscribe, update, set } = writable<ActivityEntry[]>([]);

  return {
    subscribe,
    add(
      type: ActivityType,
      message: string,
      account?: string,
      options?: { notify?: boolean }
    ) {
      update((entries) => [
        {
          id: Math.random().toString(36).slice(2),
          timestamp: new Date(),
          type,
          message,
          account,
          read: false
        },
        ...entries
      ]);

      if (options?.notify === false) return;

      if (get(settingsStore).app?.windowsNotifications !== false) {
        const body = account ? `${message}\n${account}` : message;
        void sendNotificationMessage(body);
      }
    },
    markAllRead() {
      update((entries) => entries.map((e) => ({ ...e, read: true })));
    },
    clear() {
      set([]);
    }
  };
}

export const activityLog = createActivityLog();

export const unreadCount = derived(activityLog, ($log) => $log.filter((e) => !e.read).length);
