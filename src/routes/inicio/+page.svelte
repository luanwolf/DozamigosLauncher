<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { SvelteSet } from 'svelte/reactivity';
  import { page } from '$app/state';
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import SearchIcon from '@lucide/svelte/icons/search';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { NavZones } from '$lib/constants/sidebar';
  import { getWeeklySuperchargerInfo } from '$lib/constants/stw/weekly-supercharger';
  import { language, t } from '$lib/i18n';
  import { fetchSeasonInfo, type SeasonInfo } from '$lib/modules/fortnite-season';
  import { redeemAllCheatCodes, redeemCheatCodes } from '$lib/modules/cheat-codes';
  import { queryProfile } from '$lib/modules/mcp';
  import { aggregateMissionAlertsOverview } from '$lib/modules/mission-alerts-buckets';
  import { resolveWeeklySuperchargerType } from '$lib/modules/weekly-supercharger';
  import { setWorldInfoCache } from '$lib/modules/world-info';
  import { accountStore, settingsStore } from '$lib/storage';
  import { claimedAlerts, worldInfoCache } from '$lib/stores';
  import { formatRemainingDuration, handleError, msUntilNextUtcMidnight } from '$lib/utils';
  import PageContent from '$components/layout/PageContent.svelte';
  import HomeOnboarding from '$components/modules/home/HomeOnboarding.svelte';
  import HomeSeasonHero from '$components/modules/home/HomeSeasonHero.svelte';
  import AlertsOverviewGrid from '$components/modules/mission-alerts/AlertsOverviewGrid.svelte';

  const activeAccount = accountStore.getActiveStore(true);

  let remainingTime = $state(msUntilNextUtcMidnight());
  let isRefreshing = $state(false);
  let alertsLoadError = $state(false);
  let isLoadingSeason = $state(true);
  let seasonInfo = $state<SeasonInfo | null>(null);
  let battlePass = $state<{ level: number; xp: number } | null>(null);
  let weeklySuperchargerType = $state(resolveWeeklySuperchargerType(null));
  let isRedeemingHacks = $state(false);
  let customHackCode = $state('');

  const alertsOverview = $derived(aggregateMissionAlertsOverview($worldInfoCache));
  const weeklySuperchargerInfo = $derived(getWeeklySuperchargerInfo(weeklySuperchargerType, $t));
  const isLoadingAlertsOverview = $derived(!alertsLoadError && !$worldInfoCache?.size);

  const deckZones = $derived(NavZones.filter((z) => !z.deck && !z.hidden));

  // First run: nothing set up yet, so the deck would be mostly dead ends.
  // `?setup` is how settings reopens it for an account that is already set up.
  const showOnboarding = $derived(
    page.url.searchParams.has('setup') ||
      (!$settingsStore.app?.onboardingDone && (!$accountStore.accounts.length || !$settingsStore.app?.gamePath))
  );

  async function loadSeason() {
    isLoadingSeason = true;
    try {
      seasonInfo = await fetchSeasonInfo({ account: $activeAccount, locale: $language });
    } catch {
      seasonInfo = null;
    } finally {
      isLoadingSeason = false;
    }
  }

  async function loadAccountBalances() {
    if (!$activeAccount) {
      battlePass = null;
      weeklySuperchargerType = resolveWeeklySuperchargerType(null);
      return;
    }

    const accountId = $activeAccount.accountId;

    try {
      const [campaign, athena] = await Promise.all([
        queryProfile($activeAccount, 'campaign'),
        queryProfile($activeAccount, 'athena')
      ]);

      weeklySuperchargerType = resolveWeeklySuperchargerType(campaign);

      const athenaAttributes = athena.profileChanges[0].profile.stats.attributes;
      battlePass = {
        level: athenaAttributes.book_level ?? 0,
        xp: athenaAttributes.book_xp ?? 0
      };

      const attributes = campaign.profileChanges[0].profile.stats.attributes;
      const doneMissionAlerts =
        attributes.mission_alert_redemption_record?.claimData?.map((claimData) => claimData.missionAlertId) || [];

      claimedAlerts.set(accountId, new SvelteSet(doneMissionAlerts));
    } catch {
      battlePass = null;
      weeklySuperchargerType = resolveWeeklySuperchargerType(null);
    }
  }

  async function refreshWorldInfo() {
    alertsLoadError = false;
    worldInfoCache.set(new Map());
    try {
      await setWorldInfoCache();
    } catch {
      alertsLoadError = true;
      toast.error($t('stwMissionAlerts.loadFailed'));
    }
  }

  function toastHackSummary(summary: Awaited<ReturnType<typeof redeemCheatCodes>>) {
    if (summary.unavailable) {
      toast.error($t('home.adminPanel.unavailable'));
    } else if (summary.redeemed > 0) {
      toast.success($t('home.adminPanel.done', { redeemed: summary.redeemed, skipped: summary.skipped }));
    } else if (summary.skipped > 0 && summary.failed === 0) {
      toast.success($t('home.adminPanel.none'));
    } else {
      toast.error($t('home.adminPanel.failed'));
    }
  }

  async function redeemLobbyHacks() {
    if (!$activeAccount || isRedeemingHacks) return;
    isRedeemingHacks = true;
    try {
      toastHackSummary(await redeemAllCheatCodes($activeAccount));
    } catch (error) {
      handleError({ error, message: $t('home.adminPanel.failed'), account: $activeAccount });
    } finally {
      isRedeemingHacks = false;
    }
  }

  async function redeemTypedHack() {
    if (!$activeAccount || isRedeemingHacks || !customHackCode.trim()) return;
    isRedeemingHacks = true;
    try {
      toastHackSummary(await redeemCheatCodes($activeAccount, [customHackCode]));
    } catch (error) {
      handleError({ error, message: $t('home.adminPanel.failed'), account: $activeAccount });
    } finally {
      isRedeemingHacks = false;
    }
  }

  async function refreshAll() {
    isRefreshing = true;
    await Promise.all([loadSeason(), loadAccountBalances(), refreshWorldInfo()]);
    isRefreshing = false;
  }

  $effect(() => {
    if (!$activeAccount) {
      battlePass = null;
      weeklySuperchargerType = resolveWeeklySuperchargerType(null);
      loadSeason();
      return;
    }
    loadAccountBalances();
    loadSeason();
  });

  onMount(() => {
    loadSeason();
    if (!$worldInfoCache?.size) refreshWorldInfo();

    let utcDay = new Date().getUTCDate();
    let rotationRefreshPending = false;

    const intervalId = setInterval(() => {
      remainingTime = msUntilNextUtcMidnight();
      const currentDay = new Date().getUTCDate();
      if (currentDay !== utcDay && !rotationRefreshPending && !isRefreshing) {
        utcDay = currentDay;
        rotationRefreshPending = true;
        refreshAll().finally(() => {
          rotationRefreshPending = false;
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
      refreshAll();
    }
  }}
/>

<PageContent class="gap-6" bare center centerClass={HUD_PAGE_WIDTH}>
  {#if showOnboarding}
    <HomeOnboarding />
  {:else}
    <div class="cheat-admin-hero">
      <form
        class="cheat-admin-chip"
        class:is-locked={!$activeAccount}
        onsubmit={(event) => {
          event.preventDefault();
          redeemTypedHack();
        }}
      >
        <span class="cheat-admin-key" aria-hidden="true">.</span>
        <SearchIcon class="size-3.5" />
        <span>{isRedeemingHacks ? $t('home.adminPanel.busy') : $t('home.adminPanel.label')}</span>
        <input
          class="cheat-admin-input"
          type="text"
          autocomplete="off"
          spellcheck="false"
          placeholder={$t('home.adminPanel.placeholder')}
          disabled={!$activeAccount || isRedeemingHacks}
          title={!$activeAccount ? $t('home.adminPanel.needAccount') : $t('home.adminPanel.placeholder')}
          bind:value={customHackCode}
        />
        <button
          class="cheat-admin-action"
          type="submit"
          disabled={!$activeAccount || isRedeemingHacks || !customHackCode.trim()}
        >
          {$t('home.adminPanel.submit')}
        </button>
        <button
          class="cheat-admin-action"
          type="button"
          disabled={!$activeAccount || isRedeemingHacks}
          title={!$activeAccount ? $t('home.adminPanel.needAccount') : $t('home.adminPanel.all')}
          onclick={redeemLobbyHacks}
        >
          {$t('home.adminPanel.all')}
        </button>
      </form>
      <HomeSeasonHero {battlePass} loading={isLoadingSeason} requiresLogin={!$activeAccount} season={seasonInfo} />
    </div>

    <section class="deck-grid">
      {#each deckZones as zone (zone.id)}
        {@const Icon = zone.icon}
        <a class="deck-tile group" href={zone.href}>
          <div class="deck-tile-icon">
            <Icon class="size-6" />
          </div>
          <div class="deck-tile-copy">
            <p class="deck-tile-title font-display leading-none text-foreground group-hover:text-primary">
              {$t(`zones.${zone.id}.title`)}
            </p>
            <p class="deck-tile-blurb mt-1 text-sm text-muted-foreground">{$t(`zones.${zone.id}.blurb`)}</p>
          </div>
          <ArrowRightIcon
            class="deck-tile-arrow size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
          />
        </a>
      {/each}
    </section>

    <section class="space-y-3">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="label-kicker text-primary">{$t('zones.liveStrip')}</p>
          <p class="font-display text-2xl leading-none">{$t('home.missionAlerts.viewAll')}</p>
          <p class="mt-1 text-sm text-muted-foreground">
            {$t('stwMissionAlerts.page.rotation', { time: formatRemainingDuration(remainingTime) })}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            class="inline-flex items-center gap-1.5 border border-border px-3 py-2 text-xs font-semibold tracking-wide uppercase hover:border-primary hover:text-primary disabled:opacity-50"
            disabled={isRefreshing}
            onclick={() => refreshAll()}
            type="button"
          >
            <RefreshCwIcon class="size-3.5 {isRefreshing ? 'animate-spin' : ''}" />
            {$t('stwMissionAlerts.refresh')}
          </button>
          <a
            class="inline-flex items-center gap-1.5 border border-border px-3 py-2 text-xs font-semibold tracking-wide uppercase hover:border-primary hover:text-primary"
            href="/br-stw/stw-mission-alerts"
          >
            {$t('home.missionAlerts.viewAll')}
            <ArrowRightIcon class="size-3.5" />
          </a>
        </div>
      </div>

      {#if alertsLoadError && !$worldInfoCache?.size}
        <p class="text-sm text-destructive">{$t('stwMissionAlerts.loadFailed')}</p>
      {:else}
        <AlertsOverviewGrid
          loading={isLoadingAlertsOverview}
          overview={alertsOverview}
          weeklySuperchargerIcon={weeklySuperchargerInfo.icon}
          weeklySuperchargerLabel={weeklySuperchargerInfo.label}
        />
      {/if}
    </section>
  {/if}
</PageContent>
