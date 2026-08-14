<script lang="ts">
  import { toast } from 'svelte-sonner';
  import DownloadIcon from '@lucide/svelte/icons/download';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import SearchIcon from '@lucide/svelte/icons/search';
  import { openPath } from '@tauri-apps/plugin-opener';
  import { ItemColors } from '$lib/constants/item-colors';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { t } from '$lib/i18n';
  import { lockerCache } from '$lib/modules/account-data';
  import { LOCKER_CATEGORIES, type LockerCategory, type LockerData, type LockerOwnedItem } from '$lib/modules/locker';
  import { exportLockerCategoryWebp } from '$lib/modules/locker-export';
  import { accountStore } from '$lib/storage';
  import { handleError } from '$lib/utils';
  import PageActionButton from '$components/layout/PageActionButton.svelte';
  import PageContent from '$components/layout/PageContent.svelte';
  import PageLoading from '$components/layout/PageLoading.svelte';
  import StoreItemGrid from '$components/layout/StoreItemGrid.svelte';
  import LockerItemPreviewModal from '$components/modules/locker/LockerItemPreviewModal.svelte';
  import { Input } from '$components/ui/input';
  import { Progress } from '$components/ui/progress';
  import * as Tabs from '$components/ui/tabs';

  const activeAccount = accountStore.getActiveStore(true);
  const colors: Record<string, string> = { ...ItemColors.rarities, ...ItemColors.series };

  let isExporting = $state(false);
  let exportPercent = $state(0);
  let lastExportPath = $state<string | null>(null);
  let category = $state<LockerCategory>('outfits');
  let search = $state('');
  let previewItem = $state<LockerOwnedItem | null>(null);

  const cached = $derived(lockerCache.get($activeAccount));
  const locker = $derived<LockerData | null>(cached.data);
  const isLoading = $derived(cached.loading || cached.refreshing);

  const items = $derived(locker?.itemsByCategory[category] ?? []);
  const filtered = $derived.by(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.name.toLowerCase().includes(q) || item.cosmeticId.toLowerCase().includes(q));
  });

  async function loadLocker(force = false) {
    if (!$activeAccount) return;

    const data = await lockerCache.ensure($activeAccount, { force });
    if (!data) {
      handleError({
        error: lockerCache.get($activeAccount).error,
        message: 'Failed to load locker',
        account: $activeAccount
      });
    }
  }

  function categoryLabel(id: LockerCategory) {
    return $t(`locker.categories.${id}`);
  }

  function bgFor(item: LockerOwnedItem) {
    return colors[item.rarity] || colors.common;
  }

  async function exportWebp() {
    if (!locker || isExporting) return;
    const list = locker.itemsByCategory[category];
    if (!list.length) {
      toast.info($t('locker.exportEmpty'));
      return;
    }

    isExporting = true;
    exportPercent = 0;
    lastExportPath = null;
    try {
      const result = await exportLockerCategoryWebp({
        items: list,
        categorySlug: category,
        categoryLabel: categoryLabel(category),
        accountLabel: $activeAccount?.displayName,
        onProgress: ({ done, total }) => {
          exportPercent = total > 0 ? Math.round((done / total) * 100) : 0;
        }
      });
      lastExportPath = result.path || null;
      toast.success($t('locker.exported', { count: result.count }));
    } catch (error) {
      handleError({ error, message: $t('locker.exportFailed'), account: $activeAccount ?? undefined });
    } finally {
      isExporting = false;
      exportPercent = 0;
    }
  }

  async function openLastExport() {
    if (!lastExportPath) return;
    try {
      await openPath(lastExportPath);
    } catch (error) {
      handleError({ error, message: $t('locker.exportFailed'), account: $activeAccount ?? undefined });
    }
  }

  $effect(() => {
    if ($activeAccount?.accountId) void loadLocker();
  });
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('locker.page.description')}
  title={$t('locker.page.title')}
>
  {#snippet actions()}
    {#if $activeAccount}
      <PageActionButton
        disabled={isLoading || isExporting || !locker?.itemsByCategory[category]?.length}
        label={$t('locker.exportWebp')}
        loading={isExporting}
        onclick={() => exportWebp()}
      >
        <DownloadIcon class="size-4" />
      </PageActionButton>
      {#if lastExportPath}
        <PageActionButton disabled={isExporting} label={$t('locker.openExport')} onclick={() => openLastExport()}>
          <ExternalLinkIcon class="size-4" />
        </PageActionButton>
      {/if}
      <PageActionButton
        disabled={isLoading || isExporting}
        label={$t('locker.refresh')}
        loading={isLoading}
        onclick={() => loadLocker(true)}
      >
        <RefreshCwIcon class="size-4" />
      </PageActionButton>
    {/if}
  {/snippet}

  {#if !$activeAccount}
    <p class="text-center text-sm text-muted-foreground">{$t('sidebar.loginRequired')}</p>
  {:else if isExporting}
    <div
      class="flex flex-col items-center justify-center gap-4 py-16 text-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="relative flex size-12 items-center justify-center">
        <span class="absolute inset-0 rounded-full bg-primary/10" aria-hidden="true"></span>
        <LoaderCircleIcon class="relative size-8 animate-spin text-primary" strokeWidth={2.25} />
      </div>
      <p class="text-sm text-muted-foreground">
        {$t('locker.exportProgress', { percent: exportPercent })}
      </p>
      <Progress class="h-2 w-full max-w-xs" value={exportPercent} />
    </div>
  {:else if isLoading && !locker}
    <PageLoading label={$t('loading')} />
  {:else if locker}
    <div class="space-y-4">
      <div class="relative max-w-md">
        <SearchIcon class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input class="pl-9" placeholder={$t('locker.search')} bind:value={search} />
      </div>

      <Tabs.Root bind:value={category}>
        <Tabs.List class="flex h-auto w-full flex-wrap justify-start gap-1">
          {#each LOCKER_CATEGORIES as id (id)}
            <Tabs.Trigger class="text-xs sm:text-sm" value={id}>
              {categoryLabel(id)}
              <span class="ml-1 text-muted-foreground tabular-nums">
                ({locker.itemsByCategory[id].length})
              </span>
            </Tabs.Trigger>
          {/each}
        </Tabs.List>
      </Tabs.Root>

      {#if !filtered.length}
        <p class="text-center text-sm text-muted-foreground">{$t('locker.empty')}</p>
      {:else}
        <StoreItemGrid variant="br">
          {#each filtered as item (item.itemId)}
            <button
              class="relative aspect-square w-full overflow-hidden rounded-md border border-transparent text-left transition-colors hover:border-border"
              onclick={() => {
                previewItem = item;
              }}
              style="background-color: {bgFor(item)}"
              type="button"
            >
              {#if item.imageUrl}
                <img class="size-full object-cover" alt={item.name} loading="lazy" src={item.imageUrl} />
              {:else}
                <div class="flex size-full items-center justify-center p-2 text-center text-xs font-medium">
                  {item.name}
                </div>
              {/if}

              <div class="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1">
                <p class="truncate text-xs font-medium text-white">{item.name}</p>
              </div>
            </button>
          {/each}
        </StoreItemGrid>
      {/if}
    </div>
  {:else if !isLoading}
    <p class="text-center text-sm text-muted-foreground">{$t('locker.loadFailed')}</p>
  {/if}
</PageContent>

<LockerItemPreviewModal {category} bind:item={previewItem} />
