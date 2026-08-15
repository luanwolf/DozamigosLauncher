export const prerender = true;
export const ssr = false;

export async function load() {
  // Zero static imports — any static pull of $lib/storage caused
  // "Cannot access 'prerender' before initialization" during SvelteKit boot.
  const [{ initStores, settingsStore }, { setLogLevel }] = await Promise.all([
    import('$lib/storage'),
    import('$lib/logger')
  ]);

  await initStores();

  const settings = settingsStore.get() ?? { app: {} };
  setLogLevel(settings.app?.debugLogs ? 'debug' : 'info');
  settingsStore.setLanguage('pt-br');
}
