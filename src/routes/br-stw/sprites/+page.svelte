<script lang="ts">
  import { toast } from 'svelte-sonner';
  import CheckIcon from '@lucide/svelte/icons/check';
  import CrownIcon from '@lucide/svelte/icons/crown';
  import DownloadIcon from '@lucide/svelte/icons/download';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import SearchIcon from '@lucide/svelte/icons/search';
  import { openPath } from '@tauri-apps/plugin-opener';
  import { ItemColors } from '$lib/constants/item-colors';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { t } from '$lib/i18n';
  import { fetchSpriteAccountState, SPRITE_DUST_ICON, type SpriteResources } from '$lib/modules/sprites-account';
  import { exportSpriteAlbumWebp } from '$lib/modules/sprites-export';
  import {
    SPRITE_ENTRIES,
    type SpriteEntry,
    type SpriteProgress,
    type SpriteRarity,
    type SpriteVariant
  } from '$lib/modules/sprites';
  import { accountStore } from '$lib/storage';
  import { handleError } from '$lib/utils';
  import PageActionButton from '$components/layout/PageActionButton.svelte';
  import PageContent from '$components/layout/PageContent.svelte';
  import PageLoading from '$components/layout/PageLoading.svelte';
  import SpritePreviewModal from '$components/modules/sprites/SpritePreviewModal.svelte';
  import { Input } from '$components/ui/input';
  import { Progress } from '$components/ui/progress';

  type RarityFilter = 'all' | SpriteRarity;
  type VariantFilter = 'all' | SpriteVariant;
  type StatusFilter = 'all' | 'extracted' | 'mastered' | 'missing';

  const activeAccount = accountStore.getActiveStore(false);

  let progress = $state<SpriteProgress>({ mastered: new Set(), extracted: new Set() });
  let search = $state('');
  let rarity = $state<RarityFilter>('all');
  let variant = $state<VariantFilter>('all');
  let status = $state<StatusFilter>('all');
  let isLoadingAccount = $state(true);
  let isExporting = $state(false);
  let exportPercent = $state(0);
  let lastExportPath = $state<string | null>(null);
  let previewEntry = $state<SpriteEntry | null>(null);
  let resources = $state<SpriteResources>({ dust: 0, gizmos: [] });
  let levels = $state<Record<string, number>>({});

  const variantLabels: Record<SpriteVariant, string> = {
    base: 'Base',
    gold: 'Dourado',
    'cheat-master': 'Cheat Master'
  };

  const rarityLabels: Record<SpriteRarity, string> = {
    rare: 'Raro',
    epic: 'Épico',
    legendary: 'Lendário',
    mythic: 'Mítico'
  };

  const isExtracted = (entry: (typeof SPRITE_ENTRIES)[number]) =>
    progress.mastered.has(entry.key) ||
    (entry.variant === 'base' && progress.extracted.has(entry.slug)) ||
    levels[entry.key] != null;

  const isMastered = (entry: (typeof SPRITE_ENTRIES)[number]) => progress.mastered.has(entry.key);

  const filtered = $derived.by(() => {
    const query = search.trim().toLowerCase();
    return SPRITE_ENTRIES.filter(
      (entry) =>
        (rarity === 'all' || entry.rarity === rarity) &&
        (variant === 'all' || entry.variant === variant) &&
        (status === 'all' ||
          (status === 'extracted' && isExtracted(entry)) ||
          (status === 'mastered' && isMastered(entry)) ||
          (status === 'missing' && !isExtracted(entry))) &&
        (!query ||
          entry.name.toLowerCase().includes(query) ||
          variantLabels[entry.variant].toLowerCase().includes(query))
    );
  });

  function cardBackground(rarity: SpriteRarity) {
    return rarity === 'mythic' ? '#c89b28' : ItemColors.rarities[rarity];
  }

  async function exportCollection() {
    if (!$activeAccount || isExporting) return;

    const ownedKeys = new Set<string>([
      ...progress.mastered,
      ...[...progress.extracted].map((slug) => `${slug}:base`),
      ...Object.keys(levels)
    ]);

    isExporting = true;
    exportPercent = 0;
    lastExportPath = null;
    try {
      const result = await exportSpriteAlbumWebp({
        accountLabel: $activeAccount.displayName,
        ownedKeys,
        levels,
        resources,
        onProgress: ({ done, total }) => {
          exportPercent = total > 0 ? Math.round((done / total) * 100) : 0;
        }
      });
      lastExportPath = result.path;
      toast.success($t('sprites.export.done', { count: result.owned }));
    } catch (error) {
      handleError({ error, message: $t('sprites.export.failed'), account: $activeAccount });
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
      handleError({ error, message: $t('sprites.export.failed'), account: $activeAccount ?? undefined });
    }
  }

  $effect(() => {
    const account = $activeAccount;
    progress = { mastered: new Set(), extracted: new Set() };
    resources = { dust: 0, gizmos: [] };
    levels = {};
    if (!account) {
      isLoadingAccount = false;
      return;
    }

    isLoadingAccount = true;
    let cancelled = false;
    fetchSpriteAccountState(account)
      .then((result) => {
        if (cancelled) return;
        progress = { mastered: result.mastered, extracted: result.extracted };
        resources = result.resources;
        levels = result.levels;
        isLoadingAccount = false;
      })
      .catch((error) => {
        handleError({ error, message: $t('sprites.mastery.failed'), account });
        if (!cancelled) isLoadingAccount = false;
      });

    return () => {
      cancelled = true;
    };
  });
</script>

<PageContent center centerClass={HUD_PAGE_WIDTH} description={$t('sprites.page.description')} title={$t('sprites.page.title')}>
  {#snippet actions()}
    {#if $activeAccount}
      <PageActionButton
        disabled={isExporting || isLoadingAccount}
        label={$t('sprites.export.button')}
        loading={isExporting}
        onclick={() => exportCollection()}
      >
        <DownloadIcon class="size-4" />
      </PageActionButton>
      {#if lastExportPath}
        <PageActionButton disabled={isExporting} label={$t('sprites.export.open')} onclick={() => openLastExport()}>
          <ExternalLinkIcon class="size-4" />
        </PageActionButton>
      {/if}
    {/if}
  {/snippet}

  {#if isExporting}
    <div
      class="flex flex-col items-center justify-center gap-4 py-16 text-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LoaderCircleIcon class="size-8 animate-spin text-primary" strokeWidth={2.25} />
      <p class="text-sm text-muted-foreground">
        {$t('sprites.export.progress', { percent: exportPercent })}
      </p>
      <Progress class="h-2 w-full max-w-xs" value={exportPercent} />
    </div>
  {:else if isLoadingAccount}
    <PageLoading label={$t('loading')} />
  {:else}
    <div class="grid gap-2 md:grid-cols-[minmax(0,1fr)_160px_160px_160px]">
      <div class="relative">
        <SearchIcon class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input class="pl-9" placeholder={$t('sprites.search')} bind:value={search} />
      </div>
      <select class="h-9 rounded-md border border-input bg-background px-3 text-sm" bind:value={status}>
        <option value="all">{$t('sprites.filters.allStatuses')}</option>
        <option value="extracted">{$t('sprites.filters.onlyExtracted')}</option>
        <option value="mastered">{$t('sprites.filters.onlyMastered')}</option>
        <option value="missing">{$t('sprites.filters.onlyMissing')}</option>
      </select>
      <select class="h-9 rounded-md border border-input bg-background px-3 text-sm" bind:value={rarity}>
        <option value="all">{$t('sprites.filters.allRarities')}</option>
        {#each Object.entries(rarityLabels) as [value, label]}
          <option {value}>{label}</option>
        {/each}
      </select>
      <select class="h-9 rounded-md border border-input bg-background px-3 text-sm" bind:value={variant}>
        <option value="all">{$t('sprites.filters.allVariants')}</option>
        {#each Object.entries(variantLabels) as [value, label]}
          <option {value}>{label}</option>
        {/each}
      </select>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-xs text-muted-foreground">{$t('sprites.results', { count: filtered.length })}</p>
      {#if $activeAccount}
        <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span
            class="inline-flex items-center gap-1 rounded-md border border-border/50 bg-background/60 px-1.5 py-0.5"
            title={$t('sprites.resources.dust')}
          >
            <img src={SPRITE_DUST_ICON} alt="" class="size-5 object-contain" />
            <strong class="text-foreground tabular-nums">{resources.dust}</strong>
          </span>
          {#each resources.gizmos as gizmo (gizmo.id)}
            <span
              class="inline-flex items-center gap-1 rounded-md border border-border/50 bg-background/60 px-1.5 py-0.5"
              title={gizmo.label}
            >
              {#if gizmo.iconUrl}
                <img src={gizmo.iconUrl} alt="" class="size-5 object-contain" />
              {/if}
              <strong class="text-foreground tabular-nums">{gizmo.quantity}</strong>
            </span>
          {/each}
        </div>
      {/if}
    </div>

    <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {#each filtered as entry (entry.key)}
        {@const owned = isExtracted(entry)}
        {@const hasMastery = isMastered(entry)}
        <article
          class="group overflow-hidden rounded-md border border-border/40 {hasMastery
            ? 'border-amber-400 ring-1 ring-amber-400/60'
            : owned
              ? 'border-primary ring-1 ring-primary/50'
              : ''}"
          style="background-color: {cardBackground(entry.rarity)}"
        >
          <button
            type="button"
            class="relative block w-full text-left transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            onclick={() => {
              previewEntry = entry;
            }}
          >
            <img
              class="aspect-square w-full object-contain p-1"
              alt={entry.name}
              loading="lazy"
              src={entry.image}
            />
            {#if levels[entry.key] >= 1 && levels[entry.key] <= 5}
              <span
                class="absolute top-2 left-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-cyan-300"
                title={$t('sprites.level', { level: levels[entry.key] })}
              >
                {$t('sprites.level', { level: levels[entry.key] })}
              </span>
            {/if}
            {#if hasMastery}
              <span
                class="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-amber-400 text-black shadow"
                title={$t('sprites.mastery.mastered')}
              >
                <CrownIcon class="size-4" />
              </span>
            {:else if owned}
              <span
                class="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow"
                title={$t('sprites.extracted')}
              >
                <CheckIcon class="size-4" />
              </span>
            {/if}
            <div class="space-y-0.5 bg-black/75 px-2 pt-2 text-white">
              <p class="truncate text-xs font-semibold">{entry.name}</p>
              <p class="pb-1 text-[10px] text-white/70">
                {variantLabels[entry.variant]} · {rarityLabels[entry.rarity]}
              </p>
            </div>
          </button>
        </article>
      {/each}
    </div>
  {/if}
</PageContent>

<SpritePreviewModal {variantLabels} {rarityLabels} bind:entry={previewEntry} />
