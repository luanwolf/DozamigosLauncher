<script module lang="ts">
  /** Kept between items so the volume is set once per session, not per preview. */
  const audioPreference = { muted: true, volume: 0.6 };
</script>

<script lang="ts">
  import { ItemColors } from '$lib/constants/item-colors';
  import type { LeakedCosmetic } from '$lib/modules/fortnite-leaks';
  import { rarityBackgroundStyle } from '$lib/modules/locker-export-rarity';
  import {
    mergeStyles,
    resolveCosmeticPreview,
    type CosmeticPreview
  } from '$lib/modules/shop-preview-video';
  import CosmeticPreviewPane from '$components/modules/shop/CosmeticPreviewPane.svelte';
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
  let selectedStyle = $state<StyleOption | null>(null);
  let previewMuted = $state(audioPreference.muted);

  const badgeLabel = $derived(item?.series || item?.rarity || '');
  const badgeColor = $derived.by(() => {
    if (!item) return colors.common;
    const seriesKey = item.series?.toLowerCase().replace(/\s+/g, '') ?? '';
    return colors[seriesKey] || colors[item.rarityValue] || colors.common;
  });
  const styles = $derived<StyleOption[]>(mergeStyles(item?.styles ?? [], preview));
  const previewVideoUrl = $derived(selectedStyle ? (selectedStyle.video ?? null) : preview.video);
  const previewImage = $derived(selectedStyle?.image || item?.image || '');
  const hasAudio = $derived(/emote|gesto|dance|music|música|jam/i.test(item?.type ?? '') || /^EID_/i.test(item?.id ?? ''));
  const previewBg = $derived(
    item
      ? rarityBackgroundStyle({
          rarity: item.rarityValue,
          series: item.series?.toLowerCase().replace(/\s+/g, '')
        })
      : ''
  );

  $effect(() => {
    isOpen = !!item;
  });

  $effect(() => {
    const cosmeticId = item?.id;
    preview = { video: null, styles: [] };
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
    audioPreference.muted = previewMuted;
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
    <Dialog.Content class="flex w-max max-w-[min(96vw,56rem)] flex-col gap-0 overflow-hidden p-0 sm:flex-row sm:max-w-[min(96vw,56rem)]">
      <CosmeticPreviewPane
        alt={item.name}
        hasAudio={hasAudio}
        imageUrl={previewImage}
        poster={previewImage}
        rarityStyle={previewBg}
        videoUrl={previewVideoUrl}
        volume={audioPreference.volume}
        bind:muted={previewMuted}
      />

      <div class="flex min-h-0 w-full flex-col gap-y-5 overflow-y-auto p-5 sm:w-[22rem] sm:max-h-[min(70dvh,36rem)] sm:p-6">
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
    </Dialog.Content>
  {/if}
</Dialog.Root>
