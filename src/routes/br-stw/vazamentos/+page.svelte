<script lang="ts">
  import { toast } from 'svelte-sonner';
  import DownloadIcon from '@lucide/svelte/icons/download';
  import EyeIcon from '@lucide/svelte/icons/eye';
  import EyeOffIcon from '@lucide/svelte/icons/eye-off';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import { openPath } from '@tauri-apps/plugin-opener';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { language, t } from '$lib/i18n';
  import { leaksCache } from '$lib/modules/account-data';
  import {
    formatLeakDayLabel,
    groupLeaksByDay,
    type LeakedCosmetic
  } from '$lib/modules/fortnite-leaks';
  import { exportLockerCategoryWebp, type LockerExportItem } from '$lib/modules/locker-export';
  import { rarityBackgroundStyle } from '$lib/modules/locker-export-rarity';
  import { onCosmeticImageError } from '$lib/modules/cosmetic-image';
  import { handleError } from '$lib/utils';
  import LeaksItemPreviewModal from '$components/modules/leaks/LeaksItemPreviewModal.svelte';
  import PageActionButton from '$components/layout/PageActionButton.svelte';
  import PageContent from '$components/layout/PageContent.svelte';
  import PageLoading from '$components/layout/PageLoading.svelte';
  import * as Accordion from '$components/ui/accordion';
  import { Button } from '$components/ui/button';
  import HudPanel from '$components/ui/hud/HudPanel.svelte';
  import { Progress } from '$components/ui/progress';

  const cached = $derived(leaksCache.get($language));
  const leaksData = $derived(cached.data);
  const isLoading = $derived(cached.loading || cached.refreshing);
  const loadFailed = $derived(!!cached.error && !cached.data);

  const dayGroups = $derived(leaksData ? groupLeaksByDay(leaksData.cosmetics) : []);
  let openDay = $state<string | undefined>(undefined);
  let seededOpenDay = $state(false);
  let previewItem = $state<LeakedCosmetic | null>(null);
  let showSecrets = $state(false);
  let isExporting = $state(false);
  let exportPercent = $state(0);
  let lastExportPath = $state<string | null>(null);
  let exportingDay = $state<string | null>(null);

  $effect(() => {
    const latest = dayGroups[0]?.dateKey;
    if (!seededOpenDay && latest) {
      openDay = latest;
      seededOpenDay = true;
    }
    if (openDay && dayGroups.length && !dayGroups.some((g) => g.dateKey === openDay)) {
      openDay = latest;
    }
  });

  function cosmeticBackground(cosmetic: LeakedCosmetic) {
    return rarityBackgroundStyle({
      rarity: cosmetic.rarityValue,
      series: cosmetic.series?.toLowerCase().replace(/\s+/g, '')
    });
  }

  function formatBuildLabel(build: string) {
    const match = build.match(/Release-([\d.]+)-CL-(\d+)/i);
    if (match) return `${match[1]} (CL-${match[2]})`;
    return build;
  }

  function loadLeaks(forceRefresh = false) {
    void leaksCache.ensure($language, { force: forceRefresh });
  }

  function toExportItems(items: LeakedCosmetic[]): LockerExportItem[] {
    return items.map((item) => ({
      itemId: item.id,
      templateId: item.id,
      cosmeticId: item.id,
      name: item.name,
      description: item.type,
      rarity: item.rarityValue,
      series: item.series,
      styles: item.styles,
      imageUrl: item.image,
      favorite: false,
      equippedSlots: []
    }));
  }

  async function exportDay(dateKey: string, items: LeakedCosmetic[]) {
    if (!items.length || isExporting) return;
    isExporting = true;
    exportingDay = dateKey;
    exportPercent = 0;
    try {
      const label = formatLeakDayLabel(dateKey, $language);
      const result = await exportLockerCategoryWebp({
        items: toExportItems(items),
        categorySlug: `leaks-${dateKey}`,
        categoryLabel: $t('leaks.export.category', { date: label }),
        onProgress: ({ done, total }) => {
          exportPercent = total > 0 ? Math.round((done / total) * 100) : 0;
        }
      });
      lastExportPath = result.path;
      toast.success($t('leaks.export.done', { count: result.count }));
    } catch (error) {
      handleError({ error, message: $t('leaks.export.failed') });
    } finally {
      isExporting = false;
      exportingDay = null;
      exportPercent = 0;
    }
  }

  async function openLastExport() {
    if (!lastExportPath) return;
    try {
      await openPath(lastExportPath);
    } catch (error) {
      handleError({ error, message: $t('leaks.export.failed') });
    }
  }

  $effect(() => {
    loadLeaks();
  });
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('leaks.page.description')}
  title={$t('leaks.page.title')}
>
  {#snippet actions()}
    <PageActionButton
      disabled={isLoading}
      label={$t('leaks.refresh')}
      loading={isLoading}
      loadingText={$t('leaks.loading')}
      onclick={() => loadLeaks(true)}
      type="button"
    >
      <RefreshCwIcon class="size-4" />
    </PageActionButton>
    {#if lastExportPath}
      <PageActionButton disabled={isExporting} label={$t('leaks.export.open')} onclick={() => openLastExport()}>
        <ExternalLinkIcon class="size-4" />
      </PageActionButton>
    {/if}
  {/snippet}

  {#if loadFailed}
    <HudPanel>
      <p class="text-sm text-destructive">{$t('leaks.failedToFetch')}</p>
    </HudPanel>
  {:else if isLoading && !leaksData}
    <PageLoading label={$t('loading')} />
  {:else if leaksData}
    {#if isExporting}
      <div class="flex max-w-xs items-center gap-2" role="status" aria-live="polite">
        <LoaderCircleIcon class="size-3.5 animate-spin text-muted-foreground" />
        <Progress class="h-2 flex-1" value={exportPercent} />
      </div>
    {/if}

    {#if dayGroups.length}
      <Accordion.Root class="w-full space-y-2" type="single" collapsible bind:value={openDay}>
        {#each dayGroups as group (group.dateKey)}
          <Accordion.Item class="group overflow-hidden rounded-md border border-border/50 bg-card/40" value={group.dateKey}>
            <div class="flex w-full items-center gap-2 pl-3 pr-2">
              <div class="min-w-0 flex-1">
                <Accordion.Trigger
                  class="w-full items-center justify-start gap-3 px-0 py-3 hover:no-underline [&>svg]:hidden"
                >
                  <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-left">
                    <span class="text-sm font-medium tabular-nums">
                      {formatLeakDayLabel(group.dateKey, $language)}
                    </span>
                    <span class="hud-chip text-[10px] tabular-nums">
                      {$t('leaks.dayCount', { count: group.items.length })}
                    </span>
                    <span
                      class="text-[10px] text-muted-foreground tabular-nums {showSecrets
                        ? ''
                        : 'blur-sm select-none'}"
                    >
                      {$t('leaks.buildInfo', { build: formatBuildLabel(leaksData.build) })}
                    </span>
                    {#if leaksData.aesKey}
                      <span
                        class="max-w-[12rem] truncate text-[10px] text-muted-foreground tabular-nums {showSecrets
                          ? ''
                          : 'blur-sm select-none'}"
                        title={showSecrets ? leaksData.aesKey : undefined}
                      >
                        {$t('leaks.aesInfo', { key: leaksData.aesKey })}
                      </span>
                    {/if}
                  </div>
                </Accordion.Trigger>
              </div>
              <div class="ml-auto flex shrink-0 items-center justify-end gap-0.5">
                <button
                  type="button"
                  class="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={$t('leaks.toggleSecrets')}
                  aria-pressed={showSecrets}
                  onclick={() => {
                    showSecrets = !showSecrets;
                  }}
                >
                  {#if showSecrets}
                    <EyeOffIcon class="size-4" />
                  {:else}
                    <EyeIcon class="size-4" />
                  {/if}
                </button>
                <button
                  type="button"
                  class="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={openDay === group.dateKey ? 'Recolher' : 'Expandir'}
                  onclick={() => {
                    openDay = openDay === group.dateKey ? undefined : group.dateKey;
                  }}
                >
                  <ChevronDownIcon
                    class="size-4 transition-transform duration-200 {openDay === group.dateKey
                      ? 'rotate-180'
                      : ''}"
                  />
                </button>
              </div>
            </div>
            <Accordion.Content class="px-3 pb-3">
              <div class="mb-2 flex justify-end">
                <Button
                  disabled={isExporting}
                  onclick={() => exportDay(group.dateKey, group.items)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {#if exportingDay === group.dateKey}
                    <LoaderCircleIcon class="size-3.5 animate-spin" />
                  {:else}
                    <DownloadIcon class="size-3.5" />
                  {/if}
                  <span class="ml-1.5">{$t('leaks.export.button')}</span>
                </Button>
              </div>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {#each group.items as cosmetic (cosmetic.id)}
                  <button
                    type="button"
                    style={cosmeticBackground(cosmetic)}
                    class="overflow-hidden rounded-md border border-border/40 text-left transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    onclick={() => {
                      previewItem = cosmetic;
                    }}
                  >
                    {#if cosmetic.image}
                      <img
                        class="aspect-square w-full object-cover"
                        alt={cosmetic.name}
                        loading="lazy"
                        src={cosmetic.image}
                        onerror={onCosmeticImageError}
                      />
                    {/if}

                    <div class="space-y-0.5 bg-black/70 px-2 py-1.5">
                      <p class="truncate text-xs font-medium text-white">{cosmetic.name}</p>
                      <p class="truncate text-[10px] text-white/70">{cosmetic.type}</p>
                      <p class="truncate text-[10px] text-white/50">{cosmetic.rarity}</p>
                    </div>
                  </button>
                {/each}
              </div>
            </Accordion.Content>
          </Accordion.Item>
        {/each}
      </Accordion.Root>
    {:else if !isLoading}
      <HudPanel>
        <p class="text-sm text-muted-foreground">{$t('leaks.empty')}</p>
      </HudPanel>
    {/if}
  {/if}
</PageContent>

<LeaksItemPreviewModal bind:item={previewItem} />
