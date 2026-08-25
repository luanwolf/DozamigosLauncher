<script lang="ts">
  import { toast } from 'svelte-sonner';
  import DownloadIcon from '@lucide/svelte/icons/download';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import SearchIcon from '@lucide/svelte/icons/search';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { t } from '$lib/i18n';
  import { lockerCache } from '$lib/modules/account-data';
  import { beginExportToast } from '$lib/modules/export-toast';
  import { LOCKER_CATEGORIES, type LockerCategory, type LockerData, type LockerOwnedItem } from '$lib/modules/locker';
  import { isLockerExclusiveId } from '$lib/modules/locker-exclusives';
  import { exportLockerCategoryWebp } from '$lib/modules/locker-export';
  import { onCosmeticImageError } from '$lib/modules/cosmetic-image';
  import { rarityBackgroundStyle } from '$lib/modules/locker-export-rarity';
  import { accountStore } from '$lib/storage';
  import { handleError } from '$lib/utils';
  import PageActionButton from '$components/layout/PageActionButton.svelte';
  import PageContent from '$components/layout/PageContent.svelte';
  import PageLoading from '$components/layout/PageLoading.svelte';
  import StoreItemGrid from '$components/layout/StoreItemGrid.svelte';
  import LockerItemPreviewModal from '$components/modules/locker/LockerItemPreviewModal.svelte';
  import { Input } from '$components/ui/input';
  import { Label } from '$components/ui/label';
  import * as Select from '$components/ui/select';
  import { Switch } from '$components/ui/switch';

  const activeAccount = accountStore.getActiveStore(true);

  let isExporting = $state(false);
  let category = $state<LockerCategory>('outfits');
  let search = $state('');
  let exclusivesOnly = $state(false);
  let previewItem = $state<LockerOwnedItem | null>(null);

  const cached = $derived(lockerCache.get($activeAccount));
  const locker = $derived<LockerData | null>(cached.data);
  const isLoading = $derived(cached.loading || cached.refreshing);

  const items = $derived(locker?.itemsByCategory[category] ?? []);
  const searchQuery = $derived(search.trim().toLowerCase());
  const filtered = $derived.by(() => {
    const q = searchQuery;
    return items.filter((item) => {
      if (exclusivesOnly && !isLockerExclusiveId(item.cosmeticId)) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.cosmeticId.toLowerCase().includes(q) ||
        item.templateId.toLowerCase().includes(q)
      );
    });
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
    return rarityBackgroundStyle({ rarity: item.rarity, series: item.series });
  }

  async function exportWebp() {
    if (!locker || isExporting) return;
    const list = filtered;
    if (!list.length) {
      toast.info($t('locker.exportEmpty'));
      return;
    }

    isExporting = true;
    const exportToast = beginExportToast();
    exportToast.progress($t('locker.exportProgress', { percent: 0 }));
    try {
      const result = await exportLockerCategoryWebp({
        items: list,
        categorySlug: exclusivesOnly ? `${category}-exclusives` : category,
        categoryLabel: exclusivesOnly
          ? `${categoryLabel(category)} · ${$t('locker.exclusives')}`
          : categoryLabel(category),
        accountLabel: $activeAccount?.displayName,
        onProgress: ({ done, total }) => {
          exportToast.progress($t('locker.exportProgress', { percent: total > 0 ? Math.round((done / total) * 100) : 0 }));
        }
      });
      if (result.path) {
        exportToast.done($t('locker.exported', { count: result.count }), result.path, $t('locker.openExport'));
      } else {
        exportToast.fail();
        toast.success($t('locker.exported', { count: result.count }));
      }
    } catch (error) {
      exportToast.fail();
      handleError({ error, message: $t('locker.exportFailed'), account: $activeAccount ?? undefined });
    } finally {
      isExporting = false;
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
        disabled={isLoading || isExporting || !filtered.length}
        label={$t('locker.exportWebp')}
        loading={isExporting}
        onclick={() => exportWebp()}
      >
        <DownloadIcon class="size-4" />
      </PageActionButton>
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
  {:else if isLoading && !locker}
    <PageLoading label={$t('loading')} />
  {:else if locker}
    <div class="space-y-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div class="relative min-w-0 flex-1">
            <SearchIcon class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input class="pl-9" placeholder={$t('locker.search')} bind:value={search} />
          </div>
          <Select.Root type="single" bind:value={category}>
            <Select.Trigger class="h-10 w-full rounded-none sm:w-52">
              <span class="truncate">
                {categoryLabel(category)}
                {#if locker}
                  <span class="text-muted-foreground tabular-nums">({locker.itemsByCategory[category].length})</span>
                {/if}
              </span>
            </Select.Trigger>
            <Select.Content>
              {#each LOCKER_CATEGORIES as id (id)}
                <Select.Item value={id}>
                  {categoryLabel(id)}
                  <span class="ml-1 text-muted-foreground tabular-nums">({locker.itemsByCategory[id].length})</span>
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
        <div class="flex items-center gap-2">
          <Switch id="locker-exclusives" bind:checked={exclusivesOnly} />
          <Label class="text-sm" for="locker-exclusives">{$t('locker.exclusivesOnly')}</Label>
        </div>
      </div>

      {#if !filtered.length}
        <p class="text-center text-sm text-muted-foreground">
          {exclusivesOnly && !searchQuery
            ? $t('locker.empty')
            : searchQuery
              ? $t('locker.searchEmpty')
              : $t('locker.empty')}
        </p>
      {:else}
        <StoreItemGrid variant="br">
          {#each filtered as item (item.itemId)}
            <button
              class="relative aspect-square w-full overflow-hidden rounded-md border border-transparent text-left transition-colors hover:border-border"
              onclick={() => {
                previewItem = item;
              }}
              style={bgFor(item)}
              type="button"
            >
              {#if item.imageUrl}
                <img
                  class="size-full object-cover"
                  alt={item.name}
                  loading="lazy"
                  src={item.imageUrl}
                  onerror={onCosmeticImageError}
                />
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
