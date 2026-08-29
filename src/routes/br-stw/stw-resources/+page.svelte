<script lang="ts">
  import { untrack } from 'svelte';
  import DownloadIcon from '@lucide/svelte/icons/download';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import SearchIcon from '@lucide/svelte/icons/search';
  import { toast } from 'svelte-sonner';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { language, t } from '$lib/i18n';
  import { beginExportToast } from '$lib/modules/export-toast';
  import { exportStwResourcesWebp } from '$lib/modules/stw-resources-export';
  import { fetchStwResources, type StwResourceRow } from '$lib/modules/stw-resources';
  import { rarityBackgroundStyle } from '$lib/modules/locker-export-rarity';
  import { accountStore } from '$lib/storage';
  import { handleError } from '$lib/utils';
  import PageActionButton from '$components/layout/PageActionButton.svelte';
  import PageContent from '$components/layout/PageContent.svelte';
  import PageLoading from '$components/layout/PageLoading.svelte';
  import StoreItemGrid from '$components/layout/StoreItemGrid.svelte';
  import { Input } from '$components/ui/input';

  const activeAccount = accountStore.getActiveStore(true);

  let resources = $state<StwResourceRow[]>([]);
  let powerLevel = $state(0);
  let isLoading = $state(false);
  let isExporting = $state(false);
  let search = $state('');

  const filtered = $derived.by(() => {
    const q = search.trim().toLowerCase();
    if (!q) return resources;
    return resources.filter(
      (r) => r.name.toLowerCase().includes(q) || r.resourceId.toLowerCase().includes(q)
    );
  });

  async function load(force = false) {
    if (!$activeAccount) {
      resources = [];
      return;
    }
    if (isLoading && !force) return;
    isLoading = true;
    try {
      const data = await fetchStwResources($activeAccount);
      resources = data.resources;
      powerLevel = data.powerLevel;
    } catch (error) {
      handleError({ error, message: $t('stwResources.loadFailed'), account: $activeAccount });
      resources = [];
    } finally {
      isLoading = false;
    }
  }

  async function exportWebp() {
    if (!filtered.length || isExporting) return;
    isExporting = true;
    const exportToast = beginExportToast();
    exportToast.progress($t('stwResources.exportProgress', { percent: 0 }));
    try {
      const result = await exportStwResourcesWebp({
        resources: filtered,
        titleLabel: $t('stwResources.exportTitle'),
        accountLabel: $activeAccount?.displayName ?? '',
        powerLabel: $t('stwResources.powerLabel', { power: powerLevel.toFixed(1) }),
        locale: $language,
        onProgress: ({ done, total }) => {
          exportToast.progress(
            $t('stwResources.exportProgress', { percent: total > 0 ? Math.round((done / total) * 100) : 0 })
          );
        }
      });
      if (result.path) {
        exportToast.done($t('stwResources.exported', { count: result.count }), result.path, $t('stwResources.openExport'));
      } else {
        exportToast.fail();
        toast.success($t('stwResources.exported', { count: result.count }));
      }
    } catch (error) {
      exportToast.fail();
      handleError({ error, message: $t('stwResources.exportFailed'), account: $activeAccount ?? undefined });
    } finally {
      isExporting = false;
    }
  }

  $effect(() => {
    if (!$activeAccount?.accountId) return;
    // load() reads `isLoading`; tracking it here would re-run the effect on every
    // flip and refetch forever (export/refresh stay disabled).
    untrack(() => void load());
  });
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('stwResources.page.description')}
  title={$t('stwResources.page.title')}
>
  {#snippet actions()}
    {#if $activeAccount}
      <PageActionButton
        disabled={isLoading || isExporting || !filtered.length}
        label={$t('stwResources.exportWebp')}
        loading={isExporting}
        onclick={() => exportWebp()}
      >
        <DownloadIcon class="size-4" />
      </PageActionButton>
      <PageActionButton
        disabled={isLoading || isExporting}
        label={$t('stwResources.refresh')}
        loading={isLoading}
        onclick={() => load(true)}
      >
        <RefreshCwIcon class="size-4" />
      </PageActionButton>
    {/if}
  {/snippet}

  {#if !$activeAccount}
    <p class="text-center text-sm text-muted-foreground">{$t('sidebar.loginRequired')}</p>
  {:else if isLoading && !resources.length}
    <PageLoading label={$t('loading')} />
  {:else}
    <div class="space-y-4">
      <p class="text-sm text-muted-foreground">
        {$t('stwResources.powerLabel', { power: powerLevel.toFixed(1) })} ·
        {$t('stwResources.count', { count: resources.length })}
      </p>
      <div class="relative max-w-md">
        <SearchIcon class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input class="pl-9" placeholder={$t('stwResources.search')} bind:value={search} />
      </div>

      {#if !filtered.length}
        <p class="text-center text-sm text-muted-foreground">
          {search.trim() ? $t('stwResources.searchEmpty') : $t('stwResources.empty')}
        </p>
      {:else}
        <StoreItemGrid variant="stw">
          {#each filtered as row (row.templateId)}
            <div
              class="relative aspect-square overflow-hidden rounded-md border border-border/60"
              style={rarityBackgroundStyle({ rarity: row.rarity })}
            >
              <img alt="" class="absolute inset-0 size-full object-contain p-2" src={row.imageUrl} />
              <div class="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1.5">
                <p class="truncate text-sm font-medium text-white">{row.name}</p>
                <p class="text-lg font-semibold tabular-nums text-white">
                  {row.quantity.toLocaleString($language)}
                </p>
              </div>
            </div>
          {/each}
        </StoreItemGrid>
      {/if}
    </div>
  {/if}
</PageContent>
