<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { goto } from '$app/navigation';
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
  import CheckIcon from '@lucide/svelte/icons/check';
  import CircleUserIcon from '@lucide/svelte/icons/circle-user';
  import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
  import ScanSearchIcon from '@lucide/svelte/icons/scan-search';
  import { type } from '@tauri-apps/plugin-os';
  import { t } from '$lib/i18n';
  import { logger } from '$lib/logger';
  import { detectFortnitePath } from '$lib/modules/fortnite-install';
  import { accountStore, settingsStore } from '$lib/storage';
  import LoginModal from '$components/modules/login/LoginModal.svelte';
  import SettingsFolderPicker from '$components/modules/settings/SettingsFolderPicker.svelte';
  import { Button } from '$components/ui/button';

  const activeAccount = accountStore.getActiveStore(true);
  const isWindows = type() === 'windows';

  let showLoginModal = $state(false);
  let isDetecting = $state(false);

  const hasAccount = $derived($accountStore.accounts.length > 0);
  const gamePath = $derived($settingsStore.app?.gamePath);
  const hasGamePath = $derived(!!gamePath);

  // The Fortnite path only exists on Windows; elsewhere the account is the only step.
  const totalSteps = $derived(isWindows ? 2 : 1);
  const doneSteps = $derived((hasAccount ? 1 : 0) + (isWindows && hasGamePath ? 1 : 0));
  const allDone = $derived(doneSteps === totalSteps);

  function setGamePath(path: string) {
    settingsStore.set((settings) => {
      settings.app ??= {};
      settings.app.gamePath = path;
      return settings;
    });
  }

  async function finish() {
    settingsStore.set((settings) => {
      settings.app ??= {};
      settings.app.onboardingDone = true;
      return settings;
    });

    // Drops the ?setup flag that settings uses to reopen this screen.
    await goto('/inicio', { replaceState: true });
  }

  async function autoDetect() {
    isDetecting = true;
    try {
      const detected = await detectFortnitePath();
      if (!detected) {
        toast.error($t('settings.general.gamePath.notFound'));
        return;
      }

      setGamePath(detected);
      toast.success($t('settings.general.gamePath.detected'));
    } catch (error) {
      logger.error('Failed to auto-detect Fortnite', { error });
      toast.error($t('settings.general.gamePath.notFound'));
    } finally {
      isDetecting = false;
    }
  }
</script>

<section class="flex w-full flex-col gap-6">
  <header class="space-y-2">
    <p class="label-kicker text-primary">{$t('home.onboarding.kicker')}</p>
    <h1 class="font-display text-3xl leading-none text-foreground sm:text-4xl">
      {$t('home.onboarding.title')}
    </h1>
    <p class="text-sm text-muted-foreground">{$t('home.onboarding.description')}</p>
    <p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase tabular-nums">
      {$t('home.onboarding.progress', { done: doneSteps, total: totalSteps })}
    </p>
  </header>

  <div class={['grid gap-4', isWindows && 'lg:grid-cols-2']}>
    <div class="hud-panel p-4 sm:p-5">
      <div class="flex items-start gap-3">
        <div
          class={[
            'flex size-9 shrink-0 items-center justify-center rounded-full border',
            hasAccount ? 'border-green-500/40 bg-green-500/15 text-green-500' : 'border-border bg-muted/40'
          ]}
        >
          {#if hasAccount}
            <CheckIcon class="size-4.5" />
          {:else}
            <CircleUserIcon class="size-4.5" />
          {/if}
        </div>

        <div class="min-w-0 flex-1 space-y-2">
          <h2 class="text-base font-semibold">{$t('home.onboarding.account.title')}</h2>
          <p class="text-sm text-muted-foreground">{$t('home.onboarding.account.description')}</p>

          {#if hasAccount}
            <p class="text-sm font-medium text-green-500">
              {$t('home.onboarding.account.connected', {
                name: $activeAccount?.displayName ?? $accountStore.accounts[0].accountId
              })}
            </p>
          {:else}
            <Button onclick={() => (showLoginModal = true)}>
              {$t('home.onboarding.account.action')}
            </Button>
          {/if}
        </div>
      </div>
    </div>

    {#if isWindows}
      <div class="hud-panel p-4 sm:p-5">
        <div class="flex items-start gap-3">
          <div
            class={[
              'flex size-9 shrink-0 items-center justify-center rounded-full border',
              hasGamePath ? 'border-green-500/40 bg-green-500/15 text-green-500' : 'border-border bg-muted/40'
            ]}
          >
            {#if hasGamePath}
              <CheckIcon class="size-4.5" />
            {:else}
              <HardDriveIcon class="size-4.5" />
            {/if}
          </div>

          <div class="min-w-0 flex-1 space-y-2">
            <h2 class="text-base font-semibold">{$t('home.onboarding.gamePath.title')}</h2>
            <p class="text-sm text-muted-foreground">{$t('home.onboarding.gamePath.description')}</p>

            <Button
              class="w-full sm:w-auto"
              disabled={isDetecting}
              loading={isDetecting}
              loadingText={$t('settings.general.gamePath.detecting')}
              onclick={autoDetect}
              variant={hasGamePath ? 'outline' : 'default'}
            >
              <ScanSearchIcon class="size-4" />
              {$t('settings.general.gamePath.autoDetect')}
            </Button>

            <SettingsFolderPicker
              defaultPath={gamePath || 'C:/Program Files/Epic Games'}
              onchange={setGamePath}
              placeholder={$t('home.onboarding.gamePath.placeholder')}
              value={gamePath}
            />
          </div>
        </div>
      </div>
    {/if}
  </div>

  <div class="flex flex-wrap items-center gap-3">
    <Button onclick={finish} size="lg" variant={allDone ? 'default' : 'secondary'}>
      {allDone ? $t('home.onboarding.start') : $t('home.onboarding.skip')}
      <ArrowRightIcon class="size-4" />
    </Button>
    <p class="text-xs text-muted-foreground">{$t('home.onboarding.skipHint')}</p>
  </div>
</section>

<LoginModal bind:open={showLoginModal} />
