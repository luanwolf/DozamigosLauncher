import { dev } from '$app/environment';
import type { Locale } from '$lib/paraglide/runtime';
import { allSettingsSchema } from '$lib/schemas/settings';
import { FileStore } from '$lib/storage/file-store';
import type { AllSettings } from '$types/settings';

export class SettingsStore extends FileStore<AllSettings> {
  constructor() {
    super(
      'settings',
      {
        app: {
          language: 'pt-br',
          claimRewardsDelay: 1.5,
          missionCheckInterval: 5,
          discordStatus: !dev,
          hideToTray: false,
          openAtStartup: false,
          debugLogs: dev,
          windowsNotifications: true
        }
      },
      allSettingsSchema
    );
  }

  setLanguage(language: Locale) {
    this.set((settings) => {
      settings.app ??= {};
      settings.app.language = language;
      return settings;
    });
  }
}
