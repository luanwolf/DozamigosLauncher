<script lang="ts" module>
  import { t } from '$lib/i18n';
  import { settingsStore } from '$lib/storage';

  type SettingKey = keyof NonNullable<AllSettings['app']>;
  type SettingValue = string | number | boolean | undefined;

  export function handleSettingChange<K extends SettingKey, V extends SettingValue = SettingValue>(
    eventOrValue: Event | V,
    key: K
  ) {
    const value = typeof eventOrValue === 'object' ? (eventOrValue.target as HTMLInputElement).value : eventOrValue;

    const newSettings: AllSettings = {
      ...get(settingsStore),
      app: {
        ...get(settingsStore).app,
        [key]: value
      }
    };

    if (!allSettingsSchema.safeParse(newSettings).success) {
      return toast.error(get(t)('settings.invalidValue'));
    }

    settingsStore.set(() => newSettings);
  }
</script>

<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import ScanSearchIcon from '@lucide/svelte/icons/scan-search';
  import { disable as autostartDisable, enable as autostartEnable } from '@tauri-apps/plugin-autostart';
  import { type } from '@tauri-apps/plugin-os';
  import { logger } from '$lib/logger';
  import { detectFortnitePath } from '$lib/modules/fortnite-install';
  import { requestNotificationPermission } from '$lib/modules/notification';
  import { allSettingsSchema } from '$lib/schemas/settings';
  import SettingItem from '$components/modules/settings/SettingItem.svelte';
  import SettingsFolderPicker from '$components/modules/settings/SettingsFolderPicker.svelte';
  import { Button } from '$components/ui/button';
  import { Switch } from '$components/ui/switch';
  import type { AllSettings } from '$types/settings';

  let isDetecting = $state(false);

  async function autoDetectFortnite() {
    isDetecting = true;
    try {
      const detectedPath = await detectFortnitePath();
      if (!detectedPath) {
        toast.error($t('settings.general.gamePath.notFound'));
        return;
      }
      handleSettingChange(detectedPath, 'gamePath');
      toast.success($t('settings.general.gamePath.detected'));
    } catch (error) {
      logger.error('Failed to auto-detect Fortnite', { error });
      toast.error($t('settings.general.gamePath.notFound'));
    } finally {
      isDetecting = false;
    }
  }

  async function rerunOnboarding() {
    handleSettingChange(false, 'onboardingDone');
    await goto('/inicio?setup');
  }

  async function handleOpenAtStartup(checked: boolean) {
    try {
      if (checked) {
        await autostartEnable();
      } else {
        await autostartDisable();
      }
      handleSettingChange(checked, 'openAtStartup');
    } catch (error) {
      toast.error($t('settings.general.openAtStartup.error'));
    }
  }

  const isDesktop = ['windows', 'macos', 'linux'].includes(type());
</script>

<div class="space-y-6">
  {#if type() === 'windows'}
    <SettingItem
      description={$t('settings.general.gamePath.description')}
      labelFor="gamePath"
      orientation="vertical"
      title={$t('settings.general.gamePath.title')}
    >
      <SettingsFolderPicker
        id="gamePath"
        defaultPath={$settingsStore.app?.gamePath || 'C:/Program Files/Epic Games'}
        onchange={(e) => handleSettingChange(e, 'gamePath')}
        placeholder="C:/Program Files/.../FortniteGame/Binaries/Win64"
        value={$settingsStore.app?.gamePath}
      />
      <Button
        class="mt-1.5 w-full"
        variant="outline"
        size="sm"
        disabled={isDetecting}
        loading={isDetecting}
        loadingText={$t('settings.general.gamePath.detecting')}
        onclick={autoDetectFortnite}
      >
        <ScanSearchIcon class="size-4" />
        {$t('settings.general.gamePath.autoDetect')}
      </Button>
    </SettingItem>
  {/if}

  {#if isDesktop}
    <SettingItem
      description={$t('settings.general.discordStatus.description')}
      labelFor="discordStatus"
      orientation="horizontal"
      title={$t('settings.general.discordStatus.title')}
    >
      <Switch
        id="discordStatus"
        checked={$settingsStore.app?.discordStatus}
        onCheckedChange={(checked) => handleSettingChange(checked, 'discordStatus')}
      />
    </SettingItem>

    <SettingItem labelFor="hideToTray" orientation="horizontal" title={$t('settings.general.hideToTray.title')}>
      <Switch
        id="hideToTray"
        checked={$settingsStore.app?.hideToTray}
        onCheckedChange={(checked) => handleSettingChange(checked, 'hideToTray')}
      />
    </SettingItem>

    <SettingItem labelFor="openAtStartup" orientation="horizontal" title={$t('settings.general.openAtStartup.title')}>
      <Switch id="openAtStartup" checked={$settingsStore.app?.openAtStartup} onCheckedChange={handleOpenAtStartup} />
    </SettingItem>

    <SettingItem
      description={$t('settings.general.windowsNotifications.description')}
      labelFor="windowsNotifications"
      orientation="horizontal"
      title={$t('settings.general.windowsNotifications.title')}
    >
      <Switch
        id="windowsNotifications"
        checked={$settingsStore.app?.windowsNotifications ?? true}
        onCheckedChange={async (checked) => {
          if (checked) {
            const granted = await requestNotificationPermission();
            if (!granted) {
              toast.error($t('settings.general.windowsNotifications.denied'));
              return;
            }
          }
          handleSettingChange(checked, 'windowsNotifications');
        }}
      />
    </SettingItem>

    <SettingItem
      description={$t('settings.general.showXrayTickets.description')}
      labelFor="showXrayTickets"
      orientation="horizontal"
      title={$t('settings.general.showXrayTickets.title')}
    >
      <Switch
        id="showXrayTickets"
        checked={$settingsStore.app?.showXrayTickets ?? true}
        onCheckedChange={(checked) => handleSettingChange(checked, 'showXrayTickets')}
      />
    </SettingItem>

    <SettingItem
      description={$t('settings.general.showStwGold.description')}
      labelFor="showStwGold"
      orientation="horizontal"
      title={$t('settings.general.showStwGold.title')}
    >
      <Switch
        id="showStwGold"
        checked={$settingsStore.app?.showStwGold ?? true}
        onCheckedChange={(checked) => handleSettingChange(checked, 'showStwGold')}
      />
    </SettingItem>

    <SettingItem
      description={$t('settings.general.steamFreeGamesNotifications.description')}
      labelFor="steamFreeGamesNotifications"
      orientation="horizontal"
      title={$t('settings.general.steamFreeGamesNotifications.title')}
    >
      <Switch
        id="steamFreeGamesNotifications"
        checked={$settingsStore.app?.steamFreeGamesNotifications === true}
        onCheckedChange={async (checked) => {
          if (checked) {
            const granted = await requestNotificationPermission();
            if (!granted) {
              toast.error($t('settings.general.windowsNotifications.denied'));
              return;
            }
            if ($settingsStore.app?.windowsNotifications === false) {
              handleSettingChange(true, 'windowsNotifications');
            }
          }
          handleSettingChange(checked, 'steamFreeGamesNotifications');
        }}
      />
    </SettingItem>
  {/if}

  <SettingItem
    description={$t('settings.general.rerunOnboarding.description')}
    orientation="horizontal"
    title={$t('settings.general.rerunOnboarding.title')}
  >
    <Button onclick={rerunOnboarding} size="sm" variant="outline">
      {$t('settings.general.rerunOnboarding.action')}
    </Button>
  </SettingItem>
</div>
