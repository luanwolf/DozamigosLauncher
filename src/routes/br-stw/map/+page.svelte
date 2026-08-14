<script lang="ts">
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { language, t } from '$lib/i18n';
  import { mapCache } from '$lib/modules/account-data';
  import PageActionButton from '$components/layout/PageActionButton.svelte';
  import PageContent from '$components/layout/PageContent.svelte';
  import PageLoading from '$components/layout/PageLoading.svelte';

  const cached = $derived(mapCache.get($language));
  const mapData = $derived(cached.data);
  const isLoading = $derived(cached.loading || cached.refreshing);
  const loadError = $derived(!!cached.error && !cached.data);

  function loadMap(force = false) {
    void mapCache.ensure($language, { force });
  }

  $effect(() => {
    loadMap();
  });
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('brMap.page.description')}
  title={$t('brMap.page.title')}
>
  {#snippet actions()}
    <PageActionButton
      disabled={isLoading}
      label={$t('brMap.refresh')}
      loading={isLoading}
      onclick={() => loadMap(true)}
    >
      <RefreshCwIcon class="size-4" />
    </PageActionButton>
  {/snippet}

  {#if isLoading && !mapData}
    <PageLoading label={$t('loading')} />
  {:else if loadError || !mapData}
    <p class="text-center text-sm text-destructive">{$t('brMap.loadFailed')}</p>
  {:else}
    <img alt={$t('brMap.mapAlt')} class="w-full" decoding="async" loading="eager" src={mapData.imagePois} />
  {/if}
</PageContent>
