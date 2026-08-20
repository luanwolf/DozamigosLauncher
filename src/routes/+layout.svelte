<script lang="ts">
  import './layout.css';
  import { onMount } from 'svelte';
  import { toast, Toaster } from 'svelte-sonner';
  import { on } from 'svelte/events';
  import { afterNavigate, beforeNavigate, goto } from '$app/navigation';
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import { listen } from '@tauri-apps/api/event';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { platform } from '@tauri-apps/plugin-os';
  import { SidebarItems } from '$lib/constants/sidebar';
  import { language, t } from '$lib/i18n';
  import { logger, setLogLevel } from '$lib/logger';
  import { warmAccountData } from '$lib/modules/account-data';
  import { initAutoKick } from '$lib/modules/autokick/base';
  import { initTaxiService } from '$lib/modules/taxi-service';
  import { fetchAvatars } from '$lib/modules/avatar';
  import { addToQueue, initDownloader } from '$lib/modules/download.svelte';
  import { ensureLibrary, getAppInfo } from '$lib/modules/legendary';
  import { promptLauncherUpdate } from '$lib/modules/launcher-update-prompt';
  import { fetchUsersByIds } from '$lib/modules/lookup';
  import {
    runStartupActions,
    startDailyQuestRerollScheduler,
    startLlamaAutoClaimScheduler
  } from '$lib/modules/startup-actions';
  import { startBackgroundNotifications } from '$lib/modules/background-notifications';
  import { setWorldInfoCache } from '$lib/modules/world-info';
  import { setLocale } from '$lib/paraglide/runtime';
  import { accountStore, downloaderStore, settingsStore } from '$lib/storage';
  import { ownedAppsCache, runningAppIds } from '$lib/stores';
  import {
    connectDiscordRPC,
    disconnectDiscordRPC,
    getTrackedApps,
    setTrayVisibility,
    updateDiscordRPC
  } from '$lib/tauri';
  import { handleError } from '$lib/utils';
  import AchievementToasts from '$components/layout/AchievementToasts.svelte';
  import Header from '$components/layout/header/Header.svelte';
  import ScrollToTopButton from '$components/layout/ScrollToTopButton.svelte';
  import Sidebar from '$components/layout/sidebar/Sidebar.svelte';
  import ZoneFrame from '$components/layout/ZoneFrame.svelte';
  import { SidebarProvider } from '$components/ui/sidebar';
  import * as Tooltip from '$components/ui/tooltip';

  const { children } = $props();

  const activeAccount = accountStore.getActiveStore(true);

  let mainEl = $state<HTMLElement | undefined>(undefined);

  async function syncAccountNames() {
    const account = accountStore.getActive();
    if (!account) return;

    const userAccounts = $accountStore.accounts;
    const accounts = await fetchUsersByIds(
      account,
      userAccounts.map((account) => account.accountId)
    );

    accountStore.set((current) => ({
      ...current,
      accounts: current.accounts.map((account) => ({
        ...account,
        displayName: accounts.find((acc) => acc.id === account.accountId)?.displayName || account.displayName
      }))
    }));
  }

  async function autoUpdateApps() {
    const activeAccount = accountStore.getActive();
    if (!activeAccount) return;

    // Startup warms the library (logging Legendary in when needed), so the app
    // list is already there by the time updates are checked.
    await ensureLibrary(activeAccount);

    const updatableApps = $ownedAppsCache.filter((app) => app.hasUpdate);
    const appAutoUpdate = $downloaderStore.perAppAutoUpdate || {};

    let sentFirstNotification = false;
    for (const app of updatableApps) {
      if (appAutoUpdate[app.id] ?? $downloaderStore.autoUpdate) {
        await addToQueue(app);

        if (!sentFirstNotification) {
          sentFirstNotification = true;
          toast.info($t('library.app.startedUpdate', { name: app.title }));
        }
      }
    }
  }

  async function getAppName(appId: string) {
    const cached = $ownedAppsCache.find((app) => app.id === appId);
    if (cached) return cached.title;

    const appInfo = await getAppInfo(appId);
    return appInfo.stdout.game.title;
  }

  async function setupDiscordRPC() {
    const brand = 'Dozamigos Launcher';
    const idleDetails = 'No launcher';

    let previousDcStatus = false;
    settingsStore.subscribe(async (data) => {
      setLogLevel(data.app?.debugLogs ? 'debug' : 'info');
      setTrayVisibility({ visible: !!data.app?.hideToTray });

      const dcStatusEnabled = data.app!.discordStatus!;
      if (dcStatusEnabled !== previousDcStatus) {
        previousDcStatus = dcStatusEnabled;

        if (dcStatusEnabled) {
          await connectDiscordRPC();
          await updateDiscordRPC({ details: idleDetails, state: brand });
        } else {
          await disconnectDiscordRPC();
        }
      }
    });

    listen<{
      pid: number;
      app_id: string;
      state: 'running' | 'stopped';
    }>('app_state_changed', async (event) => {
      const appId = event.payload.app_id;
      const discordStatus = $settingsStore.app?.discordStatus;

      if (event.payload.state === 'running') {
        runningAppIds.add(appId);

        if (discordStatus !== true) return;

        const appName = await getAppName(appId).catch(() => null);
        if (!appName) return;

        await updateDiscordRPC({ details: `Jogando ${appName}`, state: brand });
      } else {
        runningAppIds.delete(appId);

        if (discordStatus !== true) return;

        const newApp = Array.from(runningAppIds)[0];
        const appName = newApp ? await getAppName(newApp).catch(() => null) : null;
        if (newApp && appName) {
          await updateDiscordRPC({ details: `Jogando ${appName}`, state: brand });
        } else {
          await updateDiscordRPC({ details: idleDetails, state: brand });
        }
      }
    });

    if (platform() === 'windows') {
      // Used to set running apps when the page is refreshed
      getTrackedApps()
        .then((apps) => {
          for (const app of apps) {
            if (app.is_running) {
              runningAppIds.add(app.app_id);
            } else {
              runningAppIds.delete(app.app_id);
            }
          }
        })
        .catch((error) => {
          logger.error('Failed to get tracked apps', { error });
        });
    }
  }

  // Preload every account-scoped page on boot and on each account switch, so
  // opening a tab reads from cache instead of showing a loading screen.
  $effect(() => {
    void warmAccountData($activeAccount);
  });

  beforeNavigate(async (nav) => {
    // Checks auth for pages that require login
    // Could have used +page.ts files but this is easier
    const path = nav.to?.url.pathname;
    const sidebarItem = SidebarItems.find((item) => item.href === path);
    if (!sidebarItem?.requiresLogin || accountStore.getActive()) return;

    nav.cancel();
    await goto('/br-stw/stw-mission-alerts');
    toast.error($t('errors.notLoggedIn'));
  });

  afterNavigate(() => {
    mainEl?.scrollTo({ top: 0, behavior: 'instant' });
  });

  onMount(() => {
    // logger.error gives more context than unhandled console.error
    on(window, 'error', (event) => {
      logger.error('Unhandled error occurred', { error: event.error });
    });

    language.subscribe((locale) => {
      setLocale(locale, { reload: false });
      document.documentElement.lang = locale;

      settingsStore.set((settings) => {
        settings.app ??= {};
        settings.app.language = locale;
        return settings;
      });
    });

    Promise.allSettled([
      setupDiscordRPC(),
      initAutoKick(),
      initTaxiService(),
      initDownloader(),
      setWorldInfoCache(),
      syncAccountNames(),
      autoUpdateApps(),
      runStartupActions().then(() => sessionStorage.setItem('startupActionsRan', 'true')),
      Promise.resolve(startLlamaAutoClaimScheduler()),
      Promise.resolve(startDailyQuestRerollScheduler()),
      Promise.resolve(startBackgroundNotifications()),
      // We could fetch all avatars using a single account
      // However, fetching per account allows invalid accounts to fail independently
      // and be detected and removed from the config.
      $accountStore.accounts.map((x) =>
        fetchAvatars(x, [x.accountId]).catch((error) => {
          handleError({
            error,
            message: 'Failed to fetch avatar',
            account: x.accountId,
            toastId: false
          });
        })
      )
    ]);

    void promptLauncherUpdate();

    // Window is hidden by default to prevent white flash on startup
    getCurrentWindow()
      .show()
      .catch((error) => logger.error('Failed to show main window', { error }));
  });
</script>

<SidebarProvider style="--sidebar-width: 3.75rem;" class="flex h-dvh">
  <Tooltip.Provider>
    <Toaster
      pauseWhenPageIsHidden={true}
      position="top-center"
      offset="calc(var(--app-header-height) + 0.75rem)"
      toastOptions={{
        duration: 3000,
        unstyled: true,
        classes: {
          toast:
            'glitch-toast hud-panel flex items-center gap-3 px-3.5 py-2.5 w-[min(26rem,calc(100vw-1.5rem))] shadow-md',
          title: 'glitch-toast-title font-display text-base leading-none text-foreground',
          description: 'text-sm text-muted-foreground',
          error: 'glitch-toast-error',
          success: 'glitch-toast-success'
        }
      }}
    >
      {#snippet loadingIcon()}
        <LoaderCircleIcon class="size-5 animate-spin" />
      {/snippet}
    </Toaster>

    <AchievementToasts />

    <Sidebar />

    <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <Header />

      <main
        bind:this={mainEl}
        class="app-canvas min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-2 py-3 sm:px-5 sm:py-4 lg:px-7"
      >
        <ZoneFrame />
        {@render children()}
      </main>

      <ScrollToTopButton scrollContainer={mainEl} />
    </div>
  </Tooltip.Provider>
</SidebarProvider>
