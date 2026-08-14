<script lang="ts">
  import EyeIcon from '@lucide/svelte/icons/eye';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import { ItemColors } from '$lib/constants/item-colors';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { language, t } from '$lib/i18n';
  import { leaksCache } from '$lib/modules/account-data';
  import type { LeakedCosmetic } from '$lib/modules/fortnite-leaks';
  import PageActionButton from '$components/layout/PageActionButton.svelte';
  import PageContent from '$components/layout/PageContent.svelte';
  import PageLoading from '$components/layout/PageLoading.svelte';
  import HudPanel from '$components/ui/hud/HudPanel.svelte';

  const colors: Record<string, string> = { ...ItemColors.rarities, ...ItemColors.series };

  const cached = $derived(leaksCache.get($language));
  const leaksData = $derived(cached.data);
  const isLoading = $derived(cached.loading || cached.refreshing);
  const loadFailed = $derived(!!cached.error && !cached.data);

  function cosmeticBackground(cosmetic: LeakedCosmetic) {
    const seriesKey = cosmetic.series?.toLowerCase().replace(/\s+/g, '') ?? '';
    const rarityKey = cosmetic.rarityValue;
    return colors[seriesKey] || colors[rarityKey] || colors.common;
  }

  function formatBuildLabel(build: string) {
    const match = build.match(/Release-([\d.]+)-CL-(\d+)/i);
    if (match) return `${match[1]} (CL-${match[2]})`;
    return build;
  }

  function loadLeaks(forceRefresh = false) {
    void leaksCache.ensure($language, { force: forceRefresh });
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
  {/snippet}

  {#if loadFailed}
    <HudPanel>
      <p class="text-sm text-destructive">{$t('leaks.failedToFetch')}</p>
    </HudPanel>
  {:else if isLoading && !leaksData}
    <PageLoading label={$t('loading')} />
  {:else if leaksData}
    <HudPanel>
      <div class="flex flex-wrap items-start gap-3">
        <div class="rounded-md bg-primary/10 p-2 text-primary">
          <EyeIcon class="size-5" />
        </div>
        <div class="min-w-0 flex-1 space-y-1">
          <p class="text-sm font-medium">
            {$t('leaks.buildInfo', { build: formatBuildLabel(leaksData.build) })}
          </p>
          <p class="text-xs text-muted-foreground">
            {$t('leaks.lastAddition', {
              date: new Date(leaksData.lastBrAddition).toLocaleString($language)
            })}
          </p>
          <span class="hud-chip text-xs tabular-nums">
            {$t('leaks.itemCount', { count: leaksData.cosmetics.length })}
          </span>
        </div>
      </div>
    </HudPanel>

    {#if leaksData.cosmetics.length}
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {#each leaksData.cosmetics as cosmetic (cosmetic.id)}
          <div
            style="background-color: {cosmeticBackground(cosmetic)}"
            class="overflow-hidden rounded-md border border-border/40"
          >
            {#if cosmetic.image}
              <img
                class="aspect-square w-full object-cover"
                alt={cosmetic.name}
                loading="lazy"
                src={cosmetic.image}
              />
            {/if}

            <div class="space-y-0.5 bg-black/70 px-2 py-1.5">
              <p class="truncate text-xs font-medium text-white">{cosmetic.name}</p>
              <p class="truncate text-[10px] text-white/70">{cosmetic.type}</p>
              <p class="truncate text-[10px] text-white/50">{cosmetic.rarity}</p>
            </div>
          </div>
        {/each}
      </div>
    {:else if !isLoading}
      <HudPanel>
        <p class="text-sm text-muted-foreground">{$t('leaks.empty')}</p>
      </HudPanel>
    {/if}
  {/if}
</PageContent>
