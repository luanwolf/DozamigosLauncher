import { dev } from '$app/environment';
import * as path from '@tauri-apps/api/path';
import { homeDir } from '@tauri-apps/api/path';
import { downloaderSettingsSchema } from '$lib/schemas/settings';
import { FileStore } from '$lib/storage/file-store';
import type { DownloaderSettings } from '$types/settings';

export class DownloaderStore extends FileStore<DownloaderSettings> {
  constructor() {
    super(
      'downloader',
      {
        // Resolved in init() — no top-level await (breaks SvelteKit boot / component TDZ).
        downloadPath: '',
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

  override async init() {
    await super.init();
    if (this.get().downloadPath) return;
    const downloadPath = await path.join(await homeDir(), 'Games', 'Dozamigos Launcher');
    this.set((settings) => ({ ...settings, downloadPath }));
  }
}
