<script lang="ts">
  import StoreItemGrid from '$components/layout/StoreItemGrid.svelte';
  import ShopItemCardSkeleton from '$components/modules/shop/skeletons/ShopItemCardSkeleton.svelte';

  const min = 2;
  const max = 4;
  const itemCount = Math.floor(Math.random() * (max - min + 1)) + min;
</script>

<div class="flex w-full flex-col gap-5">
  <div class="skeleton-loader h-8 w-48 rounded-none"></div>
  <StoreItemGrid variant="br">
    <!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
    {#each Array(itemCount) as _, index (index)}
      <ShopItemCardSkeleton />
    {/each}
  </StoreItemGrid>
</div>
