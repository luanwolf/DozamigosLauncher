<script lang="ts">
  import { ItemColors } from '$lib/constants/item-colors';
  import { SPRITE_ENTRIES, type SpriteEntry, type SpriteVariant } from '$lib/modules/sprites';
  import { resolveSpriteLabel, type SpriteCatalogLabels } from '$lib/modules/sprites-catalog';
  import CosmeticStyles, { type StyleOption } from '$components/modules/shop/CosmeticStyles.svelte';
  import { Badge } from '$components/ui/badge';
  import * as Dialog from '$components/ui/dialog';

  type Props = {
    entry: SpriteEntry | null;
    catalog: SpriteCatalogLabels | null;
    variantLabels: Record<SpriteVariant, string>;
    rarityLabels: Record<SpriteEntry['rarity'], string>;
  };

  let { entry = $bindable(), catalog = null, variantLabels, rarityLabels }: Props = $props();

  const colors: Record<string, string> = { ...ItemColors.rarities };
  let isOpen = $state(false);
  let selectedStyle = $state<StyleOption | null>(null);

  const familyEntries = $derived(
    entry ? SPRITE_ENTRIES.filter((item) => item.slug === entry!.slug) : []
  );

  const styles = $derived<StyleOption[]>(
    familyEntries.map((item) => ({
      name: variantLabels[item.variant],
      image: item.image
    }))
  );

  const previewImage = $derived(selectedStyle?.image || entry?.image || '');
  const previewVariantLabel = $derived.by(() => {
    if (!entry) return '';
    if (selectedStyle) return selectedStyle.name;
    return variantLabels[entry.variant];
  });
  const badgeColor = $derived(entry ? colors[entry.rarity] || colors.common : colors.common);
  const labels = $derived(
    entry ? resolveSpriteLabel(entry.slug, { name: entry.name, ability: entry.ability }, catalog) : null
  );

  $effect(() => {
    isOpen = !!entry;
  });

  $effect(() => {
    const current = entry;
    selectedStyle = null;
    if (!current) return;
    selectedStyle = {
      name: variantLabels[current.variant],
      image: current.image
    };
  });

  function close() {
    entry = null;
  }
</script>

<Dialog.Root
  onOpenChangeComplete={(open) => {
    if (!open) close();
  }}
  bind:open={isOpen}
>
  {#if entry}
    <Dialog.Content
      class="flex w-[min(96vw,56rem)] !max-w-none flex-col gap-0 overflow-hidden p-0 sm:w-[min(96vw,64rem)]"
    >
      <div
        class="grid max-h-[min(90vh,52rem)] grid-cols-1 overflow-y-auto sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
      >
        <div
          class="relative flex min-h-72 flex-col items-center justify-center gap-3 bg-black/50 p-4 sm:min-h-[28rem] sm:border-r sm:border-border/80"
          style="background-color: {badgeColor}"
        >
          {#if previewImage}
            <img
              class="max-h-[min(70vh,36rem)] w-full object-contain drop-shadow-lg"
              alt="{labels?.name ?? entry.name} · {previewVariantLabel}"
              src={previewImage}
            />
          {:else}
            <p class="text-sm text-muted-foreground">{labels?.name ?? entry.name}</p>
          {/if}
        </div>

        <div class="flex flex-col gap-y-5 overflow-y-auto p-5 sm:p-6">
          <div class="space-y-3">
            <div>
              <h2 class="text-xl leading-tight font-semibold tracking-tight">{labels?.name ?? entry.name}</h2>
              <p class="mt-1 text-sm text-muted-foreground">
                {previewVariantLabel} · {rarityLabels[entry.rarity]}
              </p>
            </div>

            <Badge
              style="background: {badgeColor}"
              class="rounded-md px-2.5 py-0.5 text-xs font-medium text-foreground capitalize"
            >
              {rarityLabels[entry.rarity]}
            </Badge>

            <p class="text-sm leading-relaxed text-muted-foreground">{labels?.ability ?? entry.ability}</p>
          </div>

          <CosmeticStyles {styles} bind:selected={selectedStyle} />
        </div>
      </div>
    </Dialog.Content>
  {/if}
</Dialog.Root>
