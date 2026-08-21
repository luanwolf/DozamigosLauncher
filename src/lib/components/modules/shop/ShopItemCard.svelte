<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import StarIcon from '@lucide/svelte/icons/star';
  import { language, t } from '$lib/i18n';
  import { accountStore } from '$lib/storage';
  import { createDiscountedStore, createIsOwnedStore } from '$lib/stores';
  import { onCosmeticImageError } from '$lib/modules/cosmetic-image';
  import { rarityBackgroundStyle } from '$lib/modules/locker-export-rarity';
  import { isLeavingToday } from '$lib/modules/shop-history';
  import { getShopItemWishlistKey } from '$lib/modules/shop-item-key';
  import { shopWishlistStore, toggleShopWishlistKey } from '$lib/stores/shop-wishlist';
  import type { ShopItem } from '$types/shop';

  type ItemCardProps = {
    item: ShopItem;
    modalOfferId: string;
  };

  const activeAccount = accountStore.getActiveStore(true);
  // eslint-disable-next-line no-useless-assignment
  let { item, modalOfferId = $bindable() }: ItemCardProps = $props();

  const isItemOwned = $derived(createIsOwnedStore($activeAccount?.accountId, item));
  const discountedPrice = $derived(createDiscountedStore($activeAccount?.accountId, item));
  const wishlistKey = $derived(getShopItemWishlistKey(item));
  const isWishlisted = $derived($shopWishlistStore.has(wishlistKey));
  const leavesToday = $derived(isLeavingToday(item));

  const imageUrl = $derived(item.assets.featured || item.assets.large || item.assets.small);
  const tileBackground = $derived.by(() => {
    if (item.type.id === 'track') return rarityBackgroundStyle({ rarity: 'epic' });
    return rarityBackgroundStyle({
      rarity: item.rarity?.id || 'common',
      series: item.series?.id
    });
  });

  function showItemModal() {
    modalOfferId = item.offerId;
  }

  function toggleWishlist(event: MouseEvent) {
    event.stopPropagation();
    toggleShopWishlistKey(wishlistKey);
  }
</script>

<div
  style={tileBackground}
  class="relative w-full cursor-pointer overflow-hidden rounded-md border border-transparent pb-[100%] transition-colors hover:border-primary/40 focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
  onclick={showItemModal}
  onkeydown={(event) => event.key === 'Enter' && showItemModal()}
  role="button"
  tabindex="0"
>
  {#if imageUrl}
    <img
      class="absolute inset-0 size-full object-cover select-none"
      alt={item.name}
      draggable="false"
      loading="lazy"
      src={imageUrl}
      onerror={onCosmeticImageError}
    />
  {/if}

  <button
    aria-label={isWishlisted ? $t('itemShop.wishlist.remove') : $t('itemShop.wishlist.add')}
    class="absolute top-2 right-2 z-10 rounded-sm bg-black/65 p-1.5 text-white transition-colors hover:bg-black/85"
    onclick={toggleWishlist}
    type="button"
  >
    <StarIcon class="size-4" fill={isWishlisted ? 'currentColor' : 'none'} />
  </button>

  {#if item.isBundle || leavesToday}
    <div class="absolute top-2 left-2 z-10 flex flex-col items-start gap-1">
      {#if leavesToday}
        <span class="rounded-sm bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 uppercase">
          {$t('itemShop.onlyToday')}
        </span>
      {/if}
      {#if item.isBundle}
        <span class="rounded-sm bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white uppercase">
          {$t('itemShop.bundle')}
        </span>
      {/if}
    </div>
  {/if}

  <div class="absolute right-0 bottom-0 left-0 bg-linear-to-t from-black/85 via-black/40 to-transparent px-3 pt-8 pb-3">
    <h3
      style="text-shadow: 0 2px 4px #000000"
      class="mb-2 line-clamp-2 text-left text-sm leading-snug font-semibold text-white sm:text-base"
    >
      {item.name}
    </h3>

    <div class="relative flex items-center justify-start pl-7">
      {#if $isItemOwned}
        <CheckIcon class="absolute top-1/2 left-0 size-5 -translate-y-1/2 text-green-500" />
      {:else}
        <img
          class="absolute top-1/2 left-0 size-5 -translate-y-1/2"
          alt={$t('vbucks')}
          draggable="false"
          src="/resources/currency_mtxswap.png"
        />
      {/if}

      <span
        style="text-shadow: 0 2px 4px #000000"
        class="pb-0.5 text-sm font-bold"
        class:text-green-500={$isItemOwned}
        class:text-white={!$isItemOwned}
      >
        {#if $isItemOwned}
          {$t('itemShop.owned')}
        {:else if $discountedPrice !== item.price.final}
          {$discountedPrice.toLocaleString($language)}
          <span class="text-white/95 line-through">{item.price.final.toLocaleString($language)}</span>
        {:else}
          {item.price.final.toLocaleString($language)}
        {/if}
      </span>
    </div>
  </div>
</div>
