export type AppUpdateStatus = {
  phase: 'available' | 'downloading' | 'installing';
  version: string;
  percent?: number;
};

/**
 * Checks GitHub Releases, installs a newer signed build and restarts the app.
 * Development builds never contact the release endpoint.
 */
export async function installAvailableUpdate(onStatus: (status: AppUpdateStatus) => void) {
  if (import.meta.env.DEV) return false;

  const [{ check }, { relaunch }] = await Promise.all([
    import('@tauri-apps/plugin-updater'),
    import('@tauri-apps/plugin-process')
  ]);
  const update = await check({ timeout: 30_000 });
  if (!update) return false;

  let downloaded = 0;
  let total = 0;
  onStatus({ phase: 'available', version: update.version });

  await update.downloadAndInstall((event) => {
    if (event.event === 'Started') {
      total = event.data.contentLength ?? 0;
    } else if (event.event === 'Progress') {
      downloaded += event.data.chunkLength;
      onStatus({
        phase: 'downloading',
        version: update.version,
        percent: total ? Math.min(100, Math.round((downloaded / total) * 100)) : undefined
      });
    } else if (event.event === 'Finished') {
      onStatus({ phase: 'installing', version: update.version });
    }
  });

  await relaunch();
  return true;
}
