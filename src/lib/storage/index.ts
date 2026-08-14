import { AccountStore } from '$lib/storage/account';
import { AutomationStore } from '$lib/storage/automation';
import { DeviceAuthsStore } from '$lib/storage/device-auths';
import { DownloaderStore } from '$lib/storage/downloader';
import { SettingsStore } from '$lib/storage/settings';

const accountStore = new AccountStore();
const automationStore = new AutomationStore();
const deviceAuthsStore = new DeviceAuthsStore();
const downloaderStore = new DownloaderStore();
const settingsStore = new SettingsStore();

await Promise.all([
  accountStore.init(),
  automationStore.init(),
  deviceAuthsStore.init(),
  downloaderStore.init(),
  settingsStore.init()
]);

export { accountStore, automationStore, deviceAuthsStore, downloaderStore, settingsStore };
