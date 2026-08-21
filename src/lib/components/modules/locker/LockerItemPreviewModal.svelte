<script module lang="ts">
  /** Kept between items so the volume is set once per session, not per preview. */
  const audioPreference = { muted: true, volume: 0.6 };
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { ItemColors } from '$lib/constants/item-colors';
  import { t } from '$lib/i18n';
  import type { LockerCategory, LockerOwnedItem } from '$lib/modules/locker-parse';
  import { rarityBackgroundStyle } from '$lib/modules/locker-export-rarity';
  import {
    mergeStyles,
    resolveCosmeticPreview,
    type CosmeticPreview
  } from '$lib/modules/shop-preview-video';
  import CosmeticStyles, { type StyleOption } from '$components/modules/shop/CosmeticStyles.svelte';
  import { Badge } from '$components/ui/badge';
  import * as Dialog from '$components/ui/dialog';

  type Props = {
    item: LockerOwnedItem | null;
    category: LockerCategory;
  };

  let { item = $bindable(), category }: Props = $props();

  const colors: Record<string, string> = { ...ItemColors.rarities, ...ItemColors.series };
  let isOpen = $state(false);
  let preview = $state<CosmeticPreview>({ video: null, styles: [] });
  let previewVideoFailed = $state(false);
  let selectedStyle = $state<StyleOption | null>(null);

  const hasAudio = $derived(category === 'emotes');
  const badgeLabel = $derived(item?.series || item?.rarity || '');
  const badgeColor = $derived(colors[badgeLabel] || colors.common);
  const styles = $derived<StyleOption[]>(mergeStyles(item?.styles ?? [], preview));
  const previewVideoUrl = $derived(selectedStyle ? (selectedStyle.video ?? null) : preview.video);
  const previewBg = $derived(
    item ? rarityBackgroundStyle({ rarity: item.rarity, series: item.series }) : ''
  );

  $effect(() => {
    isOpen = !!item;
  });

  $effect(() => {
    const cosmeticId = item?.cosmeticId;
    preview = { video: null, styles: [] };
    previewVideoFailed = false;
    selectedStyle = null;
    if (!cosmeticId) return;

    let cancelled = false;
    void resolveCosmeticPreview(cosmeticId).then((result) => {
      if (!cancelled) preview = result;
    });
    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    previewVideoUrl;
    untrack(() => (previewVideoFailed = false));
  });

  function close() {
    item = null;
  }
</script>

<Dialog.Root
  onOpenChangeComplete={(open) => {
    if (!open) close();
  }}
  bind:open={isOpen}
>
  {#if item}
    <Dialog.Content
      class="flex w-[min(96vw,56rem)] !max-w-none flex-col gap-0 overflow-hidden p-0 sm:w-[min(96vw,64rem)]"
    >
      <div
        class="grid max-h-[min(90vh,52rem)] grid-cols-1 overflow-y-auto sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
      >
        <div
          class="relative flex min-h-72 flex-col items-center justify-center gap-3 p-4 sm:min-h-[28rem] sm:border-r sm:border-border/80"
          style={previewBg}
        >
          {#if previewVideoUrl && !previewVideoFailed}
            <video
              class="max-h-[min(70vh,36rem)] w-full object-contain"
              autoplay
              controls={hasAudio}
              loop
              muted
              playsinline
              poster={selectedStyle?.image || item.imageUrl || undefined}
              src={previewVideoUrl}
              onerror={() => {
                previewVideoFailed = true;
              }}
              onloadeddata={(event) => {
                if (!hasAudio) return;
                event.currentTarget.volume = audioPreference.volume;
                event.currentTarget.muted = audioPreference.muted;
              }}
              onvolumechange={(event) => {
                if (!hasAudio) return;
                audioPreference.volume = event.currentTarget.volume;
                audioPreference.muted = event.currentTarget.muted;
              }}
            ></video>
            <a
              class="text-center text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
              href="https://fortnite.gg"
              onclick={(e) => {
                e.preventDefault();
                void openUrl('https://fortnite.gg');
              }}
              rel="noreferrer"
            >
              {$t('itemShop.itemInformation.videoCredit')}
            </a>
          {:else if selectedStyle?.image || item.imageUrl}
            <img
              class="max-h-[min(70vh,36rem)] w-full object-contain"
              alt={item.name}
              src={selectedStyle?.image || item.imageUrl}
            />
          {:else}
            <p class="text-sm text-muted-foreground">{item.name}</p>
          {/if}
        </div>

        <div class="flex flex-col gap-y-5 overflow-y-auto p-5 sm:p-6">
          <div class="space-y-3">
            <div>
              <h2 class="text-xl leading-tight font-semibold tracking-tight">{item.name}</h2>
              {#if item.description}
                <p class="mt-1 text-sm text-muted-foreground italic">{item.description}</p>
              {/if}
            </div>

            {#if badgeLabel}
              <Badge
                style="background: {badgeColor}"
                class="rounded-md px-2.5 py-0.5 text-xs font-medium text-foreground capitalize"
              >
                {badgeLabel}
              </Badge>
            {/if}

            {#if item.equippedSlots.length}
              <p class="text-xs text-muted-foreground">{$t('locker.equippedNow')}</p>
            {/if}
          </div>

          <CosmeticStyles {styles} bind:selected={selectedStyle} />
        </div>
      </div>
    </Dialog.Content>
  {/if}
</Dialog.Root>
