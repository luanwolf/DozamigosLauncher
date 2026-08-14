<script lang="ts" module>
  /** Epic layout id for offers without a named storefront row in fortnite-api.com. */
  export const UNCATEGORIZED_LAYOUT_ID = 'alc.0';
</script>

<script lang="ts">
  import { t } from '$lib/i18n';
  import StoreItemGrid from '$components/layout/StoreItemGrid.svelte';
  import ShopItemCard from '$components/modules/shop/ShopItemCard.svelte';
  import type { ShopSection } from '$types/shop';

  type ShopSectionProps = {
    section: ShopSection;
    modalOfferId: string;
  };

  let { section, modalOfferId = $bindable() }: ShopSectionProps = $props();

  const sectionTitle = $derived.by(() => {
    if (
      section.id === UNCATEGORIZED_LAYOUT_ID ||
      section.name === UNCATEGORIZED_LAYOUT_ID ||
      section.name === '__uncategorized__' ||
      (!section.name && !section.id)
    ) {
      return $t('itemShop.sectionOther');
    }

    return section.name || section.id;
  });
</script>

<div class="flex w-full flex-col gap-5">
  <h2 class="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
    {sectionTitle}
  </h2>

  <StoreItemGrid variant="br">
    {#each section.items as item (item.offerId)}
      <ShopItemCard {item} bind:modalOfferId />
    {/each}
  </StoreItemGrid>
</div>
