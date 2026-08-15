<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { afterNavigate } from '$app/navigation';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import ShoppingBagIcon from '@lucide/svelte/icons/shopping-bag';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { t } from '$lib/i18n';
  import { stwStoreCache } from '$lib/modules/account-data';
  import { getBalanceForOffer, maxPurchasableQuantity } from '$lib/modules/stw-catalog';
  import { accountStore } from '$lib/storage';
  import { formatRemainingDuration, handleError } from '$lib/utils';
  import type { GrantedItem } from '$lib/utils/mcp-loot';
  import PageActionButton from '$components/layout/PageActionButton.svelte';
  import PageContent from '$components/layout/PageContent.svelte';
  import PageLoading from '$components/layout/PageLoading.svelte';
  import StoreItemGrid from '$components/layout/StoreItemGrid.svelte';
  import StwPurchaseResultDialog from '$components/modules/stw-store/StwPurchaseResultDialog.svelte';
  import StwStoreBulkBuyDialog from '$components/modules/stw-store/StwStoreBulkBuyDialog.svelte';
  import StwStoreOfferCard from '$components/modules/stw-store/StwStoreOfferCard.svelte';
  import StwStorePurchaseDialog from '$components/modules/stw-store/StwStorePurchaseDialog.svelte';
  import type { StwPurchaseLimitPeriod, StwStoreData, StwStoreOffer } from '$types/game/stw-store';

  const activeAccount = accountStore.getActiveStore(true);

  let isPurchasing = $state(false);
  let purchaseOffer = $state<StwStoreOffer | null>(null);
  let purchaseDialogOpen = $state(false);
  let bulkDialogOpen = $state(false);
  let receivedItems = $state<GrantedItem[]>([]);
  let receivedDialogOpen = $state(false);
  let now = $state(Date.now());
  let refreshedExpiration = '';

  const cached = $derived(stwStoreCache.get($activeAccount));
  const store = $derived<StwStoreData | null>(cached.data);
  const isLoading = $derived(cached.loading || cached.refreshing);
  const llamaRotationRemaining = $derived(
    store?.expiration ? formatRemainingDuration(Math.max(0, new Date(store.expiration).getTime() - now)) : ''
  );

  async function loadStore(force = true) {
    if (!$activeAccount) return;

    const data = await stwStoreCache.ensure($activeAccount, { force });
    if (!data) {
      handleError({
        error: cached.error,
        message: 'Failed to load STW store',
        account: $activeAccount
      });
    }
  }

  function openPurchase(offer: StwStoreOffer) {
    if (!store) return;

    const balance = getBalanceForOffer(store.balances, offer.price);
    if (balance < offer.price.finalPrice) {
      toast.error($t('stwStore.notEnoughCurrency'));
      return;
    }

    const maxQty = maxPurchasableQuantity(offer, balance);
    if (maxQty < 1) return;

    purchaseOffer = offer;
    purchaseDialogOpen = true;
  }

  function limitPeriodLabel(period: StwPurchaseLimitPeriod) {
    switch (period) {
      case 'event':
        return $t('stwStore.limitPeriod.event');
      case 'daily':
        return $t('stwStore.limitPeriod.daily');
      case 'weekly':
        return $t('stwStore.limitPeriod.weekly');
      case 'monthly':
        return $t('stwStore.limitPeriod.monthly');
      default:
        return $t('stwStore.limitPeriod.none');
    }
  }

  function limitLabel(offer: StwStoreOffer) {
    if (offer.limit.max < 0 || offer.limit.remaining === null) {
      return $t('stwStore.limitUnlimited');
    }

    const period = limitPeriodLabel(offer.limit.period);

    if (offer.limit.remaining !== null) {
      return $t('stwStore.limitRemaining', {
        remaining: offer.limit.remaining,
        max: offer.limit.max,
        period
      });
    }

    return $t('stwStore.limitMax', { max: offer.limit.max, period });
  }

  function sectionTitle(id: string) {
    if (id === 'CardPackStorePreroll') return $t('stwStore.sections.llamas');
    if (id === 'STWSpecialEventStorefront') return $t('stwStore.sections.event');
    if (id === 'STWRotationalEventStorefront') return $t('stwStore.sections.weekly');
    return id;
  }

  function updateStore(next: StwStoreData) {
    if ($activeAccount) stwStoreCache.set($activeAccount, next);
  }

  // Offers rotate and purchase limits change, so refresh in the background on
  // every visit — the cached store stays on screen while it reloads.
  afterNavigate(() => {
    if ($activeAccount) void loadStore();
  });

  $effect(() => {
    if ($activeAccount?.accountId) void stwStoreCache.ensure($activeAccount);
  });

  onMount(() => {
    const intervalId = setInterval(() => {
      now = Date.now();
      if (
        store?.expiration &&
        now >= new Date(store.expiration).getTime() &&
        refreshedExpiration !== store.expiration
      ) {
        refreshedExpiration = store.expiration;
        void loadStore();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  });
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('stwStore.page.description')}
  title={$t('stwStore.page.title')}
>
  {#snippet actions()}
    {#if $activeAccount}
      <PageActionButton
        disabled={isLoading || isPurchasing || !store?.sections.length}
        label={$t('stwStore.bulkBuy.button')}
        onclick={() => {
          bulkDialogOpen = true;
        }}
      >
        <ShoppingBagIcon class="size-4" />
      </PageActionButton>
      <PageActionButton
        disabled={isLoading}
        label={$t('stwStore.refresh')}
        loading={isLoading}
        onclick={() => loadStore()}
      >
        <RefreshCwIcon class="size-4" />
      </PageActionButton>
    {/if}
  {/snippet}

  {#if !$activeAccount}
    <p class="text-center text-sm text-muted-foreground">{$t('sidebar.loginRequired')}</p>
  {:else if isLoading && !store}
    <PageLoading label={$t('loading')} />
  {:else if store?.sections.length}
    <div class="space-y-8 sm:space-y-10">
      {#each store.sections as section (section.id)}
        <section class="flex flex-col gap-3 sm:gap-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-base font-semibold tracking-tight text-foreground sm:text-lg">
              {sectionTitle(section.id)}
            </h2>
            {#if section.id === 'CardPackStorePreroll'}
              <span class="border border-border/70 bg-card px-2.5 py-1.5 text-xs text-muted-foreground">
                {$t('stwStore.llamas.rotation', { time: llamaRotationRemaining })}
              </span>
            {/if}
          </div>
          <StoreItemGrid variant="stw">
            {#each section.offers as offer (offer.offerId)}
              {@const balance = getBalanceForOffer(store.balances, offer.price)}
              {@const canAfford = balance >= offer.price.finalPrice}
              {@const atLimit = offer.limit.remaining === 0 || !!offer.ownedHeroGrant}
              {@const purchasableQty = maxPurchasableQuantity(offer, balance)}
              <StwStoreOfferCard
                {atLimit}
                {canAfford}
                {isPurchasing}
                limitText={limitLabel(offer)}
                {offer}
                {purchasableQty}
                onPurchase={() => openPurchase(offer)}
              />
            {/each}
          </StoreItemGrid>
        </section>
      {/each}
    </div>
  {:else if !isLoading}
    <p class="text-center text-sm text-muted-foreground">{$t('stwStore.emptyAvailable')}</p>
  {/if}
</PageContent>

{#if store && purchaseOffer}
  <StwStorePurchaseDialog
    bind:open={purchaseDialogOpen}
    {isPurchasing}
    offer={purchaseOffer}
    {store}
    onClose={() => {
      purchaseOffer = null;
    }}
    onPurchasingChange={(value) => {
      isPurchasing = value;
    }}
    onReceived={(items) => {
      receivedItems = items;
      receivedDialogOpen = true;
    }}
    onRefresh={loadStore}
    onStoreUpdate={updateStore}
  />
{/if}

{#if receivedItems.length}
  <StwPurchaseResultDialog
    bind:open={receivedDialogOpen}
    items={receivedItems}
    onClose={() => {
      receivedItems = [];
    }}
  />
{/if}

{#if store}
  <StwStoreBulkBuyDialog
    bind:open={bulkDialogOpen}
    {isPurchasing}
    {store}
    onClose={() => {
      bulkDialogOpen = false;
    }}
    onPurchasingChange={(value) => {
      isPurchasing = value;
    }}
    onRefresh={loadStore}
    onStoreUpdate={updateStore}
  />
{/if}
