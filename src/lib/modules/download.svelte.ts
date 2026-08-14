import { toast } from 'svelte-sonner';
import { get, writable } from 'svelte/store';
import type { z } from 'zod';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { t } from '$lib/i18n';
import { getChildLogger } from '$lib/logger';
import { configPath, getLegendaryAccount } from '$lib/modules/legendary';
import { sendNotificationMessage } from '$lib/modules/notification';
import type { queueItemSchema } from '$lib/schemas/settings';
import { downloaderStore } from '$lib/storage';
import { ownedAppsCache } from '$lib/stores';
import { startLegendaryStream, stopLegendaryStream, type LegendaryStreamEvent } from '$lib/tauri';
import type { ParsedApp } from '$types/legendary';

const logger = getChildLogger('DownloadManager');

type DownloadType = 'install' | 'update' | 'repair';
type QueueItem = z.infer<typeof queueItemSchema>;
type DownloadCallbacks = Partial<{
  onProgress: (progress: Partial<DownloadProgress>) => void;
  onComplete: (success: boolean, code?: number) => void;
  onError: (error: string) => void;
}>;

export type DownloadProgress = {
  actualDownloadSize: number;
  currentDownloadSize: number;
  percent: number;
  etaMs: number;
  downloaded: number;
  downloadSpeed: number;
  diskWriteSpeed: number;
};

export const downloadingAppId = writable<string | null>(null);
export const downloadProgress = writable<Partial<DownloadProgress>>({});
export const downloadQueue = writable<QueueItem[]>([]);

let activeDownload: {
  streamId: string;
  unlisten: UnlistenFn;
  callbacks: DownloadCallbacks;
  cancelled?: boolean;
  paused?: boolean;
} | null = null;

export async function initDownloader() {
  const downloaderSettings = downloaderStore.get();
  const accountId = await getLegendaryAccount();
  const savedQueue = accountId ? downloaderSettings.queue?.[accountId] : null;

  if (!downloaderSettings.queue || !accountId || !savedQueue?.length) {
    return;
  }

  for (const item of savedQueue) {
    if (item.status === 'downloading') {
      item.status = 'paused';
    }
  }

  downloadQueue.set(downloaderSettings.queue[accountId]);
  await processQueue(true);
}

export async function addToQueue(app: ParsedApp, installTags: string[] = []) {
  const currentQueue = get(downloadQueue);
  const existingItem = currentQueue.find(({ item }) => item.id === app.id);

  if (existingItem && ['queued', 'downloading', 'paused'].includes(existingItem.status)) {
    throw new Error('App is already in the download queue');
  }

  downloadQueue.set([
    // Removes queue items with `completed` or `failed` status
    ...currentQueue.filter(({ item }) => item.id !== app.id),
    {
      status: 'queued',
      item: app,
      installTags,
      addedAt: Date.now()
    }
  ]);

  await saveQueueToFile();
  await processQueue();
}

export async function removeFromQueue(appId: string) {
  if (get(downloadingAppId) === appId) {
    await cancelDownload();
  }

  downloadQueue.update((q) => q.filter(({ item }) => item.id !== appId));
  await saveQueueToFile();
}

export async function moveQueueItem(appId: string, direction: 'up' | 'down') {
  const currentQueue = get(downloadQueue);
  const queueIndexes = currentQueue
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.status === 'queued')
    .map(({ index }) => index);

  const currentQueuePosition = queueIndexes.findIndex((i) => currentQueue[i].item.id === appId);
  if (currentQueuePosition === -1) return;

  const newQueuePosition = direction === 'up' ? currentQueuePosition - 1 : currentQueuePosition + 1;

  if (newQueuePosition < 0 || newQueuePosition >= queueIndexes.length) {
    return;
  }

  const currentIndex = queueIndexes[currentQueuePosition];
  const targetIndex = queueIndexes[newQueuePosition];

  downloadQueue.update((q) => {
    [q[currentIndex], q[targetIndex]] = [q[targetIndex], q[currentIndex]];
    return [...q];
  });

  await saveQueueToFile();
}

export function isInQueue(appId: string) {
  return get(downloadQueue).some(
    ({ item, status }) => item.id === appId && ['queued', 'downloading', 'paused'].includes(status)
  );
}

export async function processQueue(processPaused = false) {
  const currentQueue = get(downloadQueue);
  const pausedItem = currentQueue.find(({ status }) => status === 'paused');

  let item: QueueItem | undefined;
  if (pausedItem) {
    item = processPaused ? pausedItem : undefined;
  } else {
    item = currentQueue.find(({ status }) => status === 'queued');
  }

  const currentDownloadingAppId = get(downloadingAppId);
  if (!item || (currentDownloadingAppId && item.status !== 'paused')) return;

  const app = item.item;
  const type: DownloadType = app.requiresRepair ? 'repair' : app.hasUpdate ? 'update' : 'install';

  downloadingAppId.set(app.id);

  if (item.status !== 'paused') {
    downloadProgress.set({
      actualDownloadSize: 0,
      currentDownloadSize: 0,
      percent: 0,
      etaMs: 0,
      downloaded: 0,
      downloadSpeed: 0,
      diskWriteSpeed: 0
    });
  }

  item.startedAt = Date.now();
  await setItemStatus(item, 'downloading');

  try {
    await start(app, type, item.installTags, {
      onProgress: (incoming: Partial<DownloadProgress>) => {
        downloadProgress.update((current) => {
          const next = { ...current, ...incoming };

          next.percent =
            next.actualDownloadSize && next.downloaded && next.actualDownloadSize > 0
              ? (next.downloaded / next.actualDownloadSize) * 100
              : 0;

          return next;
        });
      },
      onComplete: async (success) => {
        const downloaderSettings = downloaderStore.get();

        if (success) {
          app.installed = true;
          app.hasUpdate = false;
          app.requiresRepair = false;

          item.completedAt = Date.now();

          const notificationMessage = get(t)(
            type === 'repair'
              ? 'library.app.repaired'
              : type === 'update'
                ? 'library.app.updated'
                : 'library.app.installed',
            { name: app.title }
          );

          toast.success(notificationMessage);

          if (downloaderSettings.sendNotifications) {
            sendNotificationMessage(notificationMessage).catch((error) => {
              logger.error('Failed to send download notification', { error });
            });
          }

          ownedAppsCache.update((apps) => {
            const appIndex = apps.findIndex((x) => x.id === app.id);
            if (appIndex !== -1) {
              apps[appIndex] = app;
            } else {
              apps.push(app);
            }

            return apps;
          });

          await setItemStatus(item, 'completed');
        } else if (!activeDownload?.cancelled && !activeDownload?.paused) {
          await handleDownloadError(item, type);
        }

        if (!activeDownload?.paused) {
          await cleanupActiveDownload();
        }
      },
      onError: async (error) => {
        await handleDownloadError(item, type, error);
        await cleanupActiveDownload();
      }
    });
  } catch (error) {
    await handleDownloadError(item, type, error);
    await cleanupActiveDownload();
  }
}

export async function cancelDownload() {
  if (!activeDownload) return;

  activeDownload.cancelled = true;

  // If it's paused, the stream has already been stopped so just clean it up
  if (activeDownload.paused) {
    const currentDownloadingAppId = get(downloadingAppId);
    downloadQueue.update((q) => q.filter((qi) => qi.item.id !== currentDownloadingAppId));
    await cleanupActiveDownload();
  } else {
    await stopLegendaryStream({
      streamId: activeDownload.streamId,
      forceKillAll: true
    });
  }
}

export async function pauseDownload() {
  if (!activeDownload || activeDownload.paused) return;

  activeDownload.paused = true;

  await stopLegendaryStream({
    streamId: activeDownload.streamId,
    forceKillAll: true
  });

  activeDownload.unlisten();
  activeDownload.streamId = '';

  const currentDownloadingAppId = get(downloadingAppId);
  const item = get(downloadQueue).find(({ item }) => item.id === currentDownloadingAppId);
  if (item) {
    await setItemStatus(item, 'paused');
  }
}

export function resumeDownload() {
  return processQueue(true);
}

async function handleDownloadError(item: QueueItem, type: DownloadType, error?: unknown) {
  const app = item.item;

  if (error) logger.error('Download error', { id: app.id, error });
  const errorMessage = get(t)(
    type === 'repair'
      ? 'library.app.failedToRepair'
      : type === 'update'
        ? 'library.app.failedToUpdate'
        : 'library.app.failedToInstall',
    { name: app.title }
  );

  toast.error(errorMessage);

  item.completedAt = Date.now();
  await setItemStatus(item, 'failed');
}

async function start(
  app: ParsedApp,
  type: DownloadType,
  installTags: string[] = [],
  callbacks: DownloadCallbacks = {}
) {
  const settings = downloaderStore.get();
  const streamId = `${type}_${app.id}`;
  const args = [type, app.id, '-y', '--base-path', settings.downloadPath!];

  if (type === 'install') {
    args.push('--skip-dlcs');
  }

  if (installTags?.length) {
    for (const tag of installTags) {
      args.push('--install-tag', tag);
    }
  } else {
    args.push('--skip-sdl');
  }

  const unlisten = await listen<LegendaryStreamEvent>(`legendary_stream:${streamId}`, (event) => {
    const payload = event.payload;

    logger.debug('Stream event', {
      streamId: payload.stream_id,
      type: payload.event_type,
      data: payload.data?.slice(-512),
      code: payload.code,
      signal: payload.signal
    });

    switch (payload.event_type) {
      case 'stdout':
      case 'stderr': {
        const result = parseDownloadOutput(payload.data);
        if (Object.keys(result).length) {
          callbacks.onProgress?.(result);
        }
        break;
      }

      case 'terminated': {
        callbacks.onComplete?.(payload.code === 0, payload.code);
        break;
      }

      case 'error': {
        callbacks.onError?.(payload.data);
        break;
      }
    }
  });

  await startLegendaryStream({ configPath, args, streamId });
  activeDownload = { streamId, unlisten, callbacks };
  return streamId;
}

function setItemStatus(item: QueueItem, status: QueueItem['status']) {
  item.status = status;
  downloadQueue.update((q) => [...q]);

  return saveQueueToFile();
}

async function saveQueueToFile() {
  const accountId = (await getLegendaryAccount())!;
  return downloaderStore.set((settings) => {
    settings.queue = {
      ...settings.queue,
      [accountId]: get(downloadQueue)
    };

    return settings;
  });
}

async function cleanupActiveDownload() {
  if (!activeDownload?.paused) {
    activeDownload?.unlisten();
  }

  activeDownload = null;
  downloadingAppId.set(null);
  downloadProgress.set({});

  try {
    await processQueue();
  } catch (error) {
    logger.error('Failed to process download queue', { error });
  }
}

function parseDownloadOutput(output: string) {
  const MiBtoBytes = (mib: string) => Number.parseFloat(mib) * 1024 * 1024;
  const result: Partial<DownloadProgress> = {};
  const currentProgress = get(downloadProgress);

  let match = output.match(/Download size: ([\d.]+) MiB/);
  if (match) {
    result.currentDownloadSize = MiBtoBytes(match[1]);

    if (!currentProgress.actualDownloadSize) {
      result.actualDownloadSize = result.currentDownloadSize;
    }

    return result;
  }

  match = output.match(/ETA: (\d{2}:\d{2}:\d{2})/);
  if (match) {
    const [h, m, s] = match[1].split(':').map(Number);
    result.etaMs = (h * 3600 + m * 60 + s) * 1000;
    return result;
  }

  match = output.match(/Downloaded: ([\d.]+) MiB/);
  if (match) {
    const downloaded = MiBtoBytes(match[1]);
    const totalDownloaded = downloaded + currentProgress.actualDownloadSize! - currentProgress.currentDownloadSize!;

    result.percent = (totalDownloaded / currentProgress.actualDownloadSize!) * 100;
    result.downloaded = totalDownloaded;
    return result;
  }

  match = output.match(/Download\s+- ([\d.]+) MiB\/s \(raw\)/);
  if (match) {
    result.downloadSpeed = MiBtoBytes(match[1]);
    return result;
  }

  match = output.match(/Disk\s+- ([\d.]+) MiB\/s \(write\)/);
  if (match) {
    result.diskWriteSpeed = MiBtoBytes(match[1]);
    return result;
  }

  return {};
}
