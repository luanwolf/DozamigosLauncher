import { get } from 'svelte/store';
import { t } from '$lib/i18n';
import { logger } from '$lib/logger';
import {
  checkForAvailableUpdate,
  downloadAndInstallUpdate,
  hasPendingRelaunch,
  isUpdateDownloadInProgress,
  relaunchApp
} from '$lib/modules/app-updater';
import { dismissAchievement, pushAchievement, updateAchievement } from '$lib/stores/achievement-toasts';
import { notify } from '$lib/stores/activity-log';
import { pendingLauncherUpdate } from '$lib/stores/pending-launcher-update';

const TOAST_ID = 'launcher-update';

type UpdateHandle = NonNullable<Awaited<ReturnType<typeof checkForAvailableUpdate>>>;

/** Postponing hides the card but keeps the update reachable from the sidebar. */
function postpone(version: string, reopen: () => void) {
  dismissAchievement(TOAST_ID);
  pendingLauncherUpdate.set({ version, reopen });
}

function showDownloading(version: string, percent = 0) {
  updateAchievement(TOAST_ID, {
    title: get(t)('updater.toastTitle'),
    message: get(t)('updater.downloading', { version, percent }),
    progress: percent,
    sticky: true,
    actions: []
  });
}

function showReadyToRestart(version: string, onRestart: () => void | Promise<void>) {
  pendingLauncherUpdate.set(null);

  pushAchievement({
    id: TOAST_ID,
    title: get(t)('updater.toastTitle'),
    message: get(t)('updater.ready', { version }),
    sticky: true,
    actions: [
      {
        id: 'restart',
        label: get(t)('updater.restartNow'),
        primary: true,
        onClick: () => {
          pendingLauncherUpdate.set(null);
          return onRestart();
        }
      },
      {
        id: 'later',
        label: get(t)('updater.later'),
        onClick: () => postpone(version, () => showReadyToRestart(version, onRestart))
      }
    ]
  });
}

/** Announces the update with now / background / later. */
function showAvailable(
  version: string,
  onUpdateNow: () => void,
  onBackground: () => void
) {
  const title = get(t)('updater.toastTitle');
  const message = get(t)('updater.available', { version });

  pendingLauncherUpdate.set(null);

  pushAchievement({
    id: TOAST_ID,
    title,
    message,
    sticky: true,
    actions: [
      { id: 'now', label: get(t)('updater.updateNow'), primary: true, onClick: onUpdateNow },
      { id: 'background', label: get(t)('updater.downloadBackground'), onClick: onBackground },
      {
        id: 'later',
        label: get(t)('updater.later'),
        onClick: () => postpone(version, () => showAvailable(version, onUpdateNow, onBackground))
      }
    ]
  });

  void notify('update', message, { title, id: TOAST_ID, skipNative: true });
}

async function runDownload(update: UpdateHandle, opts: { quiet?: boolean } = {}) {
  if (!opts.quiet) showDownloading(update.version);

  try {
    await downloadAndInstallUpdate(update, (status) => {
      if (opts.quiet) return;
      if (status.phase === 'downloading') {
        showDownloading(update.version, status.percent ?? 0);
      } else if (status.phase === 'installing') {
        updateAchievement(TOAST_ID, {
          message: get(t)('updater.installing', { version: update.version }),
          progress: 100
        });
      }
    });

    showReadyToRestart(update.version, relaunchApp);
  } catch (error) {
    logger.error('Launcher update download failed', { error });
    pushAchievement({
      id: TOAST_ID,
      title: get(t)('updater.toastTitle'),
      message: get(t)('updater.failed'),
      sticky: false
    });
  }
}

/** Checks for a newer signed build and offers it. Never installs on its own. */
export async function promptLauncherUpdate() {
  if (isUpdateDownloadInProgress() || hasPendingRelaunch()) return;

  try {
    const update = await checkForAvailableUpdate();
    if (!update) return;

    showAvailable(
      update.version,
      () => void runDownload(update),
      () => {
        dismissAchievement(TOAST_ID);
        void runDownload(update, { quiet: true });
      }
    );
  } catch (error) {
    logger.debug('Launcher update check failed', { error });
  }
}

/**
 * Dev-only walkthrough of the same toast states with a fake download, so the UI
 * can be reviewed without publishing a signed release. Restart is a no-op here.
 */
export function simulateLauncherUpdate(version = '9.9.9') {
  const fakeDownload = (quiet: boolean) => {
    if (quiet) dismissAchievement(TOAST_ID);
    else showDownloading(version, 0);

    let percent = 0;
    const timer = setInterval(() => {
      percent = Math.min(100, percent + 7);
      if (!quiet) showDownloading(version, percent);

      if (percent < 100) return;

      clearInterval(timer);
      if (!quiet) {
        updateAchievement(TOAST_ID, { message: get(t)('updater.installing', { version }) });
      }
      setTimeout(() => showReadyToRestart(version, () => dismissAchievement(TOAST_ID)), quiet ? 400 : 700);
    }, 160);
  };

  showAvailable(version, () => fakeDownload(false), () => fakeDownload(true));
}
