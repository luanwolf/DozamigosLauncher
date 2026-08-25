<script lang="ts">
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { isFortniteApiConfigured } from '$lib/env';
  import { language, t } from '$lib/i18n';
  import { brStatsCache } from '$lib/modules/account-data';
  import type { BrModeStats } from '$lib/modules/br-stats-summary';
  import { accountStore } from '$lib/storage';
  import PageActionButton from '$components/layout/PageActionButton.svelte';
  import PageContent from '$components/layout/PageContent.svelte';
  import PageLoading from '$components/layout/PageLoading.svelte';
  import HudPanel from '$components/ui/hud/HudPanel.svelte';

  const activeAccount = accountStore.getActiveStore(true);

  const cached = $derived(brStatsCache.get($activeAccount));
  const stats = $derived(cached.data);
  const isLoading = $derived(cached.loading || cached.refreshing);
  const error = $derived(!!cached.error && !cached.data);

  function load(force = false) {
    if ($activeAccount) void brStatsCache.ensure($activeAccount, { force });
  }

  $effect(() => {
    if ($activeAccount?.accountId) load();
  });

  function formatMinutes(total: number) {
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    if (hours <= 0) return `${minutes} min`;
    return `${hours}h ${minutes}min`;
  }

  const modeRows = $derived.by(() => {
    if (!stats?.modes) return [];
    const rows: { id: 'solo' | 'duo' | 'squad'; data: BrModeStats }[] = [];
    if (stats.modes.solo) rows.push({ id: 'solo', data: stats.modes.solo });
    if (stats.modes.duo) rows.push({ id: 'duo', data: stats.modes.duo });
    if (stats.modes.squad) rows.push({ id: 'squad', data: stats.modes.squad });
    return rows;
  });
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('brStats.page.description')}
  title={$t('brStats.page.title')}
>
  {#snippet actions()}
    <PageActionButton
      disabled={isLoading || !$activeAccount}
      label={$t('brStats.refresh')}
      loading={isLoading}
      onclick={() => load(true)}
    >
      <RefreshCwIcon class="size-4" />
    </PageActionButton>
  {/snippet}

  {#if !$activeAccount}
    <p class="text-center text-sm text-muted-foreground">{$t('brStats.loginRequired')}</p>
  {:else if !isFortniteApiConfigured() && !stats && !isLoading}
    <p class="text-center text-sm text-muted-foreground">{$t('brStats.needsApiKey')}</p>
  {:else if error}
    <p class="text-center text-sm text-destructive">{$t('brStats.loadFailed')}</p>
  {:else if stats}
    <HudPanel class="p-4">
      <div class="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p class="text-lg font-semibold">{stats.displayName}</p>
          <p class="text-xs text-muted-foreground">
            {stats.source === 'fortnite-api' ? $t('brStats.sourceFn') : $t('brStats.sourceEpic')}
            {#if stats.battlePassLevel}
              · {$t('brStats.battlePass', { level: stats.battlePassLevel })}
            {/if}
          </p>
        </div>
        {#if stats.lastModified}
          <p class="text-xs text-muted-foreground">
            {$t('brStats.lastMatch')}: {new Date(stats.lastModified).toLocaleDateString($language)}
          </p>
        {/if}
      </div>

      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="surface-tile px-3 py-2">
          <p class="text-[11px] text-muted-foreground">{$t('brStats.wins')}</p>
          <p class="text-xl font-semibold tabular-nums">{stats.wins}</p>
        </div>
        <div class="surface-tile px-3 py-2">
          <p class="text-[11px] text-muted-foreground">{$t('brStats.kills')}</p>
          <p class="text-xl font-semibold tabular-nums">{stats.kills}</p>
        </div>
        <div class="surface-tile px-3 py-2">
          <p class="text-[11px] text-muted-foreground">{$t('brStats.kd')}</p>
          <p class="text-xl font-semibold tabular-nums">{stats.kd.toFixed(2)}</p>
        </div>
        <div class="surface-tile px-3 py-2">
          <p class="text-[11px] text-muted-foreground">{$t('brStats.matches')}</p>
          <p class="text-xl font-semibold tabular-nums">{stats.matches}</p>
        </div>
        <div class="surface-tile px-3 py-2">
          <p class="text-[11px] text-muted-foreground">{$t('brStats.winRate')}</p>
          <p class="text-xl font-semibold tabular-nums">{stats.winRate.toFixed(1)}%</p>
        </div>
        {#if stats.minutesPlayed}
          <div class="surface-tile px-3 py-2">
            <p class="text-[11px] text-muted-foreground">{$t('brStats.minutesPlayed')}</p>
            <p class="text-xl font-semibold tabular-nums">{formatMinutes(stats.minutesPlayed)}</p>
          </div>
        {/if}
        {#if stats.score}
          <div class="surface-tile px-3 py-2">
            <p class="text-[11px] text-muted-foreground">{$t('brStats.score')}</p>
            <p class="text-xl font-semibold tabular-nums">{stats.score.toLocaleString($language)}</p>
          </div>
        {/if}
        {#if stats.top10}
          <div class="surface-tile px-3 py-2">
            <p class="text-[11px] text-muted-foreground">{$t('brStats.top10')}</p>
            <p class="text-xl font-semibold tabular-nums">{stats.top10}</p>
          </div>
        {/if}
        {#if stats.playersOutlived}
          <div class="surface-tile px-3 py-2">
            <p class="text-[11px] text-muted-foreground">{$t('brStats.playersOutlived')}</p>
            <p class="text-xl font-semibold tabular-nums">{stats.playersOutlived.toLocaleString($language)}</p>
          </div>
        {/if}
      </div>
    </HudPanel>

    {#if modeRows.length}
      <HudPanel class="p-4" title={$t('brStats.modesTitle')}>
        <div class="grid gap-3 sm:grid-cols-3">
          {#each modeRows as row (row.id)}
            <div class="surface-tile space-y-1 px-3 py-2">
              <p class="text-sm font-semibold">{$t(`brStats.modes.${row.id}`)}</p>
              <p class="text-xs text-muted-foreground">
                {$t('brStats.wins')} {row.data.wins} · {$t('brStats.kills')} {row.data.kills}
              </p>
              <p class="text-xs text-muted-foreground">
                {$t('brStats.kd')} {row.data.kd.toFixed(2)} · {$t('brStats.winRate')} {row.data.winRate.toFixed(1)}%
              </p>
              <p class="text-xs text-muted-foreground">{$t('brStats.matches')} {row.data.matches}</p>
            </div>
          {/each}
        </div>
      </HudPanel>
    {/if}
  {:else if isLoading}
    <PageLoading label={$t('loading')} />
  {/if}
</PageContent>
