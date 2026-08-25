<script module lang="ts">
  /** Kept between items so the volume is set once per session, not per preview. */
  const audioPreference = { muted: true, volume: 0.6 };
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { ItemColors } from '$lib/constants/item-colors';
  import { t } from '$lib/i18n';
  import type { LeakedCosmetic } from '$lib/modules/fortnite-leaks';
  import {
    mergeStyles,
    resolveCosmeticPreview,
    type CosmeticPreview
  } from '$lib/modules/shop-preview-video';
  import CosmeticStyles, { type StyleOption } from '$components/modules/shop/CosmeticStyles.svelte';
  import { Badge } from '$components/ui/badge';
  import * as Dialog from '$components/ui/dialog';

  type Props = {
    item: LeakedCosmetic | null;
  };

  let { item = $bindable() }: Props = $props();

  const colors: Record<string, string> = { ...ItemColors.rarities, ...ItemColors.series };
  let isOpen = $state(false);
  let preview = $state<CosmeticPreview>({ video: null, styles: [] });
  let previewVideoFailed = $state(false);
  let selectedStyle = $state<StyleOption | null>(null);

  const badgeLabel = $derived(item?.series || item?.rarity || '');
  const badgeColor = $derived.by(() => {
    if (!item) return colors.common;
    const seriesKey = item.series?.toLowerCase().replace(/\s+/g, '') ?? '';
    return colors[seriesKey] || colors[item.rarityValue] || colors.common;
  });
  const styles = $derived<StyleOption[]>(mergeStyles(item?.styles ?? [], preview));
  const previewVideoUrl = $derived(selectedStyle ? (selectedStyle.video ?? null) : preview.video);
  const previewImage = $derived(selectedStyle?.image || item?.image || '');

  $effect(() => {
    isOpen = !!item;
  });

  $effect(() => {
    const cosmeticId = item?.id;
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
        class="grid max-h-[min(90vh,52rem)] grid-cols-1 overflow-y-auto sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] sm:overflow-hidden"
      >
        <div
          class="relative min-h-72 overflow-hidden bg-[#121218] sm:min-h-[28rem] sm:border-r sm:border-border/80"
        >
          {#if previewVideoUrl && !previewVideoFailed}
            <video
              class="absolute inset-0 size-full object-contain"
              autoplay
              loop
              muted
              playsinline
              poster={previewImage || undefined}
              src={previewVideoUrl}
              onerror={() => {
                previewVideoFailed = true;
              }}
              onloadeddata={(event) => {
                event.currentTarget.volume = audioPreference.volume;
                event.currentTarget.muted = audioPreference.muted;
              }}
              onvolumechange={(event) => {
                audioPreference.volume = event.currentTarget.volume;
                audioPreference.muted = event.currentTarget.muted;
              }}
            ></video>
            <a
              class="absolute inset-x-0 bottom-2 z-10 text-center text-xs text-white/70 underline-offset-2 hover:text-white hover:underline"
              href="https://fortnite.gg"
              onclick={(e) => {
                e.preventDefault();
                void openUrl('https://fortnite.gg');
              }}
              rel="noreferrer"
            >
              {$t('itemShop.itemInformation.videoCredit')}
            </a>
          {:else if previewImage}
            <img
              class="absolute inset-0 size-full object-contain"
              alt={item.name}
              src={previewImage}
            />
          {:else}
            <p class="relative z-10 p-4 text-sm text-muted-foreground">{item.name}</p>
          {/if}
        </div>

        <div class="flex min-h-0 flex-col gap-y-5 overflow-y-auto p-5 sm:p-6">
          <div class="space-y-3">
            <div>
              <h2 class="text-xl leading-tight font-semibold tracking-tight">{item.name}</h2>
              <p class="mt-1 text-sm text-muted-foreground">{item.type}</p>
            </div>

            {#if badgeLabel}
              <Badge
                style="background: {badgeColor}"
                class="rounded-md px-2.5 py-0.5 text-xs font-medium text-foreground capitalize"
              >
                {badgeLabel}
              </Badge>
            {/if}
          </div>

          <CosmeticStyles {styles} bind:selected={selectedStyle} />
        </div>
      </div>
    </Dialog.Content>
  {/if}
</Dialog.Root>
