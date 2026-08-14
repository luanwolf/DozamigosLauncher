<script lang="ts">
  import { toast } from 'svelte-sonner';
  import Fuse from 'fuse.js';
  import LogOutIcon from '@lucide/svelte/icons/log-out';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import { t } from '$lib/i18n';
  import { downloadingAppId, isInQueue } from '$lib/modules/download.svelte';
  import { ensureLibrary, libraryStatus, logoutLegendary } from '$lib/modules/legendary';
  import { accountStore, downloaderStore } from '$lib/storage';
  import { ownedAppsCache } from '$lib/stores';
  import { getAccountsFromSelection, handleError } from '$lib/utils';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import PageActionButton from '$components/layout/PageActionButton.svelte';
  import PageContent from '$components/layout/PageContent.svelte';
  import PageLoading from '$components/layout/PageLoading.svelte';
  import AppCard from '$components/modules/downloader/AppCard.svelte';
  import AppFilter from '$components/modules/downloader/AppFilter.svelte';
  import InstallDialog from '$components/modules/downloader/modals/InstallDialog.svelte';
  import UninstallDialog from '$components/modules/downloader/modals/UninstallDialog.svelte';
  import { Input } from '$components/ui/input';
  import type { AppFilterValue } from '$types/legendary';

  const activeAccount = accountStore.getActiveStore(true);

  let isLoggingOut = $state(false);
  let searchQuery = $state<string>('');
  let filters = $state<AppFilterValue[]>([]);

  let installDialogAppId = $state<string>();
  let uninstallDialogAppId = $state<string>();

  const hasLoaded = $derived($libraryStatus.loaded);
  const isLoading = $derived($libraryStatus.loading || isLoggingOut);

  const filteredApps = $derived.by(() => {
    if (!hasLoaded) return [];
    const query = searchQuery.trim().toLowerCase();

    let filtered = Object.values($ownedAppsCache).filter((app) => {
      if (!filters.includes('hidden') && $downloaderStore.hiddenApps?.includes(app.id)) return false;
      if (filters.includes('installed') && !app.installed) return false;
      if (filters.includes('updatesAvailable') && !app.hasUpdate) return false;
      return true;
    });

    if (query) {
      const fuse = new Fuse(filtered, { keys: ['title'], threshold: 0.4 });
      filtered = fuse.search(query).map((result) => result.item);
    }

    return filtered.sort((a, b) => {
      const favoriteA = $downloaderStore.favoriteApps?.includes(a.id) ? 0 : 1;
      const favoriteB = $downloaderStore.favoriteApps?.includes(b.id) ? 0 : 1;
      const installedA = a.installed ? 0 : 1;
      const installedB = b.installed ? 0 : 1;
      const installingA = $downloadingAppId === a.id ? 0 : 1;
      const installingB = $downloadingAppId === b.id ? 0 : 1;
      const inQueueA = isInQueue(a.id) ? 0 : 1;
      const inQueueB = isInQueue(b.id) ? 0 : 1;

      return (
        favoriteA - favoriteB ||
        installedA - installedB ||
        installingA - installingB ||
        inQueueA - inQueueB ||
        a.title.localeCompare(b.title)
      );
    });
  });

  async function loadLibrary(accountId: string, force = false) {
    const account = getAccountsFromSelection([accountId])[0];
    if (!account) return;

    try {
      await ensureLibrary(account, { force });
      if (force) toast.success($t('library.loggedIn'));
    } catch (error) {
      handleError({ error, message: $t('library.failedToLogin') });
    }
  }

  async function logout() {
    isLoggingOut = true;
    try {
      await logoutLegendary();
      toast.success($t('library.loggedOut'));
    } catch (error) {
      handleError({ error, message: $t('library.failedToLogout') });
    } finally {
      isLoggingOut = false;
    }
  }

  // Startup already signs into the active account; this only covers the case
  // where the library still isn't loaded (first run, earlier failure, logout).
  $effect(() => {
    const accountId = $activeAccount?.accountId;
    if (accountId) void loadLibrary(accountId);
  });
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === 'F5' && $activeAccount) {
      event.preventDefault();
      loadLibrary($activeAccount.accountId);
    }
  }}
/>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('library.page.description')}
  title={$t('library.page.title')}
>
  {#snippet actions()}
    <PageActionButton
      disabled={!$activeAccount || isLoading}
      label={$t('library.refresh')}
      loading={isLoading}
      onclick={() => $activeAccount && loadLibrary($activeAccount.accountId, true)}
    >
      <RefreshCwIcon class="size-4" />
    </PageActionButton>

    {#if hasLoaded}
      <PageActionButton disabled={isLoading} label={$t('library.logout')} onclick={logout}>
        <LogOutIcon class="size-4" />
      </PageActionButton>
    {/if}
  {/snippet}

  <div class="flex flex-wrap items-center gap-3 sm:gap-4">
    <Input
      class="h-8 w-full min-w-48 rounded-md sm:max-w-xs"
      disabled={isLoading}
      placeholder={$t('library.searchPlaceholder')}
      type="search"
      bind:value={searchQuery}
    />
    <AppFilter bind:value={filters} />
  </div>

  {#if isLoading && !hasLoaded}
    <PageLoading label={$t('library.loggingIn')} />
  {:else if isLoggingOut}
    <PageLoading label={$t('library.loggingOut')} />
  {:else}
    <div
      class="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl-plus:grid-cols-5 2xl:grid-cols-6"
    >
      {#each filteredApps as app (app.id)}
        <AppCard appId={app.id} bind:installDialogAppId bind:uninstallDialogAppId />
      {/each}
    </div>
  {/if}

  {#if installDialogAppId}
    <InstallDialog bind:id={installDialogAppId} />
  {/if}

  {#if uninstallDialogAppId}
    <UninstallDialog bind:id={uninstallDialogAppId} />
  {/if}
</PageContent>
