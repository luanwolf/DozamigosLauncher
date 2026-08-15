import { AccountStore } from '$lib/storage/account';
import { AutomationStore } from '$lib/storage/automation';
import { DeviceAuthsStore } from '$lib/storage/device-auths';
import { DownloaderStore } from '$lib/storage/downloader';
import { SettingsStore } from '$lib/storage/settings';

export const accountStore = new AccountStore();
export const automationStore = new AutomationStore();
export const deviceAuthsStore = new DeviceAuthsStore();
export const downloaderStore = new DownloaderStore();
export const settingsStore = new SettingsStore();

let initPromise: Promise<void> | null = null;

/** Idempotent store bootstrap — call from layout load, never as top-level await. */
export function initStores() {
  if (!initPromise) {
    initPromise = Promise.all([
      accountStore.init(),
      automationStore.init(),
      deviceAuthsStore.init(),
      downloaderStore.init(),
      settingsStore.init()
    ]).then(() => undefined);
  }
  return initPromise;
}
