<script lang="ts">
  import MinusIcon from '@lucide/svelte/icons/minus';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import { toast } from 'svelte-sonner';
  import { EpicAPIError } from '$lib/exceptions/EpicAPIError';
  import { language, t } from '$lib/i18n';
  import {
    applyPurchaseToStore,
    getBalanceForOffer,
    maxPurchasableQuantity,
    purchaseStwOffer,
    rememberExhaustedStwOffer,
    removeOfferFromStore
  } from '$lib/modules/stw-catalog';
  import { accountStore } from '$lib/storage';
  import { handleError } from '$lib/utils';
  import { Button, buttonVariants } from '$components/ui/button';
  import * as Dialog from '$components/ui/dialog';
  import { Input } from '$components/ui/input';
  import { Label } from '$components/ui/label';
  import type { StwStoreData, StwStoreOffer } from '$types/game/stw-store';

  type Props = {
    offer: StwStoreOffer | null;
    store: StwStoreData;
    open: boolean;
    isPurchasing: boolean;
    onStoreUpdate: (store: StwStoreData) => void;
    onPurchasingChange: (value: boolean) => void;
    onRefresh: () => void | Promise<void>;
    onClose: () => void;
  };

  let {
    offer,
    store,
    open = $bindable(false),
    isPurchasing,
    onStoreUpdate,
    onPurchasingChange,
    onRefresh,
    onClose
  }: Props = $props();

  const activeAccount = accountStore.getActiveStore(true);

  let quantity = $state(1);

  const goldBalance = $derived(store.balances['eventcurrency_scaling'] ?? 0);
  const maxQuantity = $derived(offer ? maxPurchasableQuantity(offer, goldBalance) : 0);
  const singlePurchase = $derived(maxQuantity === 1);
  const unitPrice = $derived(offer?.price.finalPrice ?? 0);
  const totalPrice = $derived(unitPrice * quantity);
  const grant = $derived(offer?.grants[0]);

  $effect(() => {
    if (open && offer) quantity = 1;
  });

  $effect(() => {
    if (!open || !offer) return;
    if (quantity > maxQuantity) quantity = Math.max(1, maxQuantity);
    if (quantity < 1) quantity = 1;
  });

  function setQuantity(value: number) {
    quantity = Math.min(maxQuantity, Math.max(1, value));
  }

  async function confirmPurchase() {
    if (!$activeAccount || !offer || !store) return;

    if (getBalanceForOffer(store.balances, offer.price) < totalPrice) {
      toast.error($t('stwStore.notEnoughGold'));
      return;
    }

    onPurchasingChange(true);

    try {
      const result = await purchaseStwOffer($activeAccount, offer, quantity);
      rememberExhaustedStwOffer($activeAccount.accountId, store.expiration, offer.offerId);
      onStoreUpdate(applyPurchaseToStore(store, offer, result.spent, result.currencySubType, result.quantity));
      toast.success($t('stwStore.purchased'));
      open = false;
      onClose();
      await onRefresh();
    } catch (error) {
      if (error instanceof EpicAPIError && error.errorCode.includes('not_enough')) {
        toast.error($t('stwStore.notEnoughGold'));
        return;
      }
      if (error instanceof EpicAPIError && error.errorCode.includes('purchase_not_allowed')) {
        // Epic already spent the limit — hide immediately even if profile key matching lags.
        rememberExhaustedStwOffer($activeAccount.accountId, store.expiration, offer.offerId);
        onStoreUpdate(removeOfferFromStore(store, offer.offerId));
        toast.error($t('stwStore.alreadyPurchased'));
        open = false;
        onClose();
        await onRefresh();
        return;
      }
      handleError({ error, message: 'Failed to purchase', account: $activeAccount });
    } finally {
      onPurchasingChange(false);
    }
  }
</script>

<Dialog.Root bind:open onOpenChangeComplete={(isOpen) => !isOpen && onClose()}>
  {#if offer && grant}
    <Dialog.Content class="max-w-md">
      <Dialog.Header>
        <Dialog.Title>{$t('stwStore.purchaseDialog.title')}</Dialog.Title>
        <Dialog.Description class="flex flex-wrap items-center gap-1 wrap-break-word whitespace-normal">
          {#if singlePurchase}
            {@html $t('stwStore.purchaseDialog.confirmSingle', {
              name: `<span class="font-semibold">${offer.title}</span>`,
              price: `<span class="font-semibold">${unitPrice.toLocaleString($language)}</span>`,
              goldIcon:
                '<img class="size-5 inline-block" alt="" src="/resources/eventcurrency_scaling.png"/>'
            })}
          {:else}
            {$t('stwStore.purchaseDialog.description')}
          {/if}
        </Dialog.Description>
      </Dialog.Header>

      <div class="flex gap-3">
        <img
          class="size-16 rounded-none object-cover"
          style="background-color: var(--color-muted)"
          alt={offer.title}
          src={grant.display.imageUrl}
        />
        <div class="min-w-0 flex-1">
          <p class="font-medium leading-snug">{offer.title}</p>
          {#if grant.quantity > 1}
            <p class="text-xs text-muted-foreground">
              {$t('stwStore.purchaseDialog.perPurchase', { count: grant.quantity })}
            </p>
          {/if}
        </div>
      </div>

      {#if !singlePurchase}
        <div class="space-y-2">
          <Label for="stw-purchase-qty">{$t('stwStore.purchaseDialog.quantity')}</Label>
          <div class="flex items-center gap-2">
            <Button
              disabled={isPurchasing || quantity <= 1}
              onclick={() => setQuantity(quantity - 1)}
              size="icon"
              variant="outline"
            >
              <MinusIcon class="size-4" />
            </Button>
            <Input
              id="stw-purchase-qty"
              class="text-center tabular-nums"
              disabled={isPurchasing}
              max={maxQuantity}
              min={1}
              onchange={(e) => setQuantity(Number.parseInt(e.currentTarget.value, 10) || 1)}
              type="number"
              value={quantity}
            />
            <Button
              disabled={isPurchasing || quantity >= maxQuantity}
              onclick={() => setQuantity(quantity + 1)}
              size="icon"
              variant="outline"
            >
              <PlusIcon class="size-4" />
            </Button>
          </div>
          <p class="text-xs text-muted-foreground">
            {$t('stwStore.purchaseDialog.maxHint', { max: maxQuantity })}
          </p>
        </div>

        <div class="flex items-center justify-between rounded-none border bg-muted/40 px-3 py-2">
          <span class="text-sm text-muted-foreground">{$t('stwStore.purchaseDialog.total')}</span>
          <div class="flex items-center gap-1">
            <img class="size-4" alt={$t('stw.gold')} src="/resources/eventcurrency_scaling.png" />
            <span class="text-lg font-bold tabular-nums">{totalPrice.toLocaleString($language)}</span>
          </div>
        </div>
      {/if}

      <Dialog.Footer>
        <Dialog.Close class={buttonVariants({ variant: 'outline' })} disabled={isPurchasing}>
          {$t('stwStore.purchaseDialog.cancel')}
        </Dialog.Close>
        <Button disabled={isPurchasing || maxQuantity < 1} loading={isPurchasing} onclick={confirmPurchase}>
          {$t('stwStore.purchaseDialog.confirm')}
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  {/if}
</Dialog.Root>
