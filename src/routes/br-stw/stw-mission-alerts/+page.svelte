<script lang="ts">
  import { onMount } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import FunnelIcon from '@lucide/svelte/icons/funnel';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import { toast } from 'svelte-sonner';
  import { TheaterNames, TheaterPowerLevels, Theaters, ZoneCategories } from '$lib/constants/stw/world-info';
  import { t } from '$lib/i18n';
  import { queryProfile } from '$lib/modules/mcp';
  import { setWorldInfoCache } from '$lib/modules/world-info';
  import { resolveWeeklySuperchargerType } from '$lib/modules/weekly-supercharger';
  import { getWeeklySuperchargerInfo } from '$lib/constants/stw/weekly-supercharger';
  import { accountStore } from '$lib/storage';
  import { claimedAlerts, worldInfoCache } from '$lib/stores';
  import { formatRemainingDuration, msUntilNextUtcMidnight } from '$lib/utils';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import PageActionButton from '$components/layout/PageActionButton.svelte';
  import PageContent from '$components/layout/PageContent.svelte';
  import AlertsOverviewGrid from '$components/modules/mission-alerts/AlertsOverviewGrid.svelte';
  import AlertsSection from '$components/modules/mission-alerts/AlertsSection.svelte';
  import FilterSheet, { filters } from '$components/modules/mission-alerts/FilterSheet.svelte';
  import AlertsSectionSkeleton from '$components/modules/mission-alerts/skeletons/AlertsSectionSkeleton.svelte';
  import * as Tabs from '$components/ui/tabs';
  import type { RarityType } from '$types/game/stw/resources';
  import type { ParsedWorldMission } from '$types/game/stw/world-info';

  const activeAccount = accountStore.getActiveStore(true);

  let showFilters = $state(false);
  let remainingTime = $state(msUntilNextUtcMidnight());
  let isRefreshing = $state(false);
  let loadError = $state(false);

  const activeFilterCount = $derived.by(() => {
    const f = $filters;
    return f.zones.size + f.missionTypes.size + f.rarities.size + f.rewards.size + (f.group ? 1 : 0);
  });

  function sectionTitle(label: string, missions: ParsedWorldMission[]) {
    if (!missions.length) return label;
    return `${label} (${$t('stwMissionAlerts.sections.missionCount', { count: missions.length })})`;
  }

  const filteredMissions = $derived.by(() => {
    if (!$worldInfoCache?.size) return null;

    const stonewood: ParsedWorldMission[] = [];
    const plankerton: ParsedWorldMission[] = [];
    const cannyValley: ParsedWorldMission[] = [];
    const twinePeaks: ParsedWorldMission[] = [];
    const ventures: ParsedWorldMission[] = [];

    const vbucks: ParsedWorldMission[] = [];
    const survivors: ParsedWorldMission[] = [];
    const twinePeaks160: ParsedWorldMission[] = [];
    const ventures140: ParsedWorldMission[] = [];
    const upgradeLlamaTokens: ParsedWorldMission[] = [];
    const perkUp: ParsedWorldMission[] = [];

    let totalVbucks = 0;
    let totalSurvivors = 0;
    let totalUpgradeLlamas = 0;
    let totalPerkUp = 0;

    const f = $filters;

    for (const [theaterId, worldMissions] of $worldInfoCache.entries()) {
      if (!matchesZoneFilter(theaterId, f.zones)) continue;

      for (const mission of worldMissions.values()) {
        if (f.group && !mission.isGroup) continue;
        if (!matchesMissionTypeFilter(mission.generator, f.missionTypes)) continue;

        const alertRewards = mission.alert?.rewards ?? [];
        const allRewards = [...alertRewards, ...mission.rewards];

        if (!matchesRarityFilter(allRewards, f.rarities)) continue;
        if (!matchesRewardFilter(allRewards, f.rewards)) continue;

        const collectById = (id: string, list: ParsedWorldMission[], add: (q: number) => void) => {
          const alertMatch = alertRewards.find((x) => x.itemId.includes(id));
          if (alertMatch || mission.rewards.some((x) => x.itemId.includes(id))) {
            if (alertMatch) add(alertMatch.quantity);
            list.push(mission);
          }
        };

        collectById('currency_mtxswap', vbucks, (q) => (totalVbucks += q));
        collectById('voucher_cardpack_bronze', upgradeLlamaTokens, (q) => (totalUpgradeLlamas += q));
        collectById('alteration_upgrade_sr', perkUp, (q) => (totalPerkUp += q));

        const alertSurvivorMatches = alertRewards.filter((x) => isLegendaryOrMythicSurvivor(x.itemId, x.rarity));
        if (alertSurvivorMatches.length) {
          totalSurvivors += alertSurvivorMatches.reduce((sum, x) => sum + x.quantity, 0);
          survivors.push(mission);
        }

        if (
          theaterId === Theaters.TwinePeaks &&
          mission.powerLevel === TheaterPowerLevels[Theaters.TwinePeaks].Endgame_Zone6
        ) {
          twinePeaks160.push(mission);
        }

        if (isVentureTheater(theaterId) && mission.powerLevel === TheaterPowerLevels.Ventures.Phoenix_Zone25) {
          ventures140.push(mission);
        }

        if (mission.alert) {
          if (theaterId === Theaters.Stonewood) stonewood.push(mission);
          else if (theaterId === Theaters.Plankerton) plankerton.push(mission);
          else if (theaterId === Theaters.CannyValley) cannyValley.push(mission);
          else if (theaterId === Theaters.TwinePeaks) twinePeaks.push(mission);
          else ventures.push(mission);
        }
      }
    }

    return {
      stonewood: sortMissions(stonewood),
      plankerton: sortMissions(plankerton),
      cannyValley: sortMissions(cannyValley),
      twinePeaks: sortMissions(twinePeaks),
      ventures: sortMissions(ventures),
      vbucks: sortMissions(vbucks),
      survivors: sortMissions(survivors),
      twinePeaks160,
      ventures140,
      upgradeLlamaTokens: sortMissions(upgradeLlamaTokens),
      perkUp: sortMissions(perkUp),
      totalVbucks,
      totalSurvivors,
      totalUpgradeLlamas,
      totalPerkUp
    };
  });

  function sortMissions(arr: ParsedWorldMission[]) {
    const order: Record<string, number> = {
      [Theaters.Stonewood]: 4,
      [Theaters.Plankerton]: 3,
      [Theaters.CannyValley]: 2,
      [Theaters.TwinePeaks]: 1,
      Ventures: 0
    };

    return arr.sort((a, b) => {
      const theaterA = order[a.theaterId] || order.Ventures;
      const theaterB = order[b.theaterId] || order.Ventures;
      return theaterA !== theaterB ? theaterA - theaterB : b.powerLevel - a.powerLevel;
    });
  }

  function isLegendaryOrMythicSurvivor(itemId: string, rarity?: string) {
    const isWorker = itemId.includes('workerbasic') || itemId.startsWith('Worker:manager');
    return isWorker && (rarity === 'sr' || rarity === 'ur');
  }

  function isVentureTheater(theaterId: string) {
    return (
      theaterId !== Theaters.Stonewood &&
      theaterId !== Theaters.Plankerton &&
      theaterId !== Theaters.CannyValley &&
      theaterId !== Theaters.TwinePeaks
    );
  }

  function matchesZoneFilter(theaterId: string, zones: Set<string>) {
    if (!zones.size) return true;

    const isVenture = isVentureTheater(theaterId);
    return zones.has('ventures') ? isVenture || zones.has(theaterId) : zones.has(theaterId);
  }

  function matchesMissionTypeFilter(generator: string, missionTypes: Set<string>) {
    if (!missionTypes.size) return true;

    return missionTypes.values().some((missionType) => {
      const keys = ZoneCategories[missionType as keyof typeof ZoneCategories];
      return keys?.some((key) => generator.includes(key));
    });
  }

  function matchesRewardFilter(allRewards: { itemId: string }[], rewards: Set<string>) {
    if (!rewards.size) return true;

    return rewards.values().some((key) => {
      const isManager = key === 'Manager';
      const isCommand = key === 'Defender' || key === 'Hero' || key === 'Worker' || key === 'Manager';
      const isArsenal = key === 'Melee' || key === 'Ranged' || key === 'Trap';

      return allRewards.some(({ itemId }) => {
        if (isManager) return itemId.startsWith('Worker:manager');
        if (isCommand) return itemId.startsWith(key);
        if (isArsenal) return itemId.includes(key);

        return itemId.toLowerCase().includes(key.toLowerCase());
      });
    });
  }

  function matchesRarityFilter(allRewards: { itemId: string; rarity?: RarityType }[], rarities: Set<string>) {
    if (!rarities.size) return true;

    const keys = ['currency_mtxswap', 'Worker', 'Hero', 'Defender', 'Schematic'];
    return allRewards.some((reward) => {
      if (!reward.rarity) return false;

      const { itemId, rarity } = reward;
      return rarities.has(rarity) && keys.some((key) => itemId.includes(key));
    });
  }

  async function refreshClaimedAlerts() {
    if (!$activeAccount) {
      weeklySuperchargerType = resolveWeeklySuperchargerType(null);
      return;
    }

    const accountId = $activeAccount.accountId;
    const campaignProfile = await queryProfile($activeAccount, 'campaign');
    weeklySuperchargerType = resolveWeeklySuperchargerType(campaignProfile);

    const attributes = campaignProfile.profileChanges[0].profile.stats.attributes;
    const doneMissionAlerts =
      attributes.mission_alert_redemption_record?.claimData?.map((claimData) => claimData.missionAlertId) || [];

    claimedAlerts.set(accountId, new SvelteSet(doneMissionAlerts));
  }

  async function refreshWorldInfo() {
    isRefreshing = true;
    loadError = false;
    worldInfoCache.set(new Map());

    try {
      await Promise.all([setWorldInfoCache(), refreshClaimedAlerts()]);
    } catch {
      loadError = true;
      toast.error($t('stwMissionAlerts.loadFailed'));
    } finally {
      isRefreshing = false;
    }
  }

  let weeklySuperchargerType = $state(resolveWeeklySuperchargerType(null));

  const weeklySuperchargerInfo = $derived(getWeeklySuperchargerInfo(weeklySuperchargerType, $t));

  $effect(() => {
    if (!$activeAccount) {
      weeklySuperchargerType = resolveWeeklySuperchargerType(null);
      return;
    }

    void refreshClaimedAlerts();
  });

  onMount(() => {
    if (!$worldInfoCache?.size) {
      refreshWorldInfo();
    }

    let utcDay = new Date().getUTCDate();
    let rotationRefreshPending = false;

    const intervalId = setInterval(() => {
      remainingTime = msUntilNextUtcMidnight();

      const currentDay = new Date().getUTCDate();
      if (currentDay !== utcDay && !rotationRefreshPending && !isRefreshing) {
        utcDay = currentDay;
        rotationRefreshPending = true;
        refreshWorldInfo().finally(() => {
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
      refreshWorldInfo();
    }
  }}
/>

<Tabs.Root value="overview">
  <PageContent
    center
    centerClass={HUD_PAGE_WIDTH}
    title={$t('stwMissionAlerts.page.title')}
  >
    {#snippet description()}
      <div class="flex flex-col gap-1">
        <p class="font-tagline text-sm text-muted-foreground">{$t('stwMissionAlerts.page.description')}</p>
        <p class="font-tagline text-sm text-muted-foreground">
          {$t('stwMissionAlerts.page.rotation', { time: formatRemainingDuration(remainingTime) })}
        </p>
      </div>
    {/snippet}

    {#snippet actions()}
      <PageActionButton
        disabled={isRefreshing}
        label={$t('stwMissionAlerts.refresh')}
        loading={isRefreshing}
        loadingText={$t('stwMissionAlerts.refreshing')}
        onclick={() => refreshWorldInfo()}
      >
        <RefreshCwIcon class="size-4" />
      </PageActionButton>
      <PageActionButton label={$t('stwMissionAlerts.filters.title')} onclick={() => (showFilters = true)}>
        <FunnelIcon class="size-4" />
        {#if activeFilterCount > 0}
          <span class="tabular-nums max-xs:hidden">({activeFilterCount})</span>
        {/if}
      </PageActionButton>
    {/snippet}

    <div class="border-b border-border/60 pb-4">
      <Tabs.List class="h-9 w-full shrink-0 sm:w-auto">
        <Tabs.Trigger value="overview">{$t('stwMissionAlerts.tabs.overview')}</Tabs.Trigger>
        <Tabs.Trigger disabled={!$worldInfoCache?.size} value="all">
          {$t('stwMissionAlerts.tabs.all')}
        </Tabs.Trigger>
      </Tabs.List>
    </div>

    <AlertsOverviewGrid
      loading={isRefreshing && !$worldInfoCache?.size}
      overview={filteredMissions
        ? {
            totalVbucks: filteredMissions.totalVbucks,
            totalSurvivors: filteredMissions.totalSurvivors,
            totalUpgradeLlamas: filteredMissions.totalUpgradeLlamas,
            totalPerkUp: filteredMissions.totalPerkUp
          }
        : null}
      weeklySuperchargerIcon={weeklySuperchargerInfo.icon}
      weeklySuperchargerLabel={weeklySuperchargerInfo.label}
    />

    <Tabs.Content class="space-y-10" value="overview">
      {#if loadError && !$worldInfoCache?.size}
        <p class="text-center text-sm text-destructive">{$t('stwMissionAlerts.loadFailed')}</p>
      {:else if isRefreshing && !$worldInfoCache?.size}
        <AlertsSectionSkeleton />
        <AlertsSectionSkeleton />
      {:else if $worldInfoCache?.size}
        {@const vbucks = filteredMissions?.vbucks || []}
        {@const survivors = filteredMissions?.survivors || []}
        {@const twine160 = filteredMissions?.twinePeaks160 || []}
        {@const ventures140 = filteredMissions?.ventures140 || []}
        {@const llamas = filteredMissions?.upgradeLlamaTokens || []}
        {@const perkUp = filteredMissions?.perkUp || []}
        <AlertsSection hideWhenEmpty missions={vbucks} title={sectionTitle($t('stwOverview.vbucks.today'), vbucks)} />
        <AlertsSection
          hideWhenEmpty
          missions={survivors}
          title={sectionTitle($t('stwMissionAlerts.sections.survivors'), survivors)}
        />
        <AlertsSection
          hideWhenEmpty
          missions={twine160}
          title={sectionTitle($t('stwMissionAlerts.sections.twinePeaksHigh', { level: 160 }), twine160)}
        />
        <AlertsSection
          hideWhenEmpty
          missions={ventures140}
          title={sectionTitle($t('stwMissionAlerts.sections.venturesHigh', { level: 140 }), ventures140)}
        />
        <AlertsSection
          hideWhenEmpty
          missions={llamas}
          title={sectionTitle($t('stwMissionAlerts.sections.upgradeLlamaTokens'), llamas)}
        />
        <AlertsSection
          hideWhenEmpty
          missions={perkUp}
          title={sectionTitle($t('stwMissionAlerts.sections.perkup'), perkUp)}
        />
      {:else}
        <AlertsSectionSkeleton />
        <AlertsSectionSkeleton />
      {/if}
    </Tabs.Content>

    <Tabs.Content class="space-y-10" value="all">
      {#if filteredMissions}
        {@const stonewood = filteredMissions.stonewood}
        {@const plankerton = filteredMissions.plankerton}
        {@const canny = filteredMissions.cannyValley}
        {@const twine = filteredMissions.twinePeaks}
        {@const ventures = filteredMissions.ventures}
        <AlertsSection
          missions={stonewood}
          title={sectionTitle($TheaterNames[Theaters.Stonewood], stonewood)}
        />
        <AlertsSection
          missions={plankerton}
          title={sectionTitle($TheaterNames[Theaters.Plankerton], plankerton)}
        />
        <AlertsSection
          missions={canny}
          title={sectionTitle($TheaterNames[Theaters.CannyValley], canny)}
        />
        <AlertsSection
          missions={twine}
          title={sectionTitle($TheaterNames[Theaters.TwinePeaks], twine)}
        />
        <AlertsSection
          missions={ventures}
          title={sectionTitle($t('stwMissionAlerts.sections.ventures'), ventures)}
        />
      {/if}
    </Tabs.Content>

    <FilterSheet bind:open={showFilters} />
  </PageContent>
</Tabs.Root>
