<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { SvelteSet } from 'svelte/reactivity';
  import CheckIcon from '@lucide/svelte/icons/check';
  import CrownIcon from '@lucide/svelte/icons/crown';
  import DownloadIcon from '@lucide/svelte/icons/download';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import SearchIcon from '@lucide/svelte/icons/search';
  import SparklesIcon from '@lucide/svelte/icons/sparkles';
  import { openPath } from '@tauri-apps/plugin-opener';
  import { ItemColors } from '$lib/constants/item-colors';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { t } from '$lib/i18n';
  import { exportLockerCategoryWebp, type LockerExportItem } from '$lib/modules/locker-export';
  import {
    fetchSpriteProgress,
    readSpriteCollection,
    SPRITE_ENTRIES,
    spriteShortName,
    writeSpriteCollection,
    type SpriteProgress,
    type SpriteRarity,
    type SpriteVariant
  } from '$lib/modules/sprites';
  import { accountStore } from '$lib/storage';
  import { handleError } from '$lib/utils';
  import PageActionButton from '$components/layout/PageActionButton.svelte';
  import PageContent from '$components/layout/PageContent.svelte';
  import * as Dialog from '$components/ui/dialog';
  import HudPanel from '$components/ui/hud/HudPanel.svelte';
  import { Input } from '$components/ui/input';
  import { Progress } from '$components/ui/progress';

  type RarityFilter = 'all' | SpriteRarity;
  type VariantFilter = 'all' | SpriteVariant;
  type StatusFilter = 'all' | 'extracted' | 'mastered' | 'missing';

  const activeAccount = accountStore.getActiveStore(false);
  const extracted = new SvelteSet<string>();
  const mastered = new SvelteSet<string>();

  let progress = $state<SpriteProgress>({ mastered: new Set(), extracted: new Set() });
  let search = $state('');
  let rarity = $state<RarityFilter>('all');
  let variant = $state<VariantFilter>('all');
  let status = $state<StatusFilter>('all');
  let showCollectionInfo = $state(false);
  let hideCollectionInfo = $state(false);
  let isExporting = $state(false);
  let exportPercent = $state(0);
  let lastExportPath = $state<string | null>(null);

  const COLLECTION_INFO_DISMISSED = 'dozamigos:elementals-info-dismissed';

  const variantLabels: Record<SpriteVariant, string> = {
    base: 'Base',
    gold: 'Dourado',
    gummy: 'Goma',
    galaxy: 'Galáxia',
    holofoil: 'Holofoil',
    cube: 'Cubo',
    quack: 'Quack',
    gem: 'Gema'
  };

  const rarityLabels: Record<SpriteRarity, string> = {
    rare: 'Raro',
    epic: 'Épico',
    legendary: 'Lendário',
    mythic: 'Mítico'
  };

  /** Epic only proves extraction for the base Sprite; variants stay on manual marks. */
  const isAutoExtracted = (entry: (typeof SPRITE_ENTRIES)[number]) =>
    progress.mastered.has(entry.key) || (entry.variant === 'base' && progress.extracted.has(entry.slug));

  const isExtracted = (entry: (typeof SPRITE_ENTRIES)[number]) => extracted.has(entry.key) || isAutoExtracted(entry);
  const isMastered = (entry: (typeof SPRITE_ENTRIES)[number]) =>
    mastered.has(entry.key) || progress.mastered.has(entry.key);

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

  const extractedCount = $derived(SPRITE_ENTRIES.filter(isExtracted).length);
  const masteredCount = $derived(SPRITE_ENTRIES.filter(isMastered).length);

  function save() {
    writeSpriteCollection($activeAccount?.accountId, extracted, mastered);
  }

  function toggleExtracted(key: string) {
    if (extracted.has(key)) {
      extracted.delete(key);
      mastered.delete(key);
    } else {
      extracted.add(key);
    }
    save();
  }

  function toggleMastered(key: string) {
    if (progress.mastered.has(key)) return;
    if (mastered.has(key)) {
      mastered.delete(key);
    } else {
      extracted.add(key);
      mastered.add(key);
    }
    save();
  }

  function cardBackground(rarity: SpriteRarity) {
    return rarity === 'mythic' ? '#c89b28' : ItemColors.rarities[rarity];
  }

  async function exportCollection() {
    if (!$activeAccount || isExporting) return;
    // Exports exactly what the filters are showing, so each status can be its own image.
    const items: LockerExportItem[] = filtered.map((entry) => ({
      itemId: entry.key,
      templateId: entry.key,
      cosmeticId: entry.key,
      name: `${spriteShortName(entry.name)} · ${variantLabels[entry.variant]}`,
      note: isMastered(entry)
        ? $t('sprites.mastery.mastered')
        : isExtracted(entry)
          ? $t('sprites.extracted')
          : $t('sprites.export.pending'),
      faded: !isExtracted(entry),
      description: '',
      rarity: entry.rarity,
      styles: [],
      imageUrl: entry.image,
      favorite: false,
      equippedSlots: []
    }));

    if (!items.length) {
      toast.info($t('sprites.export.empty'));
      return;
    }

    isExporting = true;
    exportPercent = 0;
    lastExportPath = null;
    try {
      const result = await exportLockerCategoryWebp({
        items,
        categorySlug: 'elementais',
        categoryLabel: $t('sprites.page.title'),
        accountLabel: $activeAccount.displayName,
        onProgress: ({ done, total }) => {
          exportPercent = total > 0 ? Math.round((done / total) * 100) : 0;
        }
      });
      lastExportPath = result.path;
      toast.success($t('sprites.export.done', { count: result.count }));
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

  function closeCollectionInfo(open: boolean) {
    if (open) return;
    if (hideCollectionInfo) localStorage.setItem(COLLECTION_INFO_DISMISSED, 'true');
    else localStorage.removeItem(COLLECTION_INFO_DISMISSED);
  }

  onMount(() => {
    showCollectionInfo = localStorage.getItem(COLLECTION_INFO_DISMISSED) !== 'true';
  });

  $effect(() => {
    const accountId = $activeAccount?.accountId;
    const collection = readSpriteCollection(accountId);
    extracted.clear();
    mastered.clear();
    for (const key of collection.extracted) extracted.add(key);
    for (const key of collection.mastered) mastered.add(key);
  });

  $effect(() => {
    const account = $activeAccount;
    progress = { mastered: new Set(), extracted: new Set() };
    if (!account) return;

    let cancelled = false;
    fetchSpriteProgress(account)
      .then((result) => {
        if (!cancelled) progress = result;
      })
      .catch((error) => handleError({ error, message: $t('sprites.mastery.failed'), account }));

    return () => {
      cancelled = true;
    };
  });
</script>

<PageContent center centerClass={HUD_PAGE_WIDTH} description={$t('sprites.page.description')}>
  {#snippet title()}
    <div class="flex items-center gap-2">
      <h2 class="font-display text-2xl leading-none text-foreground sm:text-3xl md:text-4xl">
        {$t('sprites.page.title')}
      </h2>
      <button
        type="button"
        aria-label={$t('sprites.collection.title')}
        title={$t('sprites.collection.title')}
        onclick={() => (showCollectionInfo = true)}
        class="flex size-6 animate-pulse items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow transition hover:animate-none hover:brightness-110"
      >
        !
      </button>
    </div>
  {/snippet}
  {#snippet actions()}
    {#if $activeAccount}
      <PageActionButton
        disabled={isExporting || filtered.length === 0}
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
  {:else}
    <HudPanel>
      <div class="flex flex-wrap items-center gap-3">
        <div class="rounded-md bg-primary/10 p-2 text-primary">
          <SparklesIcon class="size-5" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium">{$t('sprites.summary', { count: SPRITE_ENTRIES.length })}</p>
          <p class="text-xs text-muted-foreground">
            {$t('sprites.extractedSummary', { count: extractedCount })}
            · {$t('sprites.masteredSummary', { count: masteredCount })}
          </p>
        </div>
        {#if progress.mastered.size}
          <span class="hud-chip">{$t('sprites.mastery.detected', { count: progress.mastered.size })}</span>
        {/if}
      </div>
    </HudPanel>

    <Dialog.Root bind:open={showCollectionInfo} onOpenChangeComplete={closeCollectionInfo}>
      <Dialog.Content class="max-w-md">
        <Dialog.Header>
          <Dialog.Title class="flex items-center gap-2">
            <CrownIcon class="size-5 text-primary" />
            {$t('sprites.collection.title')}
          </Dialog.Title>
          <Dialog.Description class="space-y-3 text-left leading-relaxed whitespace-normal">
            <span class="block">{$t('sprites.collection.perAccount')}</span>
            <span class="block">{$t('sprites.collection.explanation')}</span>
          </Dialog.Description>
        </Dialog.Header>
        <label class="flex cursor-pointer items-center gap-2 text-sm">
          <input class="size-4 accent-primary" type="checkbox" bind:checked={hideCollectionInfo} />
          {$t('sprites.collection.dontShowAgain')}
        </label>
      </Dialog.Content>
    </Dialog.Root>

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

    <p class="text-xs text-muted-foreground">{$t('sprites.results', { count: filtered.length })}</p>

    <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {#each filtered as entry (entry.key)}
        {@const isDetectedMastery = progress.mastered.has(entry.key)}
        {@const isDetectedExtracted = isAutoExtracted(entry)}
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
          <div class="relative">
            <img class="aspect-square w-full object-cover" alt={entry.name} loading="lazy" src={entry.image} />
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
          </div>
          <div class="space-y-1.5 bg-black/75 p-2 text-white">
            <div>
              <p class="truncate text-xs font-semibold">{entry.name}</p>
              <p class="text-[10px] text-white/70">
                {variantLabels[entry.variant]} · {rarityLabels[entry.rarity]}
              </p>
            </div>
            <div class="grid grid-cols-2 gap-1">
              <button
                type="button"
                aria-pressed={owned}
                disabled={isDetectedExtracted}
                onclick={() => toggleExtracted(entry.key)}
                class="flex items-center justify-center gap-1 rounded border border-white/20 px-1 py-1 text-[10px] transition hover:bg-white/10 disabled:cursor-default {owned
                  ? 'bg-primary text-primary-foreground'
                  : ''}"
              >
                <DownloadIcon class="size-3" />
                {$t('sprites.extracted')}
              </button>
              <button
                type="button"
                aria-pressed={hasMastery}
                disabled={isDetectedMastery}
                onclick={() => toggleMastered(entry.key)}
                class="flex items-center justify-center gap-1 rounded border border-white/20 px-1 py-1 text-[10px] transition hover:bg-white/10 disabled:cursor-default {hasMastery
                  ? 'bg-amber-400 text-black'
                  : ''}"
              >
                <CrownIcon class="size-3" />
                {$t('sprites.mastery.mastered')}
              </button>
            </div>
          </div>
        </article>
      {/each}
    </div>

    <p class="text-center text-[10px] text-muted-foreground">{$t('sprites.source')}</p>
  {/if}
</PageContent>
