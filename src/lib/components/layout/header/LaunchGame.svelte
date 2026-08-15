<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { get } from 'svelte/store';
  import { path } from '@tauri-apps/api';
  import { defaultClient, launcherAppClient2 } from '$lib/constants/clients';
  import { t } from '$lib/i18n';
  import { getCachedToken } from '$lib/modules/auth-session';
  import { getAccessTokenUsingExchangeCode, getExchangeCodeUsingAccessToken } from '$lib/modules/authentication';
  import { getFortniteManifest } from '$lib/modules/manifest';
  import { allSettingsSchema } from '$lib/schemas/settings';
  import { accountStore, settingsStore } from '$lib/storage';
  import { runningAppIds } from '$lib/stores';
  import { launchApp, stopApp, type LaunchAppOptions } from '$lib/tauri';
  import { handleError, sleep } from '$lib/utils';
  import AccountCombobox from '$components/ui/AccountCombobox.svelte';
  import { Button } from '$components/ui/button';
  import * as Dialog from '$components/ui/dialog';
  import { Input } from '$components/ui/input';
  import { Label } from '$components/ui/label';
  import { Switch } from '$components/ui/switch';
  import { TagInput } from '$components/ui/tag-input';
  import type { AllSettings } from '$types/settings';

  const activeAccount = accountStore.getActiveStore(true);
  const fortniteAppId = 'Fortnite';
  const launchData: LaunchAppOptions['launchData'] = {
    game_id: fortniteAppId,
    game_parameters: [],
    game_executable: 'FortniteGame/Binaries/Win64/FortniteLauncher.exe',
    game_directory: '',
    egl_parameters: [],
    launch_command: [],
    working_directory: '',
    user_parameters: [],
    environment: {},
    pre_launch_command: '',
    pre_launch_wait: false
  };

  let isLaunching = $state(false);
  let isStopping = $state(false);
  let dialogOpen = $state(false);
  let selectedAccountId = $state('');
  let aliasDraft = $state('');
  let tagsDraft = $state<string[]>([]);
  let showXrayTickets = $state(true);
  let showStwGold = $state(true);
  let steamFreeGamesNotifications = $state(false);

  function openLaunchDialog() {
    if (runningAppIds.has(fortniteAppId)) {
      toast.error($t('launchGame.alreadyRunning'));
      return;
    }

    const account = $activeAccount ?? $accountStore.accounts[0] ?? null;
    if (!account) {
      toast.error($t('accountManager.selectAccount'));
      return;
    }

    selectedAccountId = account.accountId;
    aliasDraft = account.alias ?? '';
    tagsDraft = [...(account.tags ?? [])];
    showXrayTickets = $settingsStore.app?.showXrayTickets !== false;
    showStwGold = $settingsStore.app?.showStwGold !== false;
    steamFreeGamesNotifications = $settingsStore.app?.steamFreeGamesNotifications === true;
    dialogOpen = true;
  }

  let lastSyncedAccountId = $state('');

  $effect(() => {
    if (!dialogOpen) {
      lastSyncedAccountId = '';
      return;
    }

    const accountId = selectedAccountId;
    if (!accountId || accountId === lastSyncedAccountId) return;

    const account = $accountStore.accounts.find((entry) => entry.accountId === accountId);
    if (!account) return;

    lastSyncedAccountId = accountId;
    aliasDraft = account.alias ?? '';
    tagsDraft = [...(account.tags ?? [])];
  });

  function persistLaunchPreferences() {
    const next: AllSettings = {
      ...get(settingsStore),
      app: {
        ...get(settingsStore).app,
        showXrayTickets,
        showStwGold,
        steamFreeGamesNotifications
      }
    };

    if (!allSettingsSchema.safeParse(next).success) {
      toast.error($t('settings.invalidValue'));
      return false;
    }

    settingsStore.set(() => next);
    return true;
  }

  async function confirmAndLaunch() {
    if (!selectedAccountId) {
      toast.error($t('accountManager.selectAccount'));
      return;
    }

    if (!persistLaunchPreferences()) return;

    accountStore.update(selectedAccountId, {
      alias: aliasDraft.trim() || undefined,
      tags: tagsDraft.map((tag) => tag.trim()).filter(Boolean)
    });
    accountStore.setActive(selectedAccountId);
    dialogOpen = false;
    await launchFortnite();
  }

  async function launchFortnite() {
    if (runningAppIds.has(fortniteAppId)) {
      toast.error($t('launchGame.alreadyRunning'));
      return;
    }

    isLaunching = true;
    const toastId = toast.loading($t('launchGame.launching'));

    try {
      const settings = settingsStore.get();
      const manifestData = await getFortniteManifest();
      const customPath = settings.app?.gamePath;

      let gameDirectory = manifestData?.installLocation;
      if (customPath) {
        const [customInstallDir] = customPath.replaceAll('\\', '/').split('/FortniteGame/Binaries/Win64');
        gameDirectory = customInstallDir;
      }

      if (!gameDirectory) {
        toast.error($t('launchGame.notInstalled'), { id: toastId });
        return;
      }

      launchData.game_directory = gameDirectory;
      launchData.working_directory = await path.join(gameDirectory, 'FortniteGame/Binaries/Win64');

      const accessToken = await getCachedToken($activeAccount!, defaultClient, true);
      const oldExchangeData = await getExchangeCodeUsingAccessToken(accessToken);
      const launcherAccessTokenData = await getAccessTokenUsingExchangeCode(oldExchangeData.code, launcherAppClient2);
      const launcherExchangeData = await getExchangeCodeUsingAccessToken(launcherAccessTokenData.access_token);

      launchData.game_parameters = manifestData?.launchCommand.split(' ') || [];
      launchData.user_parameters = settings.app?.launchArguments?.split(' ') || [];
      launchData.egl_parameters = [
        '-AUTH_LOGIN=unused',
        `-AUTH_PASSWORD=${launcherExchangeData.code}`,
        '-AUTH_TYPE=exchangecode',
        '-epicapp=Fortnite',
        '-epicenv=Prod',
        '-EpicPortal',
        `-epicusername=${$activeAccount!.displayName}`,
        `-epicuserid=${$activeAccount!.accountId}`,
        `-epicsandboxid=${manifestData?.namespace || 'fn'}`
      ];

      await launchApp({ launchData });
    } catch (error) {
      handleError({
        error,
        message: 'Failed to launch Fortnite',
        toastId: false,
        account: $activeAccount || undefined
      });

      if (typeof error === 'string' && error.toLowerCase().includes('executable not found')) {
        toast.error($t('launchGame.notInstalled'), { id: toastId });
      } else {
        toast.error($t('launchGame.failedToLaunch'), { id: toastId });
      }
    } finally {
      isLaunching = false;
    }
  }

  async function stopFortnite() {
    isStopping = true;

    const toastId = toast.loading($t('launchGame.stopping'));

    try {
      await stopApp({ appId: fortniteAppId });
      toast.success($t('launchGame.stopped'), { id: toastId });
    } catch (error) {
      handleError({
        error,
        message: $t('launchGame.failedToStop'),
        toastId,
        account: $activeAccount || undefined
      });
    } finally {
      // A delay to ensure the app was killed properly
      await sleep(2000);
      isStopping = false;
    }
  }
</script>

<Button
  class="launch-cta flex shrink-0 items-center justify-center gap-x-2"
  disabled={!$activeAccount || (isLaunching && !runningAppIds.has(fortniteAppId)) || isStopping}
  onclick={() => (runningAppIds.has(fortniteAppId) ? stopFortnite() : openLaunchDialog())}
  variant={runningAppIds.has(fortniteAppId) ? 'destructive' : 'default'}
>
  {#if runningAppIds.has(fortniteAppId)}
    <span class="max-[640px]:hidden">{$t('launchGame.stop')}</span>
    <span class="min-[641px]:hidden">Stop</span>
  {:else}
    <span class="max-[640px]:hidden">{$t('launchGame.launch')}</span>
    <span class="min-[641px]:hidden">Play</span>
  {/if}
</Button>

<Dialog.Root bind:open={dialogOpen}>
  <Dialog.Content class="sm:max-w-lg">
    <Dialog.Header>
      <Dialog.Title>{$t('launchGame.profile.title')}</Dialog.Title>
      <Dialog.Description>{$t('launchGame.profile.description')}</Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-1">
      <div class="space-y-1.5">
        <Label>{$t('launchGame.profile.account')}</Label>
        <AccountCombobox type="single" bind:value={selectedAccountId} />
      </div>

      <div class="space-y-1.5">
        <Label for="launch-alias">{$t('accountHub.customization.alias')}</Label>
        <Input
          id="launch-alias"
          maxlength={32}
          placeholder={$t('accountHub.customization.aliasPlaceholder')}
          bind:value={aliasDraft}
        />
      </div>

      <div class="space-y-1.5">
        <Label>{$t('accountHub.customization.tags')}</Label>
        <TagInput placeholder={$t('accountHub.customization.tagsPlaceholder')} bind:items={tagsDraft} />
      </div>

      <div class="space-y-3 rounded-none border border-border/70 p-3">
        <p class="text-sm font-medium">{$t('launchGame.profile.headerBalances')}</p>
        <div class="flex items-center justify-between gap-3">
          <Label for="launch-show-xray">{$t('stw.xrayTickets')}</Label>
          <Switch id="launch-show-xray" bind:checked={showXrayTickets} />
        </div>
        <div class="flex items-center justify-between gap-3">
          <Label for="launch-show-gold">{$t('stw.gold')}</Label>
          <Switch id="launch-show-gold" bind:checked={showStwGold} />
        </div>
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <Label for="launch-steam-notify">{$t('launchGame.profile.steamNotifications')}</Label>
            <p class="text-xs text-muted-foreground">{$t('launchGame.profile.steamNotificationsHint')}</p>
          </div>
          <Switch id="launch-steam-notify" bind:checked={steamFreeGamesNotifications} />
        </div>
      </div>
    </div>

    <Dialog.Footer>
      <Button onclick={() => (dialogOpen = false)} variant="outline">{$t('cancel')}</Button>
      <Button disabled={!selectedAccountId || isLaunching} loading={isLaunching} onclick={confirmAndLaunch}>
        {$t('launchGame.profile.confirm')}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
