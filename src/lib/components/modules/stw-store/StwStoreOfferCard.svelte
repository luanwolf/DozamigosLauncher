<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import ShoppingBagIcon from '@lucide/svelte/icons/shopping-bag';
  import { RarityColors } from '$lib/constants/stw/resources';
  import { language, t } from '$lib/i18n';
  import { priceLabel } from '$lib/modules/stw-catalog';
  import { cn } from '$lib/utils';
  import { Button } from '$components/ui/button';
  import type { StwStoreOffer } from '$types/game/stw-store';

  type StwStoreOfferCardProps = {
    offer: StwStoreOffer;
    limitText: string;
    purchasableQty: number;
    canAfford: boolean;
    atLimit: boolean;
    isPurchasing: boolean;
    onPurchase: () => void;
  };

  let { offer, limitText, purchasableQty, canAfford, atLimit, isPurchasing, onPurchase }: StwStoreOfferCardProps =
    $props();

  const grant = $derived(offer.grants[0]);
  const rarityColor = $derived(RarityColors[grant.display.rarity] ?? RarityColors.c);
  const showQuantity = $derived(grant.quantity > 1);
  const extraGrants = $derived(offer.grants.length - 1);
  const owned = $derived(!!offer.ownedHeroGrant);
  const currency = $derived(priceLabel(offer.price));
</script>

<article
  class={cn(
    'flex h-full min-h-[260px] flex-col overflow-hidden border border-border/70 bg-card',
    owned && 'opacity-80'
  )}
  aria-label={offer.title}
>
  <div class="flex h-24 shrink-0 items-center justify-center border-b p-2" style="background-color: {rarityColor}12">
    <img
      class={cn('max-h-full max-w-full object-contain select-none', owned && 'saturate-50')}
      alt=""
      draggable="false"
      loading="lazy"
      src={grant.display.imageUrl}
    />
  </div>

  <div class="flex min-h-0 flex-1 flex-col gap-0.5 px-2.5 py-2">
    <h3 class="line-clamp-2 text-xs leading-snug font-semibold sm:text-sm">{offer.title}</h3>

    <p class="text-[11px] text-muted-foreground">
      {#if showQuantity}
        ×{grant.quantity.toLocaleString($language)}
      {:else if extraGrants > 0}
        +{extraGrants} {$t('stwStore.items')}
      {/if}
    </p>

    <div class="mt-1 space-y-0.5">
      {#if purchasableQty > 0 && !owned}
        <p class="text-[11px] font-semibold text-primary tabular-nums">
          {$t('stwStore.purchasableRemaining', { count: purchasableQty.toLocaleString($language) })}
        </p>
      {/if}
      <p class="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
        {limitText}
      </p>
    </div>

    <div class="mt-auto flex items-center gap-1.5 border-t border-border/60 pt-2">
      {#if owned}
        <CheckIcon class="size-4 shrink-0 text-emerald-500" />
        <span class="text-sm font-bold text-emerald-500">{$t('stwStore.owned')}</span>
      {:else if offer.price.finalPrice === 0}
        <span class="text-base font-bold text-primary">{$t('stwStore.free')}</span>
      {:else}
        <img class="size-4 shrink-0" alt={currency.name} src={currency.imageUrl} />
        <span class="text-base font-bold tabular-nums">{offer.price.finalPrice.toLocaleString($language)}</span>
      {/if}
    </div>

    <Button
      class="mt-2 h-8 w-full shrink-0 text-xs"
      disabled={isPurchasing || !canAfford || atLimit || owned}
      loading={isPurchasing}
      onclick={onPurchase}
      size="sm"
      variant={owned ? 'secondary' : 'default'}
    >
      {#if owned}
        <CheckIcon class="size-3.5 shrink-0" />
        {$t('stwStore.owned')}
      {:else if atLimit}
        {$t('stwStore.limitReached')}
      {:else if canAfford}
        <ShoppingBagIcon class="size-3.5 shrink-0" />
        {$t('stwStore.buy')}
      {:else}
        {$t('stwStore.notEnoughCurrency')}
      {/if}
    </Button>
  </div>
</article>
