<script lang="ts">
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { isFortniteApiConfigured } from '$lib/env';
  import { t } from '$lib/i18n';
  import { brStatsCache } from '$lib/modules/account-data';
  import { accountStore } from '$lib/storage';
  import PageActionButton from '$components/layout/PageActionButton.svelte';
  import PageContent from '$components/layout/PageContent.svelte';
  import PageLoading from '$components/layout/PageLoading.svelte';
  import HudPanel from '$components/ui/hud/HudPanel.svelte';
  import { Button } from '$components/ui/button';

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
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p class="text-lg font-semibold">{stats.displayName}</p>
          <p class="text-xs text-muted-foreground">
            {stats.source === 'fortnite-api' ? $t('brStats.sourceFn') : $t('brStats.sourceEpic')}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onclick={() => openUrl(`https://fortnitedb.com/profile/${stats!.accountId}`)}
        >
          FortniteDB
        </Button>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
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
      </div>
    </HudPanel>
  {:else if isLoading}
    <PageLoading label={$t('loading')} />
  {/if}
</PageContent>
