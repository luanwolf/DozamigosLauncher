<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { EpicAPIError } from '$lib/exceptions/EpicAPIError';
  import { language, t } from '$lib/i18n';
  import {
    applyPurchaseToStore,
    purchaseStwOfferMax,
    rememberExhaustedStwOffer,
    removeOfferFromStore
  } from '$lib/modules/stw-catalog';
  import {
    STW_BULK_CATEGORIES,
    planStwBulkBuys,
    summarizeStwBulkBuys,
    type StwBulkCategory
  } from '$lib/modules/stw-store-bulk';
  import { accountStore } from '$lib/storage';
  import { handleError } from '$lib/utils';
  import { Button, buttonVariants } from '$components/ui/button';
  import * as Dialog from '$components/ui/dialog';
  import { Label } from '$components/ui/label';
  import { Switch } from '$components/ui/switch';
  import type { StwStoreData } from '$types/game/stw-store';

  type Props = {
    store: StwStoreData;
    open: boolean;
    isPurchasing: boolean;
    onStoreUpdate: (store: StwStoreData) => void;
    onPurchasingChange: (value: boolean) => void;
    onRefresh: () => void | Promise<void>;
    onClose: () => void;
  };

  let {
    store,
    open = $bindable(false),
    isPurchasing,
    onStoreUpdate,
    onPurchasingChange,
    onRefresh,
    onClose
  }: Props = $props();

  const activeAccount = accountStore.getActiveStore(true);

  let selected = $state<Record<StwBulkCategory, boolean>>({
    schematics: true,
    heroes: true,
    perkUp: true,
    flux: true,
    resources: true
  });
  let progress = $state<{ done: number; total: number; title: string } | null>(null);

  const selectedSet = $derived(
    new Set(STW_BULK_CATEGORIES.filter((category) => selected[category]))
  );
  const lines = $derived(planStwBulkBuys(store, selectedSet));
  const summary = $derived(summarizeStwBulkBuys(lines));

  function categoryLabel(category: StwBulkCategory) {
    switch (category) {
      case 'schematics':
        return $t('stwStore.bulkBuy.categories.schematics');
      case 'heroes':
        return $t('stwStore.bulkBuy.categories.heroes');
      case 'perkUp':
        return $t('stwStore.bulkBuy.categories.perkUp');
      case 'flux':
        return $t('stwStore.bulkBuy.categories.flux');
      case 'resources':
        return $t('stwStore.bulkBuy.categories.resources');
    }
  }

  function offerStillListed(next: StwStoreData, offerId: string) {
    return next.sections.some((section) => section.offers.some((o) => o.offerId === offerId));
  }

  async function confirmBulkBuy() {
    if (!$activeAccount || !lines.length) return;

    onPurchasingChange(true);
    let working = store;
    let boughtOffers = 0;
    const plannedPurchases = summary.purchases;
    let donePurchases = 0;

    try {
      // Re-plan from live balances so weekly stock (perk/flux/resources) drains fully.
      while (true) {
        const next = planStwBulkBuys(working, selectedSet);
        if (!next.length) break;

        const line = next[0]!;
        progress = {
          done: donePurchases,
          total: Math.max(plannedPurchases, donePurchases + line.quantity),
          title: line.offer.title
        };

        try {
          const result = await purchaseStwOfferMax($activeAccount, line.offer, line.quantity);
          if (result.quantity < 1) break;

          working = applyPurchaseToStore(
            working,
            line.offer,
            result.spent,
            result.currencySubType,
            result.quantity
          );
          if (!offerStillListed(working, line.offer.offerId)) {
            rememberExhaustedStwOffer($activeAccount.accountId, working.expiration, line.offer.offerId);
          }
          onStoreUpdate(working);
          boughtOffers++;
          donePurchases += result.quantity;
        } catch (error) {
          if (error instanceof EpicAPIError && error.errorCode.includes('not_enough')) {
            toast.error($t('stwStore.notEnoughGold'));
            break;
          }
          if (error instanceof EpicAPIError && error.errorCode.includes('purchase_not_allowed')) {
            rememberExhaustedStwOffer($activeAccount.accountId, working.expiration, line.offer.offerId);
            working = removeOfferFromStore(working, line.offer.offerId);
            onStoreUpdate(working);
            continue;
          }
          handleError({ error, message: 'Failed bulk STW purchase', account: $activeAccount });
          break;
        }
      }

      if (boughtOffers > 0) {
        toast.success($t('stwStore.bulkBuy.done', { count: boughtOffers }));
      } else {
        toast.error($t('stwStore.bulkBuy.noneBought'));
      }

      open = false;
      onClose();
      await onRefresh();
    } finally {
      progress = null;
      onPurchasingChange(false);
    }
  }
</script>

<Dialog.Root bind:open onOpenChangeComplete={(isOpen) => !isOpen && onClose()}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title>{$t('stwStore.bulkBuy.title')}</Dialog.Title>
      <Dialog.Description>{$t('stwStore.bulkBuy.description')}</Dialog.Description>
    </Dialog.Header>

    <div class="space-y-3">
      {#each STW_BULK_CATEGORIES as category (category)}
        <div class="flex items-center justify-between gap-3 rounded-none border px-3 py-2">
          <Label class="cursor-pointer" for={`stw-bulk-${category}`}>{categoryLabel(category)}</Label>
          <Switch
            id={`stw-bulk-${category}`}
            bind:checked={selected[category]}
            disabled={isPurchasing}
          />
        </div>
      {/each}
    </div>

    <div class="space-y-1 rounded-none border bg-muted/40 px-3 py-2 text-sm">
      <div class="flex justify-between gap-2">
        <span class="text-muted-foreground">{$t('stwStore.bulkBuy.offers')}</span>
        <span class="tabular-nums font-medium">{summary.offers}</span>
      </div>
      <div class="flex justify-between gap-2">
        <span class="text-muted-foreground">{$t('stwStore.bulkBuy.purchases')}</span>
        <span class="tabular-nums font-medium">{summary.items}</span>
      </div>
      <div class="flex items-center justify-between gap-2">
        <span class="text-muted-foreground">{$t('stwStore.bulkBuy.total')}</span>
        <div class="flex items-center gap-1">
          <img class="size-4" alt={$t('stw.gold')} src="/resources/eventcurrency_scaling.png" />
          <span class="tabular-nums text-lg font-bold">{summary.gold.toLocaleString($language)}</span>
        </div>
      </div>
    </div>

    {#if progress}
      <p class="text-xs text-muted-foreground">
        {$t('stwStore.bulkBuy.progress', {
          done: progress.done + 1,
          total: progress.total,
          name: progress.title
        })}
      </p>
    {/if}

    <Dialog.Footer>
      <Dialog.Close class={buttonVariants({ variant: 'outline' })} disabled={isPurchasing}>
        {$t('stwStore.purchaseDialog.cancel')}
      </Dialog.Close>
      <Button
        disabled={isPurchasing || summary.offers < 1}
        loading={isPurchasing}
        onclick={confirmBulkBuy}
      >
        {$t('stwStore.bulkBuy.confirm')}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
