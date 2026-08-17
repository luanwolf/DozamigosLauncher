<script module lang="ts">
  /** Kept between items so the volume is set once per session, not per preview. */
  const audioPreference = { muted: true, volume: 0.6 };
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import CheckIcon from '@lucide/svelte/icons/check';
  import CoinsIcon from '@lucide/svelte/icons/coins';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import GiftIcon from '@lucide/svelte/icons/gift';
  import ShoppingCartIcon from '@lucide/svelte/icons/shopping-cart';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { ItemColors } from '$lib/constants/item-colors';
  import { language, t } from '$lib/i18n';
  import { generateAuthenticatedGamePageUrl } from '$lib/modules/epic-web-url';
  import { getShopAppearanceStats, isLeavingToday } from '$lib/modules/shop-history';
  import {
    mergeStyles,
    resolveCosmeticPreview,
    type CosmeticPreview
  } from '$lib/modules/shop-preview-video';
  import { getVbucksShortfall, recommendVbucksPack } from '$lib/modules/vbucks-calculator';
  import { accountStore } from '$lib/storage';
  import { accountDataCache, brShopCache, createDiscountedStore, createIsOwnedStore } from '$lib/stores';
  import { handleError } from '$lib/utils';
  import CosmeticStyles, { type StyleOption } from '$components/modules/shop/CosmeticStyles.svelte';
  import ShopGiftFriendSelection from '$components/modules/shop/modals/ShopGiftFriendSelection.svelte';
  import ShopPurchaseConfirmation from '$components/modules/shop/modals/ShopPurchaseConfirmation.svelte';
  import { Badge } from '$components/ui/badge';
  import { Button } from '$components/ui/button';
  import * as Dialog from '$components/ui/dialog';
  import { Separator } from '$components/ui/separator';
  import * as Tooltip from '$components/ui/tooltip';

  type Props = {
    offerId: string;
  };

  /** Only these previews carry a soundtrack; outfit turntables are silent. */
  const AUDIO_TYPE_IDS = new Set(['athenadance', 'athenamusicpack', 'track']);

  let { offerId = $bindable() }: Props = $props();

  const activeAccount = accountStore.getActiveStore(true);
  const item = $derived($brShopCache.offers.find((x) => x.offerId === offerId)!);
  const {
    vbucks: ownedVbucks = 0,
    friends = [],
    remainingGifts = 5
  } = $derived(accountDataCache.get($activeAccount?.accountId || '') || {});

  const colors: Record<string, string> = { ...ItemColors.rarities, ...ItemColors.series };
  const isItemOwned = $derived(createIsOwnedStore($activeAccount?.accountId, item));
  const discountedPrice = $derived(createDiscountedStore($activeAccount?.accountId, item));
  const appearanceStats = $derived(getShopAppearanceStats(item));
  const vbucksShortfall = $derived(getVbucksShortfall(ownedVbucks, $discountedPrice));
  const recommendedPack = $derived(recommendVbucksPack(vbucksShortfall));

  let isOpen = $state(true);
  let isPurchasing = $state(false);
  let isPurchaseDialogOpen = $state(false);
  let isGiftDialogOpen = $state(false);
  let isSendingGifts = $state(false);
  let isOpeningPack = $state(false);
  let preview = $state<CosmeticPreview>({ video: null, styles: [] });
  let previewVideoFailed = $state(false);
  let selectedStyle = $state<StyleOption | null>(null);

  const previewCosmeticId = $derived(item.isBundle ? (item.contents[0]?.id ?? item.id) : item.id);
  const stillImage = $derived(item.assets.featured || item.assets.large || item.assets.small);
  const hasAudio = $derived(AUDIO_TYPE_IDS.has(item.type.id.toLowerCase()));
  const styles = $derived<StyleOption[]>(mergeStyles(item.styles, preview));
  const previewVideoUrl = $derived(selectedStyle ? (selectedStyle.video ?? null) : preview.video);

  $effect(() => {
    const cosmeticId = previewCosmeticId;
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

  function getItemColor() {
    const rarityId = (item.series?.id || item.rarity?.id)?.toLowerCase();
    const hexColor = colors[rarityId] || colors.common;

    return `rgba(${hexToRgb(hexColor).join(', ')}, 0.7)`;
  }

  function hexToRgb(hex: string): [number, number, number] {
    hex = hex.replace(/^#/, '');

    let bigint = Number.parseInt(hex, 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;

    return [r, g, b];
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString($language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  async function openRecommendedPack() {
    const account = $activeAccount;
    const pack = recommendedPack;
    if (!account || !pack) return;

    isOpeningPack = true;
    try {
      const url = await generateAuthenticatedGamePageUrl(account, pack.storeUrl);
      await openUrl(url);
    } catch (error) {
      handleError({ error, message: $t('buyVbucks.failedToOpenStore'), account });
    } finally {
      isOpeningPack = false;
    }
  }
</script>

<Dialog.Root onOpenChangeComplete={(open) => !open && (offerId = '')} bind:open={isOpen}>
  <Dialog.Content
    class="flex w-[min(96vw,56rem)] !max-w-none flex-col gap-0 overflow-hidden p-0 sm:w-[min(96vw,64rem)]"
  >
    <div class="grid max-h-[min(90vh,52rem)] grid-cols-1 overflow-y-auto sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <!-- Left: full turntable / image -->
      <div
        class="relative flex min-h-72 flex-col items-center justify-center gap-3 bg-black/50 p-4 sm:min-h-[28rem] sm:border-r sm:border-border/80"
      >
        {#if previewVideoUrl && !previewVideoFailed}
          <video
            class="max-h-[min(70vh,36rem)] w-full object-contain"
            autoplay
            controls={hasAudio}
            loop
            muted
            playsinline
            poster={selectedStyle?.image || stillImage}
            src={previewVideoUrl}
            onerror={() => {
              previewVideoFailed = true;
            }}
            onloadeddata={(event) => {
              if (!hasAudio) return;
              // Autoplay only survives muted, so restore the chosen volume once it rolls.
              event.currentTarget.volume = audioPreference.volume;
              event.currentTarget.muted = audioPreference.muted;
            }}
            onvolumechange={(event) => {
              if (!hasAudio) return;
              audioPreference.volume = event.currentTarget.volume;
              audioPreference.muted = event.currentTarget.muted;
            }}
          ></video>
          <a
            class="text-center text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
            href="https://fortnite.gg"
            onclick={(e) => {
              e.preventDefault();
              void openUrl('https://fortnite.gg');
            }}
            rel="noreferrer"
          >
            {$t('itemShop.itemInformation.videoCredit')}
          </a>
        {:else}
          <img
            class="max-h-[min(70vh,36rem)] w-full object-contain"
            alt={item.name}
            src={selectedStyle?.image || stillImage}
          />
        {/if}
      </div>

      <!-- Right: details + actions -->
      <div class="flex flex-col gap-y-5 overflow-y-auto p-5 sm:p-6">
        <div class="space-y-3">
          <div>
            <h2 class="text-xl leading-tight font-semibold tracking-tight">{item.name}</h2>
            {#if item.description}
              <p class="mt-1 text-sm text-muted-foreground italic">
                {item.description}
              </p>
            {/if}
          </div>

          <div class="flex flex-wrap gap-2">
            {#if item.series?.name || item.rarity?.name}
              <Badge
                style="background: {getItemColor()}"
                class="rounded-md px-2.5 py-0.5 text-xs font-medium text-foreground capitalize"
              >
                {(item.series?.name || item.rarity?.name)?.toLowerCase()}
              </Badge>
            {/if}

            {#if item.isBundle}
              <Badge class="rounded-md border px-2.5 py-0.5 text-xs font-medium text-foreground" variant="outline">
                {$t('itemShop.bundle')}
              </Badge>
            {:else if item.type?.name}
              <Badge class="rounded-md border px-2.5 py-0.5 text-xs font-medium text-foreground" variant="outline">
                {item.type?.name}
              </Badge>
            {/if}

            {#if isLeavingToday(item)}
              <Badge class="rounded-md border px-2.5 py-0.5 text-xs font-medium text-foreground" variant="outline">
                {$t('itemShop.onlyToday')}
              </Badge>
            {/if}
          </div>
        </div>

        <div class="flex flex-col gap-1 text-sm">
          <div class="flex items-center gap-1">
            <span class="text-muted-foreground">{$t('itemShop.itemInformation.price')}:</span>

            {#if $discountedPrice !== item.price.final}
              <span class="mr-1">{$discountedPrice.toLocaleString($language)}</span>
              <span class="text-muted-foreground/95 line-through">{item.price.final.toLocaleString($language)}</span>
            {:else}
              <span>{item.price.final.toLocaleString($language)}</span>
            {/if}

            <img class="size-5" alt="V-Bucks" src="/resources/currency_mtxswap.png" />
          </div>

          <div class="flex items-center gap-1">
            <span class="text-muted-foreground">{$t('itemShop.itemInformation.firstSeen')}:</span>
            <span>{formatDate(item.dates.releaseDate)}</span>
          </div>

          <div class="flex items-center gap-1">
            <span class="text-muted-foreground">{$t('itemShop.itemInformation.lastSeen')}:</span>
            <span>{formatDate(item.dates.lastSeen)}</span>
          </div>

          <div class="flex items-center gap-1">
            <span class="text-muted-foreground">{$t('itemShop.itemInformation.leavesOn')}:</span>
            <span>{formatDate(item.dates.out)}</span>
          </div>

          <div class="flex items-center gap-1">
            <span class="text-muted-foreground">{$t('itemShop.itemInformation.appearances')}:</span>
            <span>{$t('itemShop.itemInformation.appearancesCount', { count: appearanceStats.appearances })}</span>
          </div>
        </div>

        <CosmeticStyles {styles} bind:selected={selectedStyle} />

        {#if item.shopHistory.length > 1}
          <div class="space-y-2">
            <h3 class="text-sm font-semibold text-foreground">{$t('itemShop.itemInformation.historyTitle')}</h3>
            <div class="flex flex-wrap gap-2">
              {#each item.shopHistory.slice(-6).reverse() as date (date)}
                <Badge class="text-xs" variant="outline">{formatDate(date)}</Badge>
              {/each}
            </div>
          </div>
        {/if}

        {#if $activeAccount?.accountId}
          <div class="mt-auto flex flex-col gap-y-4">
            {#if !$isItemOwned && vbucksShortfall > 0 && recommendedPack}
              <div class="rounded-md border border-border/70 bg-muted/20 p-3">
                <p class="text-sm font-medium">{$t('itemShop.vbucksCalculator.title')}</p>
                <p class="mt-1 text-sm text-muted-foreground">
                  {$t('itemShop.vbucksCalculator.shortfall', { amount: vbucksShortfall.toLocaleString($language) })}
                </p>
                <Button
                  class="mt-3 w-full"
                  disabled={isOpeningPack}
                  onclick={openRecommendedPack}
                  size="sm"
                  variant="outline"
                >
                  <CoinsIcon class="size-4" />
                  {$t('itemShop.vbucksCalculator.buyPack', {
                    amount: recommendedPack.amount.toLocaleString($language),
                    price: recommendedPack.priceBrl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  })}
                  <ExternalLinkIcon class="size-3.5" />
                </Button>
              </div>
            {/if}

            <Separator />

            <div class="grid w-full grid-cols-2 gap-2">
              <Tooltip.Root>
                <Tooltip.Trigger tabindex={-1}>
                  <Button
                    class="flex w-full items-center justify-center gap-2"
                    disabled={isPurchasing || ownedVbucks < $discountedPrice || $isItemOwned}
                    onclick={() => (isPurchaseDialogOpen = true)}
                  >
                    {#if $isItemOwned}
                      <CheckIcon class="size-5" />
                      {$t('itemShop.owned')}
                    {:else}
                      <ShoppingCartIcon class="size-5" />
                      {$t('itemShop.purchase')}
                    {/if}
                  </Button>
                </Tooltip.Trigger>

                {#if ownedVbucks < $discountedPrice}
                  <Tooltip.Content>{$t('itemShop.notEnoughVbucks')}</Tooltip.Content>
                {/if}
              </Tooltip.Root>

              <Tooltip.Root>
                <Tooltip.Trigger tabindex={-1}>
                  <Button
                    class="flex w-full items-center justify-center gap-x-2"
                    disabled={isSendingGifts ||
                      remainingGifts < 1 ||
                      ownedVbucks < item.price.final ||
                      !item.giftable ||
                      !friends.length}
                    onclick={() => (isGiftDialogOpen = true)}
                    variant="outline"
                  >
                    <GiftIcon class="size-5" />
                    {$t('itemShop.gift')}
                  </Button>
                </Tooltip.Trigger>
                {#if remainingGifts < 1}
                  <Tooltip.Content>{$t('itemShop.noRemainingGifts')}</Tooltip.Content>
                {:else if ownedVbucks < item.price.final}
                  <Tooltip.Content>{$t('itemShop.notEnoughVbucks')}</Tooltip.Content>
                {:else if !friends.length}
                  <Tooltip.Content>{$t('itemShop.noFriends')}</Tooltip.Content>
                {/if}
              </Tooltip.Root>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>

{#if $activeAccount?.accountId}
  <ShopPurchaseConfirmation {isPurchasing} {item} bind:open={isPurchaseDialogOpen} />
  <ShopGiftFriendSelection {isSendingGifts} {item} bind:open={isGiftDialogOpen} />
{/if}
