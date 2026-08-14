<script lang="ts" module>
  import type { FreeGame } from '$lib/modules/free-games';

  let isGeneratingLink = $state(false);
  let isClaiming = $state(false);
  let claimingGameId = $state<string | null>(null);
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import CheckIcon from '@lucide/svelte/icons/check';
  import ClockIcon from '@lucide/svelte/icons/clock';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import GiftIcon from '@lucide/svelte/icons/gift';
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import TagIcon from '@lucide/svelte/icons/tag';
  import { writeText } from '@tauri-apps/plugin-clipboard-manager';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { language, t } from '$lib/i18n';
  import { freeGamesCache } from '$lib/modules/account-data';
  import {
    buildEpicLauncherPurchaseUrl,
    buildEpicLauncherStoreUrl,
    generateAuthenticatedGamePageUrl
  } from '$lib/modules/epic-web-url';
  import { claimFreeGamesForAccount, type FreeGameClaimResult } from '$lib/modules/free-games-claim';
  import { isFreeGameRedeemed, markFreeGamesRedeemed, redeemedFreeGameIds } from '$lib/modules/free-games-owned';
  import { openExternalUrl } from '$lib/modules/open-external';
  import { accountStore } from '$lib/storage';
  import { ownedAppsCache } from '$lib/stores';
  import { activityLog } from '$lib/stores/activity-log';
  import { cn, handleError } from '$lib/utils';
  import PageActionButton from '$components/layout/PageActionButton.svelte';
  import PageContent from '$components/layout/PageContent.svelte';
  import { Button } from '$components/ui/button';

  const activeAccount = accountStore.getActiveStore(true);

  const cached = $derived(freeGamesCache.get($language));
  const freeGames = $derived(cached.data ?? []);
  const isFetchingGames = $derived(cached.loading);
  const hasFetched = $derived(!!cached.data);

  function isGameRedeemed(game: FreeGame): boolean {
    return isFreeGameRedeemed(game, $ownedAppsCache, $redeemedFreeGameIds);
  }

  const unclaimedGames = $derived(freeGames.filter((game) => !isGameRedeemed(game)));

  async function loadGames(force = false) {
    const games = await freeGamesCache.ensure($language, { force });
    if (!games) toast.error($t('freeGames.fetchError'));
  }

  async function openInEpicLauncher(game: FreeGame) {
    // One deep link only — opening purchase then store (or opening twice) bugs Epic checkout.
    const purchase = buildEpicLauncherPurchaseUrl(game.namespace, game.id);
    try {
      await openExternalUrl(purchase);
      return true;
    } catch {
      try {
        await openExternalUrl(buildEpicLauncherStoreUrl(game.storeUrl));
        return true;
      } catch (error) {
        handleError({
          error,
          message: 'Failed to open Epic Games Launcher',
          account: $activeAccount ?? undefined
        });
        return false;
      }
    }
  }

  async function reportClaimResults(results: FreeGameClaimResult[]) {
    const claimed = results.filter((r) => r.status === 'claimed').length;
    const owned = results.filter((r) => r.status === 'already_owned').length;
    const needsLauncher = results.filter((r) => r.status === 'browser_only' || r.status === 'error');

    markFreeGamesRedeemed(
      results.filter((r) => r.status === 'claimed' || r.status === 'already_owned').map((r) => r.game.id)
    );

    for (const result of results) {
      if (result.status === 'claimed') {
        activityLog.add(
          'game',
          $t('activityLog.gameClaimed', { title: result.game.title }),
          $activeAccount?.displayName
        );
      } else if (result.status === 'browser_only' || result.status === 'error') {
        activityLog.add(
          'game',
          $t('activityLog.gameBrowserOnly', { title: result.game.title }),
          $activeAccount?.displayName
        );
      }
    }

    if (claimed > 0) toast.success($t('freeGames.claimedCount', { count: claimed }));
    else if (owned === results.length && !needsLauncher.length) {
      toast.success($t('freeGames.allAlreadyOwned'));
    }

    if (needsLauncher.length) {
      toast.message($t('freeGames.openingLauncher'));
      // ponytail: one launcher handoff at a time — stacking deep links breaks Epic's purchase UI
      await openInEpicLauncher(needsLauncher[0]!.game);
    }
  }

  async function claimGames(games: FreeGame[]) {
    const account = $activeAccount;
    const targets = games.filter((game) => !isGameRedeemed(game));
    if (!account || !targets.length) {
      if (games.length && !targets.length) toast.success($t('freeGames.allAlreadyOwned'));
      else toast.error($t('accountManager.selectAccount'));
      return;
    }

    isClaiming = true;
    claimingGameId = targets.length === 1 ? targets[0]!.id : null;

    try {
      const results = await claimFreeGamesForAccount(account, targets);
      await reportClaimResults(results);
    } catch (error) {
      handleError({ error, message: 'Failed to claim free games', account });
      for (const game of targets) await openInEpicLauncher(game);
    } finally {
      isClaiming = false;
      claimingGameId = null;
    }
  }

  async function openGamePageInBrowser(game: FreeGame) {
    const account = $activeAccount;
    if (!account) {
      toast.error($t('accountManager.selectAccount'));
      return;
    }

    isGeneratingLink = true;
    try {
      await openInEpicLauncher(game);
    } catch {
      try {
        const url = await generateAuthenticatedGamePageUrl(account, game.storeUrl);
        await openExternalUrl(url);
      } catch (error) {
        handleError({ error, message: 'Failed to open store page', account });
      }
    } finally {
      isGeneratingLink = false;
    }
  }

  async function copyGamePageLink(game: FreeGame) {
    const account = $activeAccount;
    if (!account) {
      toast.error($t('accountManager.selectAccount'));
      return;
    }

    isGeneratingLink = true;
    try {
      const url = await generateAuthenticatedGamePageUrl(account, game.storeUrl);
      await writeText(url);
      toast.success($t('freeGames.claimLinkCopied', { account: account.displayName }));
    } catch (error) {
      handleError({ error, message: $t('freeGames.failedToCopyClaimLink'), account });
    } finally {
      isGeneratingLink = false;
    }
  }

  function formatEndDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function formatPrice(cents: number): string {
    return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  }

  onMount(() => {
    void loadGames();
  });
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('freeGames.page.description')}
  title={$t('freeGames.page.title')}
>
  {#snippet actions()}
    <PageActionButton
      disabled={isFetchingGames || isGeneratingLink || isClaiming || !unclaimedGames.length || !$activeAccount}
      label={$t('freeGames.claimAll')}
      loading={isClaiming && !claimingGameId}
      loadingText={$t('freeGames.claiming')}
      onclick={() => claimGames(unclaimedGames)}
    >
      <GiftIcon class="size-4" />
    </PageActionButton>
    <PageActionButton
      disabled={isFetchingGames || isGeneratingLink || isClaiming}
      label={$t('freeGames.refresh')}
      loading={isFetchingGames}
      loadingText={$t('freeGames.loading')}
      onclick={() => loadGames(true)}
    >
      <RefreshCwIcon class="size-4" />
    </PageActionButton>
  {/snippet}

  <p class="text-xs text-muted-foreground">{$t('freeGames.claimLinkHint')}</p>

  {#if isFetchingGames}
    <div class="grid w-full grid-cols-[repeat(auto-fill,minmax(min(100%,11.5rem),1fr))] gap-5 sm:gap-6">
      {#each [1, 2, 3] as n (n)}
        <div class="hud-panel overflow-hidden">
          <div class="aspect-3/4 animate-pulse bg-muted"></div>
          <div class="flex flex-col gap-2 p-3">
            <div class="h-3 w-3/4 animate-pulse rounded bg-muted"></div>
            <div class="h-3 w-1/2 animate-pulse rounded bg-muted"></div>
          </div>
        </div>
      {/each}
    </div>
  {:else if hasFetched && freeGames.length === 0}
    <div class="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
      <TagIcon class="size-10 opacity-30" />
      <p>{$t('freeGames.noGames')}</p>
    </div>
  {:else if freeGames.length > 0}
    <div class="grid w-full grid-cols-[repeat(auto-fill,minmax(min(100%,11.5rem),1fr))] gap-5 sm:gap-6">
      {#each freeGames as game (game.id)}
        {@const redeemed = isGameRedeemed(game)}
        <div class={cn('hud-panel relative overflow-hidden', redeemed && 'opacity-80')}>
          {#if game.thumbnail}
            <img
              class={cn('aspect-3/4 w-full object-cover', redeemed && 'saturate-50')}
              alt={game.title}
              loading="lazy"
              src={game.thumbnail}
            />
          {:else}
            <div class="flex aspect-3/4 w-full items-center justify-center bg-muted">
              <TagIcon class="size-8 opacity-20" />
            </div>
          {/if}

          <div class="absolute top-2 left-2">
            {#if redeemed}
              <span
                class="inline-flex items-center gap-1 rounded-sm bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white uppercase"
              >
                <CheckIcon class="size-3" />
                {$t('freeGames.statusClaimed')}
              </span>
            {:else}
              <span
                class="rounded-sm bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground uppercase"
              >
                {$t('freeGames.free')}
              </span>
            {/if}
          </div>

          <div class="flex flex-col gap-2 p-3">
            <p class="line-clamp-2 text-sm leading-snug font-semibold" title={game.title}>{game.title}</p>
            <div class="flex items-center gap-1 text-xs text-muted-foreground">
              <ClockIcon class="size-3.5 shrink-0" />
              <span class="truncate">{$t('freeGames.endsAt', { date: formatEndDate(game.endDate) })}</span>
            </div>
            {#if game.originalPrice > 0}
              <span class="text-xs text-muted-foreground line-through">{formatPrice(game.originalPrice)}</span>
            {/if}

            {#if redeemed}
              <Button size="sm" class="mt-1 h-8 w-full text-xs" disabled variant="secondary">
                <CheckIcon class="size-3 shrink-0" />
                <span class="truncate">{$t('freeGames.statusClaimed')}</span>
              </Button>
            {:else}
              <Button
                size="sm"
                class="mt-1 h-8 w-full text-xs"
                disabled={!$activeAccount || isGeneratingLink || isClaiming}
                loading={isClaiming && claimingGameId === game.id}
                onclick={() => claimGames([game])}
              >
                <GiftIcon class="size-3 shrink-0" />
                <span class="truncate">{$t('freeGames.claimGame')}</span>
              </Button>
            {/if}

            <div class="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                class="h-8 min-w-0 flex-1 text-xs"
                disabled={!$activeAccount || isGeneratingLink || isClaiming}
                onclick={() => openGamePageInBrowser(game)}
              >
                <ExternalLinkIcon class="size-3 shrink-0" />
                <span class="truncate">{$t('freeGames.claimOnStore')}</span>
              </Button>

              <Button
                variant="outline"
                size="icon"
                class="size-8 shrink-0"
                disabled={!$activeAccount || isGeneratingLink || isClaiming}
                onclick={() => copyGamePageLink(game)}
              >
                {#if isGeneratingLink}
                  <LoaderCircleIcon class="size-3 animate-spin" />
                {:else}
                  <CopyIcon class="size-3" />
                {/if}
              </Button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</PageContent>
