<script lang="ts">
  import { toast } from 'svelte-sonner';
  import CheckIcon from '@lucide/svelte/icons/check';
  import DownloadIcon from '@lucide/svelte/icons/download';
  import SearchIcon from '@lucide/svelte/icons/search';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { language, t } from '$lib/i18n';
  import { spriteCatalogCache } from '$lib/modules/account-data';
  import { beginExportToast } from '$lib/modules/export-toast';
  import { rarityBackgroundStyle } from '$lib/modules/locker-export-rarity';
  import {
    readSpriteCollection,
    SPRITE_ENTRIES,
    SPRITE_EXPORT_ORDER,
    SPRITE_EXPORT_VARIANTS,
    updateSpriteCollection,
    writeSpriteCollection,
    type SpriteCollection,
    type SpriteEntry,
    type SpriteRarity,
    type SpriteVariant
  } from '$lib/modules/sprites';
  import { resolveSpriteLabel } from '$lib/modules/sprites-catalog';
  import { exportSpriteAlbumWebp } from '$lib/modules/sprites-export';
  import { accountStore } from '$lib/storage';
  import { handleError } from '$lib/utils';
  import PageActionButton from '$components/layout/PageActionButton.svelte';
  import PageContent from '$components/layout/PageContent.svelte';
  import SpritePreviewModal from '$components/modules/sprites/SpritePreviewModal.svelte';
  import { Input } from '$components/ui/input';

  type RarityFilter = 'all' | SpriteRarity;
  type VariantFilter = 'all' | SpriteVariant;
  type StatusFilter = 'all' | 'extracted' | 'mastered' | 'missing';

  const activeAccount = accountStore.getActiveStore(false);
  const catalogState = $derived(spriteCatalogCache.get($language));

  let search = $state('');
  let rarity = $state<RarityFilter>('all');
  let variant = $state<VariantFilter>('all');
  let status = $state<StatusFilter>('all');
  let isExporting = $state(false);
  let previewEntry = $state<SpriteEntry | null>(null);
  let collection = $state<SpriteCollection>({ extracted: [], mastered: [] });
  let collectionAvailable = $state(false);
  const progress = $derived({
    mastered: new Set(collection.mastered),
    extracted: new Set(collection.extracted)
  });
  const catalog = $derived(catalogState.data);

  const labelFor = (entry: (typeof SPRITE_ENTRIES)[number]) =>
    resolveSpriteLabel(entry.slug, { name: entry.name, ability: entry.ability }, catalog);

  const variantLabels = $derived<Record<SpriteVariant, string>>({
    base: $t('sprites.variants.base'),
    gold: $t('sprites.variants.gold'),
    'cheat-master': $t('sprites.variants.cheatMaster'),
    'loot-hacker': $t('sprites.variants.lootHacker'),
    'bounty-hunter': $t('sprites.variants.bountyHunter'),
    'trick-or-treat': $t('sprites.variants.trickOrTreat'),
    fortune: $t('sprites.variants.fortune')
  });

  const rarityLabels: Record<SpriteRarity, string> = {
    rare: 'Raro',
    epic: 'Épico',
    legendary: 'Lendário',
    mythic: 'Mítico'
  };

  const isExtracted = (entry: SpriteEntry) => progress.extracted.has(entry.key) || progress.mastered.has(entry.key);

  const isMastered = (entry: (typeof SPRITE_ENTRIES)[number]) => progress.mastered.has(entry.key);

  const familyOrder = Object.fromEntries(SPRITE_EXPORT_ORDER.map((slug, index) => [slug, index]));
  const variantOrder = Object.fromEntries(SPRITE_EXPORT_VARIANTS.map((value, index) => [value, index]));

  const filtered = $derived.by(() => {
    const query = search.trim().toLowerCase();
    return SPRITE_ENTRIES.filter(
      (entry) =>
        Object.hasOwn(familyOrder, entry.slug) &&
        (rarity === 'all' || entry.rarity === rarity) &&
        (variant === 'all' || entry.variant === variant) &&
        (status === 'all' ||
          (status === 'extracted' && isExtracted(entry)) ||
          (status === 'mastered' && isMastered(entry)) ||
          (status === 'missing' && !isExtracted(entry))) &&
        (!query ||
          labelFor(entry).name.toLowerCase().includes(query) ||
          entry.name.toLowerCase().includes(query) ||
          variantLabels[entry.variant].toLowerCase().includes(query))
    ).sort((a, b) => {
      const byFamily = (familyOrder[a.slug] ?? 99) - (familyOrder[b.slug] ?? 99);
      if (byFamily !== 0) return byFamily;
      return (variantOrder[a.variant] ?? 99) - (variantOrder[b.variant] ?? 99);
    });
  });

  const cardBackground = (rarity: SpriteRarity) => rarityBackgroundStyle({ rarity });

  function setCollection(entry: SpriteEntry, field: 'extracted' | 'mastered', input: HTMLInputElement) {
    const updated = updateSpriteCollection(collection, entry.key, field, input.checked);
    try {
      writeSpriteCollection($activeAccount?.accountId, updated.extracted, updated.mastered);
      collection = updated;
    } catch (error) {
      input.checked = field === 'extracted' ? isExtracted(entry) : isMastered(entry);
      handleError({ error, message: $t('sprites.collection.saveFailed'), account: $activeAccount ?? undefined });
    }
  }

  async function exportCollection() {
    if (isExporting) return;

    const ownedKeys = new Set([...progress.extracted, ...progress.mastered]);

    isExporting = true;
    const exportToast = beginExportToast();
    exportToast.progress($t('sprites.export.progress', { percent: 0 }));
    try {
      const result = await exportSpriteAlbumWebp({
        accountLabel: $activeAccount?.displayName ?? $t('sprites.collection.localName'),
        ownedKeys,
        masteredKeys: progress.mastered,
        locale: $language,
        catalog,
        onProgress: ({ done, total }) => {
          exportToast.progress(
            $t('sprites.export.progress', { percent: total > 0 ? Math.round((done / total) * 100) : 0 })
          );
        }
      });
      if (result.path) {
        exportToast.done(
          $t('sprites.export.done', { count: result.owned, total: result.count }),
          result.path,
          $t('sprites.export.open')
        );
      } else {
        exportToast.fail();
        toast.success($t('sprites.export.done', { count: result.owned, total: result.count }));
      }
    } catch (error) {
      exportToast.fail();
      handleError({ error, message: $t('sprites.export.failed'), account: $activeAccount ?? undefined });
    } finally {
      isExporting = false;
    }
  }

  $effect(() => {
    void spriteCatalogCache.ensure($language);
  });

  $effect(() => {
    const account = $activeAccount;
    try {
      collection = readSpriteCollection(account?.accountId);
      collectionAvailable = true;
    } catch (error) {
      collection = { extracted: [], mastered: [] };
      collectionAvailable = false;
      handleError({ error, message: $t('sprites.collection.loadFailed'), account: account ?? undefined });
    }
  });
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('sprites.page.description')}
  title={$t('sprites.page.title')}
>
  {#snippet actions()}
    <PageActionButton
      disabled={isExporting || !collectionAvailable}
      label={$t('sprites.export.button')}
      loading={isExporting}
      onclick={() => exportCollection()}
    >
      <DownloadIcon class="size-4" />
    </PageActionButton>
  {/snippet}

  <p class="text-sm text-muted-foreground">{$t('sprites.collection.manualHint')}</p>
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
      {#each SPRITE_EXPORT_VARIANTS as value (value)}
        <option {value}>{variantLabels[value]}</option>
      {/each}
    </select>
  </div>

  <div class="flex flex-wrap items-center justify-between gap-2">
    <p class="text-xs text-muted-foreground">{$t('sprites.results', { count: filtered.length })}</p>
  </div>

  <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
    {#each filtered as entry (entry.key)}
      {@const labels = labelFor(entry)}
      {@const owned = isExtracted(entry)}
      {@const hasMastery = isMastered(entry)}
      <article
        class="group flex flex-col overflow-hidden rounded-md border border-border/40 {hasMastery
          ? 'border-amber-400 ring-1 ring-amber-400/60'
          : owned
            ? 'border-primary ring-1 ring-primary/50'
            : ''}"
        style={cardBackground(entry.rarity)}
      >
        <button
          type="button"
          class="relative flex w-full flex-1 flex-col text-left transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          onclick={() => {
            previewEntry = entry;
          }}
        >
          <img
            class="aspect-square w-full shrink-0 object-contain p-1"
            alt={labels.name}
            loading="lazy"
            src={entry.image}
          />
          {#if hasMastery}
            <img
              class="absolute top-1 right-1 z-10 h-7 w-auto drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)]"
              title={$t('sprites.mastery.mastered')}
              alt=""
              src="/elementals/mastery-crown.webp"
            />
          {:else if owned}
            <span
              class="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow"
              title={$t('sprites.extracted')}
            >
              <CheckIcon class="size-4" />
            </span>
          {/if}
          <div class="mt-auto flex-1 space-y-0.5 bg-black/75 px-2 pt-2 pb-2 text-white">
            <p class="truncate text-xs font-semibold">{labels.name}</p>
            <p class="text-[10px] text-white/70">
              {variantLabels[entry.variant]} · {rarityLabels[entry.rarity]}
            </p>
          </div>
        </button>
        <div class="flex flex-wrap gap-x-3 gap-y-1 bg-black/85 px-2 py-2 text-xs text-white">
          <label class="flex cursor-pointer items-center gap-1">
            <input
              type="checkbox"
              checked={owned}
              disabled={!collectionAvailable}
              aria-label={$t('sprites.collection.ownedLabel', {
                name: labels.name,
                variant: variantLabels[entry.variant]
              })}
              onchange={(event) => setCollection(entry, 'extracted', event.currentTarget)}
            />
            {$t('sprites.collection.owned')}
          </label>
          <label class="flex cursor-pointer items-center gap-1">
            <input
              type="checkbox"
              checked={hasMastery}
              disabled={!collectionAvailable}
              aria-label={$t('sprites.collection.masteredLabel', {
                name: labels.name,
                variant: variantLabels[entry.variant]
              })}
              onchange={(event) => setCollection(entry, 'mastered', event.currentTarget)}
            />
            {$t('sprites.mastery.mastered')}
          </label>
        </div>
      </article>
    {/each}
  </div>
</PageContent>

<SpritePreviewModal {variantLabels} {rarityLabels} {catalog} bind:entry={previewEntry} />
