<script lang="ts">
  import { untrack } from 'svelte';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { language, t } from '$lib/i18n';
  import { generateAuthenticatedGamePageUrl } from '$lib/modules/epic-web-url';
  import { fetchSpecialOffers, type SpecialOffer } from '$lib/modules/special-offers';
  import { accountStore } from '$lib/storage';
  import { handleError } from '$lib/utils';
  import PageActionButton from '$components/layout/PageActionButton.svelte';
  import PageContent from '$components/layout/PageContent.svelte';
  import PageLoading from '$components/layout/PageLoading.svelte';
  import { Button } from '$components/ui/button';

  const activeAccount = accountStore.getActiveStore(true);

  let offers = $state<SpecialOffer[]>([]);
  let loading = $state(false);
  let failed = $state(false);
  let openingId = $state<string | null>(null);

  function formatPrice(value: number, currency: string) {
    return value.toLocaleString($language, { style: 'currency', currency });
  }

  function formatEndsAt(date: string) {
    return new Date(date).toLocaleDateString($language, { day: '2-digit', month: 'short' });
  }

  async function load() {
    if (loading) return;
    loading = true;
    failed = false;
    try {
      offers = await fetchSpecialOffers();
    } catch (error) {
      failed = true;
      handleError({ error, message: $t('specialOffers.loadFailed') });
    } finally {
      loading = false;
    }
  }

  async function openEpic(offer: SpecialOffer) {
    openingId = offer.id;
    try {
      const url = $activeAccount
        ? await generateAuthenticatedGamePageUrl($activeAccount, offer.epicUrl)
        : offer.epicUrl;
      await openUrl(url);
    } catch (error) {
      handleError({
        error,
        message: $t('specialOffers.openFailed'),
        account: $activeAccount ?? undefined
      });
    } finally {
      openingId = null;
    }
  }

  $effect(() => {
    // load() reads `loading`; tracking it here would re-run the effect on every
    // flip and refetch forever.
    untrack(() => void load());
  });
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === 'F5') {
      event.preventDefault();
      void load();
    }
  }}
/>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('specialOffers.page.description')}
  title={$t('specialOffers.page.title')}
>
  {#snippet actions()}
    <PageActionButton disabled={loading} label={$t('specialOffers.refresh')} {loading} onclick={load}>
      <RefreshCwIcon class="size-4" />
    </PageActionButton>
  {/snippet}

  {#if loading && !offers.length}
    <PageLoading label={$t('specialOffers.loading')} />
  {:else if failed && !offers.length}
    <p class="text-sm text-destructive">{$t('specialOffers.loadFailed')}</p>
  {:else if !offers.length}
    <p class="text-sm text-muted-foreground">{$t('specialOffers.empty')}</p>
  {:else}
    <div class="grid w-full grid-cols-[repeat(auto-fill,minmax(min(100%,14rem),1fr))] gap-4 sm:gap-5">
      {#each offers as offer (offer.id)}
        <article class="hud-panel flex min-w-0 flex-col overflow-hidden">
          <div class="aspect-3/4 overflow-hidden bg-muted">
            {#if offer.image}
              <img class="size-full object-cover" alt={offer.title} decoding="async" loading="lazy" src={offer.image} />
            {/if}
          </div>

          <div class="flex flex-1 flex-col gap-3 p-4">
            <div class="min-w-0">
              <h2 class="line-clamp-2 text-base leading-tight font-semibold">{offer.title}</h2>
              <div class="mt-1 flex flex-wrap items-baseline gap-2">
                <p class="text-lg font-bold text-primary">{formatPrice(offer.price, offer.currency)}</p>
                {#if offer.basePrice}
                  <p class="text-sm text-muted-foreground line-through">
                    {formatPrice(offer.basePrice, offer.currency)}
                  </p>
                {/if}
              </div>
              {#if offer.endsAt}
                <p class="mt-1 text-xs text-muted-foreground">
                  {$t('specialOffers.endsOn', { date: formatEndsAt(offer.endsAt) })}
                </p>
              {/if}
              {#if offer.description}
                <p class="mt-2 line-clamp-3 text-xs text-muted-foreground">{offer.description}</p>
              {/if}
            </div>

            <div class="mt-auto grid gap-2">
              <Button
                class="w-full"
                disabled={openingId === offer.id}
                loading={openingId === offer.id}
                onclick={() => openEpic(offer)}
              >
                <ExternalLinkIcon class="size-4" />
                {$t('specialOffers.buyEpic')}
              </Button>
              <Button class="w-full" onclick={() => openUrl(offer.psnUrl)} variant="outline">
                <ExternalLinkIcon class="size-4" />
                {$t('specialOffers.buyPsn')}
              </Button>
            </div>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</PageContent>
