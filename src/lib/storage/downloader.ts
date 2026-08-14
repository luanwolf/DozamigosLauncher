import { dev } from '$app/environment';
import * as path from '@tauri-apps/api/path';
import { homeDir } from '@tauri-apps/api/path';
import { downloaderSettingsSchema } from '$lib/schemas/settings';
import { FileStore } from '$lib/storage/file-store';
import type { DownloaderSettings } from '$types/settings';

const downloadPath = await path.join(await homeDir(), 'Games', 'Dozamigos Launcher');

export class DownloaderStore extends FileStore<DownloaderSettings> {
  constructor() {
    super(
      'downloader',
      {
        downloadPath,
        autoUpdate: !dev,
        sendNotifications: true,
        favoriteApps: [],
        hiddenApps: [],
        perAppAutoUpdate: {},
        queue: {}
      },
      downloaderSettingsSchema
    );
  }
}
