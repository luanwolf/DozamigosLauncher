export type AppUpdateStatus = {
  phase: 'available' | 'downloading' | 'installing' | 'ready';
  version: string;
  percent?: number;
};

type UpdateHandle = NonNullable<Awaited<ReturnType<typeof checkForAvailableUpdate>>>;

let activeDownload: Promise<void> | null = null;
let pendingRelaunch: UpdateHandle | null = null;

/** Checks GitHub Releases for a newer signed build. Never installs. */
export async function checkForAvailableUpdate() {
  if (import.meta.env.DEV) return null;

  const { check } = await import('@tauri-apps/plugin-updater');
  return check({ timeout: 30_000 });
}

export function isUpdateDownloadInProgress() {
  return activeDownload != null;
}

export function hasPendingRelaunch() {
  return pendingRelaunch != null;
}

/**
 * Downloads and installs the given update. Does not relaunch.
 * Concurrent calls share the in-flight promise.
 */
export async function downloadAndInstallUpdate(
  update: UpdateHandle,
  onStatus: (status: AppUpdateStatus) => void
) {
  if (activeDownload) {
    await activeDownload;
    return;
  }

  activeDownload = (async () => {
    let downloaded = 0;
    let total = 0;
    onStatus({ phase: 'available', version: update.version });

    await update.downloadAndInstall((event) => {
      if (event.event === 'Started') {
        total = event.data.contentLength ?? 0;
        onStatus({ phase: 'downloading', version: update.version, percent: 0 });
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

    pendingRelaunch = update;
    onStatus({ phase: 'ready', version: update.version });
  })();

  try {
    await activeDownload;
  } finally {
    activeDownload = null;
  }
}

export async function relaunchApp() {
  const { relaunch } = await import('@tauri-apps/plugin-process');
  await relaunch();
}

/**
 * Legacy helper: check → download → relaunch in one shot.
 * Prefer the prompted flow via checkForAvailableUpdate + downloadAndInstallUpdate.
 */
export async function installAvailableUpdate(onStatus: (status: AppUpdateStatus) => void) {
  const update = await checkForAvailableUpdate();
  if (!update) return false;
  await downloadAndInstallUpdate(update, onStatus);
  await relaunchApp();
  return true;
}
