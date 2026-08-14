import { setLogLevel } from '$lib/logger';
import { settingsStore } from '$lib/storage';

export const prerender = true;
export const ssr = false;

export async function load() {
  const settings = settingsStore.get();
  // Set the initial log level before anything else
  setLogLevel(settings.app?.debugLogs ? 'debug' : 'info');

  settingsStore.setLanguage('pt-br');
}
