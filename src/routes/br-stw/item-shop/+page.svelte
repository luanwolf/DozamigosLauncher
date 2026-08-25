<script lang="ts" module>
  import type { ShopFilter as ShopFilterType, ShopItem } from '$types/shop';

  let searchQuery = $state<string>('');
  let selectedFilters = $state<ShopFilterType[]>([]);
  let selectedTypeFilter = $state<string>('');
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { SvelteMap } from 'svelte/reactivity';
  import Fuse from 'fuse.js';
  import DownloadIcon from '@lucide/svelte/icons/download';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { language, t } from '$lib/i18n';
  import { logger } from '$lib/logger';
  import { fetchShop as fetchShopData } from '$lib/modules/fortnite-api';
  import { getFriends } from '$lib/modules/friends';
  import { fetchUsersByIds } from '$lib/modules/lookup';
  import { queryProfile } from '$lib/modules/mcp';
  import { exportItemShopWebp } from '$lib/modules/shop-export';
  import { beginExportToast } from '$lib/modules/export-toast';
  import { getShopItemWishlistKey } from '$lib/modules/shop-item-key';
  import { accountStore } from '$lib/storage';
  import {
    accountDataCache,
    brShopCache,
    brShopCacheLocale,
    ownedItemsCache,
    type AccountDataCache
  } from '$lib/stores';
  import { shopWishlistStore } from '$lib/stores/shop-wishlist';
  import { calculateVbucks, formatRemainingDuration, handleError, msUntilNextUtcMidnight } from '$lib/utils';
  import PageActionButton from '$components/layout/PageActionButton.svelte';
  import PageContent from '$components/layout/PageContent.svelte';
  import ShopItemModal from '$components/modules/shop/modals/ShopItemModal.svelte';
  import ShopFilter from '$components/modules/shop/ShopFilter.svelte';
  import ShopSection, { UNCATEGORIZED_LAYOUT_ID } from '$components/modules/shop/ShopSection.svelte';
  import ShopTypeFilter from '$components/modules/shop/ShopTypeFilter.svelte';
  import ShopSectionSkeleton from '$components/modules/shop/skeletons/ShopSectionSkeleton.svelte';
  import { Input } from '$components/ui/input';
  import type { ShopSection as ShopSectionType } from '$types/shop';

  /** fortnite-api.com layout id for the Jam Tracks / Músicas section. */
  const MUSIC_SECTION_LAYOUT_ID = 'JT0601';

  const activeAccount = accountStore.getActiveStore(true);

  $effect(() => {
    const alreadyFetched = $activeAccount && Object.keys(accountDataCache.get($activeAccount.accountId) || {}).length;
    if (!$activeAccount || alreadyFetched) return;

    fetchAccountData();
  });

  $effect(() => {
    const loc = $language;
    if ($brShopCacheLocale && $brShopCacheLocale !== loc) {
      fetchShop(true);
    }
  });

  let remainingTime = $state(msUntilNextUtcMidnight());
  let isFetchingShop = $state(false);
  let isExporting = $state(false);
  let shopSections = $state<ShopSectionType[] | null>(null);
  let errorOccurred = $state(false);
  let modalOfferId = $state<string>('');

  const ownedVbucks = $derived(accountDataCache.get($activeAccount?.accountId || '')?.vbucks ?? 0);

  async function exportShop() {
    if (!shopSections?.length || isExporting) return;
    // Jam Tracks and the catch-all "Mais da loja" row stay on the page, not in the collage.
    const items = shopSections
      .filter((section) => !isMusicSection(section) && !isOtherShopSection(section))
      .flatMap((section) => section.items)
      .filter((item) => item.type.id !== 'track');
    if (!items.length) {
      toast.info($t('itemShop.exportEmpty'));
      return;
    }

    isExporting = true;
    const exportToast = beginExportToast();
    exportToast.progress($t('itemShop.exportProgress', { percent: 0 }));
    try {
      const updatedAt = $brShopCache?.lastUpdated ? new Date($brShopCache.lastUpdated) : new Date();
      const date = updatedAt.toLocaleDateString($language, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const result = await exportItemShopWebp({
        items,
        titleLabel: $t('itemShop.page.title'),
        dateLabel: $t('itemShop.exportDate', { date }),
        onlyTodayLabel: $t('itemShop.onlyToday'),
        locale: $language,
        onProgress: ({ done, total }) => {
          exportToast.progress(
            $t('itemShop.exportProgress', { percent: total > 0 ? Math.round((done / total) * 100) : 0 })
          );
        }
      });
      if (result.path) {
        exportToast.done($t('itemShop.exported', { count: result.count }), result.path, $t('itemShop.openExport'));
      } else {
        exportToast.fail();
        toast.success($t('itemShop.exported', { count: result.count }));
      }
    } catch (error) {
      exportToast.fail();
      handleError({
        error,
        message: $t('itemShop.exportFailed'),
        account: $activeAccount ?? undefined
      });
    } finally {
      isExporting = false;
    }
  }

  const availableTypes = $derived.by(() => {
    if (!shopSections) return [];
    const seen = new SvelteMap<string, string>();
    for (const section of shopSections) {
      for (const item of section.items) {
        if (item.type.id && item.type.name && !seen.has(item.type.id)) {
          seen.set(item.type.id, item.type.name);
        }
      }
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  const filteredSections = $derived.by(() => {
    if (!shopSections) return null;

    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const longestWaitMs = 120 * 24 * 60 * 60 * 1000;

    return shopSections
      .map((section) => {
        let items = section.items;

        if (selectedTypeFilter) {
          items = items.filter((item) => item.type.id === selectedTypeFilter);
        }

        if (selectedFilters.includes('new')) {
          items = items.filter((item) => !item.dates.lastSeen || item.shopHistory.length < 2);
        }

        if (selectedFilters.includes('leavingSoon')) {
          items = items.filter((item) => item.dates.out && new Date(item.dates.out).getTime() - now < threeDaysMs);
        }

        if (selectedFilters.includes('longestWait')) {
          items = items.filter(
            (item) => item.dates.lastSeen && now - new Date(item.dates.lastSeen).getTime() > longestWaitMs
          );
        }

        if (selectedFilters.includes('wishlist')) {
          const wishlist = $shopWishlistStore;
          items = items.filter((item) => wishlist.has(getShopItemWishlistKey(item)));
        }

        if (selectedFilters.includes('affordable') && ownedVbucks > 0) {
          items = items.filter((item) => item.price.final <= ownedVbucks);
        }

        if (searchQuery && items.length) {
          const fuse = new Fuse(items, { keys: ['name'], threshold: 0.4, shouldSort: false });
          items = fuse.search(searchQuery).map((result) => result.item);
        }

        return { ...section, items };
      })
      .filter((section) => section.items.length);
  });

  async function fetchShop(forceRefresh = false) {
    shopSections = null;
    isFetchingShop = true;

    try {
      const currentLocale = $language;
      const cacheStale = $brShopCacheLocale !== currentLocale;

      if (!$brShopCache || forceRefresh || cacheStale) {
        const response = await fetchShopData(currentLocale);
        brShopCache.set(response);
        brShopCacheLocale.set(currentLocale);
      }

      shopSections = sortShopSections(
        groupBySections($brShopCache.offers).map((section) => ({
          ...section,
          items: section.items.sort((a, b) => b.sortPriority - a.sortPriority)
        }))
      );
    } catch (error) {
      logger.error('Failed to fetch BR shop data', { error });
      errorOccurred = true;
    } finally {
      isFetchingShop = false;
    }
  }

  function isMusicSection(section: ShopSectionType) {
    return section.id === MUSIC_SECTION_LAYOUT_ID || section.items.every((item) => item.type.id === 'track');
  }

  function isOtherShopSection(section: ShopSectionType) {
    return (
      section.id === UNCATEGORIZED_LAYOUT_ID ||
      section.name === UNCATEGORIZED_LAYOUT_ID ||
      section.name === '__uncategorized__'
    );
  }

  /** Named rows first, then the catch-all row, then the Jam Tracks at the bottom. */
  function sortShopSections(sections: ShopSectionType[]) {
    const named: ShopSectionType[] = [];
    const other: ShopSectionType[] = [];
    const music: ShopSectionType[] = [];

    for (const section of sections) {
      if (isMusicSection(section)) music.push(section);
      else if (section.id === UNCATEGORIZED_LAYOUT_ID) other.push(section);
      else named.push(section);
    }

    return [...named, ...other, ...music];
  }

  function groupBySections(offers: ShopItem[]) {
    return offers.reduce<ShopSectionType[]>((acc, item) => {
      const sectionName = item.section.name || item.section.id || '__uncategorized__';
      const section = acc.find((section) => section.name === sectionName);

      if (section) {
        section.items.push(item);
      } else {
        acc.push({
          name: sectionName,
          id: item.section.id,
          items: [item]
        });
      }

      return acc;
    }, []);
  }

  async function fetchAccountData() {
    const account = $activeAccount!;
    const [athena, commonCore, friends] = await Promise.allSettled([
      queryProfile(account, 'athena'),
      queryProfile(account, 'common_core'),
      getFriends(account)
    ]);

    let accountData: AccountDataCache = {
      vbucks: 0,
      remainingGifts: 0,
      friends: []
    };

    if (athena.status === 'fulfilled') {
      const profile = athena.value.profileChanges[0].profile;
      const ownedItems = Object.values(profile.items)
        .filter((item) => item.attributes.item_seen != null)
        .map((item) => item.templateId.split(':')[1].toLowerCase());

      ownedItemsCache.update((accounts) => {
        accounts[account.accountId] = new Set<string>(ownedItems);
        return accounts;
      });
    } else {
      handleError({ error: athena.reason, message: 'Failed to fetch Athena profile', account, toastId: false });
    }

    if (commonCore.status === 'fulfilled') {
      const profile = commonCore.value.profileChanges[0].profile;
      accountData.vbucks = calculateVbucks(commonCore.value);
      accountData.remainingGifts = profile.stats.attributes.allowed_to_send_gifts ? 5 : 0;
    } else {
      handleError({
        error: commonCore.reason,
        message: 'Failed to fetch Common Core profile',
        account,
        toastId: false
      });
    }

    if (friends.status === 'fulfilled') {
      const accountsData = await fetchUsersByIds(
        account,
        friends.value.map((friend) => friend.accountId)
      );

      accountData.friends = accountsData
        .sort((a, b) => (a.displayName || a.id).localeCompare(b.displayName || b.id))
        .map((account) => ({
          displayName: account.displayName || account.id,
          accountId: account.id
        }));
    } else {
      handleError({ error: friends.reason, message: 'Failed to fetch friends list', account, toastId: false });
    }

    if (commonCore.status === 'fulfilled' || friends.status === 'fulfilled') {
      accountDataCache.set(account.accountId, accountData);
    }
  }

  onMount(() => {
    let isFetching = true;
    let utcDay = new Date().getUTCDate();
    fetchShop().finally(() => (isFetching = false));

    const intervalId = setInterval(() => {
      remainingTime = msUntilNextUtcMidnight();

      const currentDay = new Date().getUTCDate();
      if (currentDay !== utcDay && !isFetching) {
        utcDay = currentDay;
        isFetching = true;
        fetchShop(true).finally(() => {
          isFetching = false;
        });
      }
    }, 1000);

    return () => clearInterval(intervalId);
  });
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === 'F5') {
      event.preventDefault();
      errorOccurred = false;
      fetchShop(true);
    }
  }}
/>

<PageContent center centerClass={HUD_PAGE_WIDTH} title={$t('itemShop.page.title')}>
  {#snippet description()}
    {#if remainingTime}
      <p class="font-tagline text-sm text-muted-foreground">
        {$t('itemShop.nextRotation', { time: formatRemainingDuration(remainingTime) })}
      </p>
    {/if}
  {/snippet}
  {#snippet actions()}
    <PageActionButton
      disabled={isFetchingShop || isExporting || !shopSections?.length}
      label={$t('itemShop.exportWebp')}
      loading={isExporting}
      onclick={() => exportShop()}
    >
      <DownloadIcon class="size-4" />
    </PageActionButton>
    <PageActionButton
      disabled={isFetchingShop || isExporting}
      label={$t('itemShop.refresh')}
      loading={isFetchingShop}
      onclick={() => {
        errorOccurred = false;
        fetchShop(true);
      }}
    >
      <RefreshCwIcon class="size-4" />
    </PageActionButton>
  {/snippet}

  <div class="flex flex-wrap items-center gap-3 sm:gap-4">
      <Input
        class="h-8 w-full rounded-md sm:max-w-xs"
        placeholder={$t('itemShop.searchPlaceholder')}
        type="search"
        bind:value={searchQuery}
      />
      <ShopFilter bind:value={selectedFilters} />
      {#if availableTypes.length}
        <ShopTypeFilter types={availableTypes} bind:selected={selectedTypeFilter} />
      {/if}
    </div>

    <div>
      {#if !filteredSections}
        {#if errorOccurred}
          <p class="text-red-500">{$t('itemShop.failedtoFetch')}</p>
        {:else}
          <div class="space-y-10 sm:space-y-12">
            <!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
            {#each Array(2) as _, index (index)}
              <ShopSectionSkeleton />
            {/each}
          </div>
        {/if}
      {:else if filteredSections?.length}
        <div class="space-y-10 sm:space-y-12">
          {#each filteredSections as section (section.name)}
            <ShopSection {section} bind:modalOfferId />
          {/each}
        </div>
      {:else}
        <p>{$t('itemShop.noItems')}</p>
      {/if}
    </div>

  {#if modalOfferId}
    <ShopItemModal bind:offerId={modalOfferId} />
  {/if}
</PageContent>
