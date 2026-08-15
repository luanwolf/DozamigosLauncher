import { get } from 'svelte/store';
import { t } from '$lib/i18n';
import { logger } from '$lib/logger';
import {
  checkForAvailableUpdate,
  downloadAndInstallUpdate,
  isUpdateDownloadInProgress,
  relaunchApp,
  type AppUpdateStatus
} from '$lib/modules/app-updater';
import { floatingNotifications } from '$lib/stores/floating-notifications';
import { notify } from '$lib/stores/activity-log';

const UPDATE_CARD_ID = 'launcher-update';

function statusMessage(status: AppUpdateStatus) {
  if (status.phase === 'downloading') {
    return get(t)('updater.downloading', { version: status.version, percent: status.percent ?? 0 });
  }
  if (status.phase === 'installing') {
    return get(t)('updater.installing', { version: status.version });
  }
  if (status.phase === 'ready') {
    return get(t)('updater.ready', { version: status.version });
  }
  return get(t)('updater.available', { version: status.version });
}

function showReadyCard(version: string) {
  floatingNotifications.push({
    id: UPDATE_CARD_ID,
    type: 'update',
    title: get(t)('updater.title'),
    message: get(t)('updater.ready', { version }),
    sticky: true,
    actions: [
      {
        id: 'keep:relaunch',
        label: get(t)('updater.restartNow'),
        variant: 'default',
        onClick: async () => {
          await relaunchApp();
        }
      },
      {
        id: 'later',
        label: get(t)('updater.later'),
        variant: 'outline',
        onClick: () => {
          floatingNotifications.dismiss(UPDATE_CARD_ID);
        }
      }
    ]
  });
}

async function runDownload(update: NonNullable<Awaited<ReturnType<typeof checkForAvailableUpdate>>>, relaunchWhenDone: boolean) {
  if (isUpdateDownloadInProgress()) return;

  await downloadAndInstallUpdate(update, (status) => {
    floatingNotifications.push({
      id: UPDATE_CARD_ID,
      type: 'update',
      title: get(t)('updater.title'),
      message: statusMessage(status),
      sticky: true,
      actions: []
    });
  });

  if (relaunchWhenDone) {
    await relaunchApp();
    return;
  }

  showReadyCard(update.version);
}

/**
 * Checks for a launcher update and shows a sticky floating prompt.
 * Never downloads until the user picks an action.
 */
export async function promptLauncherUpdate() {
  try {
    const update = await checkForAvailableUpdate();
    if (!update) return false;

    await notify('update', get(t)('updater.available', { version: update.version }), {
      id: UPDATE_CARD_ID,
      title: get(t)('updater.title'),
      sticky: true,
      skipNative: false,
      actions: [
        {
          id: 'keep:now',
          label: get(t)('updater.updateNow'),
          variant: 'default',
          onClick: async () => {
            await runDownload(update, true);
          }
        },
        {
          id: 'keep:background',
          label: get(t)('updater.downloadBackground'),
          variant: 'secondary',
          onClick: async () => {
            await runDownload(update, false);
          }
        },
        {
          id: 'later',
          label: get(t)('updater.later'),
          variant: 'outline',
          onClick: () => {
            floatingNotifications.dismiss(UPDATE_CARD_ID);
          }
        }
      ]
    });

    return true;
  } catch (error) {
    logger.warn('Launcher update check failed', { error });
    await notify('error', get(t)('updater.failed'), {
      title: get(t)('updater.title'),
      skipNative: true
    });
    return false;
  }
}
