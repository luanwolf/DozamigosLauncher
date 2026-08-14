<script lang="ts">
  import { t } from '$lib/i18n';
  import type { MissionAlertsOverview } from '$lib/modules/mission-alerts-buckets';
  import AlertsOverviewItem from './AlertsOverviewItem.svelte';
  import HudPanel from '$components/ui/hud/HudPanel.svelte';

  type Props = {
    overview: MissionAlertsOverview | null;
    weeklySuperchargerIcon: string;
    weeklySuperchargerLabel: string;
    loading?: boolean;
  };

  const { overview, weeklySuperchargerIcon, weeklySuperchargerLabel, loading = false }: Props = $props();
</script>

<HudPanel flush bodyClass="p-0">
  <div class="hud-stat-grid">
    {#if loading}
      {#each Array(5) as _, index (index)}
        <div class="hud-stat-cell animate-pulse">
          <div class="size-10 shrink-0 rounded bg-muted"></div>
          <div class="min-w-0 flex-1 space-y-2">
            <div class="h-5 w-12 rounded bg-muted"></div>
            <div class="h-3 w-20 rounded bg-muted"></div>
          </div>
        </div>
      {/each}
    {:else}
      <AlertsOverviewItem
        icon="/resources/currency_mtxswap.png"
        value={$t('stwMissionAlerts.overview.vbucksToday', { count: overview?.totalVbucks ?? 0 })}
      />
      <AlertsOverviewItem
        amount={overview?.totalSurvivors ?? 0}
        icon="/resources/voucher_generic_worker_sr.png"
        name={$t('stwMissionAlerts.overview.survivors')}
      />
      <AlertsOverviewItem
        amount={overview?.totalUpgradeLlamas ?? 0}
        icon="/resources/voucher_cardpack_bronze.png"
        name={$t('stwMissionAlerts.overview.upgradeLlamas')}
      />
      <AlertsOverviewItem
        amount={overview?.totalPerkUp ?? 0}
        icon="/resources/reagent_alteration_upgrade_sr.png"
        name={$t('stwMissionAlerts.overview.perkup')}
      />
      <AlertsOverviewItem
        icon={weeklySuperchargerIcon}
        name={$t('stwMissionAlerts.overview.weeklySupercharger')}
        value={weeklySuperchargerLabel}
      />
    {/if}
  </div>
</HudPanel>
