<script lang="ts">
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
  import { toast } from 'svelte-sonner';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { language, t } from '$lib/i18n';
  import { fetchAccountOverview, type AccountOverview } from '$lib/modules/account-overview';
  import { claimMfaReward } from '$lib/modules/mfa-claim';
  import { accountStore } from '$lib/storage';
  import { handleError } from '$lib/utils';
  import PageActionButton from '$components/layout/PageActionButton.svelte';
  import PageContent from '$components/layout/PageContent.svelte';
  import PageLoading from '$components/layout/PageLoading.svelte';
  import { Button } from '$components/ui/button';
  import HudPanel from '$components/ui/hud/HudPanel.svelte';
  import * as Tabs from '$components/ui/tabs';

  const activeAccount = accountStore.getActiveStore(true);

  let overview = $state<AccountOverview | null>(null);
  let isLoading = $state(false);
  let claiming = $state<'br' | 'stw' | null>(null);
  let tab = $state('br');

  const fmt = $derived(new Intl.NumberFormat($language));

  async function load(force = false) {
    if (!$activeAccount) {
      overview = null;
      return;
    }
    if (isLoading && !force) return;
    isLoading = true;
    try {
      overview = await fetchAccountOverview($activeAccount);
    } catch (error) {
      handleError({ error, message: $t('accountOverview.loadFailed'), account: $activeAccount });
      overview = null;
    } finally {
      isLoading = false;
    }
  }

  async function claimMfa(target: 'br' | 'stw') {
    if (!$activeAccount || claiming) return;
    claiming = target;
    try {
      await claimMfaReward($activeAccount, target);
      toast.success($t(target === 'br' ? 'accountOverview.mfa.claimedBr' : 'accountOverview.mfa.claimedStw'));
      await load(true);
    } catch (error) {
      handleError({
        error,
        message: $t('accountOverview.mfa.failed'),
        account: $activeAccount
      });
    } finally {
      claiming = null;
    }
  }

  $effect(() => {
    if ($activeAccount?.accountId) void load();
  });
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('accountOverview.page.description')}
  title={$t('accountOverview.page.title')}
>
  {#snippet actions()}
    <PageActionButton
      disabled={isLoading || !$activeAccount}
      label={$t('accountOverview.refresh')}
      loading={isLoading}
      onclick={() => load(true)}
    >
      <RefreshCwIcon class="size-4" />
    </PageActionButton>
  {/snippet}

  {#if !$activeAccount}
    <p class="text-center text-sm text-muted-foreground">{$t('sidebar.loginRequired')}</p>
  {:else if isLoading && !overview}
    <PageLoading label={$t('loading')} />
  {:else if overview}
    <Tabs.Root bind:value={tab}>
      <Tabs.List class="w-full">
        <Tabs.Trigger class="flex-1" value="br">{$t('accountOverview.tabs.br')}</Tabs.Trigger>
        <Tabs.Trigger class="flex-1" value="stw">{$t('accountOverview.tabs.stw')}</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content class="mt-4 space-y-4" value="br">
        <HudPanel title={$t('accountOverview.br.title')}>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div class="surface-tile px-3 py-2">
              <p class="text-[11px] text-muted-foreground">{$t('accountOverview.br.accountLevel')}</p>
              <p class="text-xl font-semibold tabular-nums">{fmt.format(overview.br.accountLevel)}</p>
            </div>
            <div class="surface-tile px-3 py-2">
              <p class="text-[11px] text-muted-foreground">
                {$t('accountOverview.br.season', { season: overview.br.seasonNumber })}
              </p>
              <p class="text-xl font-semibold tabular-nums">
                {overview.br.battlePassOwned
                  ? $t('accountOverview.br.battlePass')
                  : $t('accountOverview.br.freePass')}
                {overview.br.battlePassLevel}
              </p>
            </div>
            <div class="surface-tile px-3 py-2">
              <p class="text-[11px] text-muted-foreground">{$t('accountOverview.br.battleStars')}</p>
              <p class="text-xl font-semibold tabular-nums">{fmt.format(overview.br.battleStars)}</p>
            </div>
            <div class="surface-tile px-3 py-2">
              <p class="text-[11px] text-muted-foreground">{$t('accountOverview.br.gold')}</p>
              <p class="text-xl font-semibold tabular-nums">{fmt.format(overview.br.gold)}</p>
            </div>
            <div class="surface-tile col-span-2 px-3 py-2 sm:col-span-2">
              <p class="text-[11px] text-muted-foreground">{$t('accountOverview.br.supercharged')}</p>
              <p class="text-sm tabular-nums">
                {$t('accountOverview.br.superchargedValue', {
                  xp: fmt.format(overview.br.restedXp),
                  mult: overview.br.restedXpMult
                })}
              </p>
            </div>
          </div>
          {#if overview.br.lastMatchEnd}
            <p class="mt-3 text-xs text-muted-foreground">
              {$t('accountOverview.br.lastMatch')}:
              {new Date(overview.br.lastMatchEnd).toLocaleString($language)}
            </p>
          {/if}
        </HudPanel>
      </Tabs.Content>

      <Tabs.Content class="mt-4 space-y-4" value="stw">
        {#if !overview.stw}
          <p class="text-sm text-muted-foreground">{$t('accountOverview.stw.unavailable')}</p>
        {:else}
          <HudPanel
            title={`[${overview.stw.powerLevel.toFixed(1)}] ${$t('accountOverview.stw.title')}`}
          >
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div class="surface-tile px-3 py-2">
                <p class="text-[11px] text-muted-foreground">{$t('accountOverview.stw.accountLevel')}</p>
                <p class="text-xl font-semibold tabular-nums">{fmt.format(overview.stw.accountLevel)}</p>
              </div>
              <div class="surface-tile px-3 py-2">
                <p class="text-[11px] text-muted-foreground">{$t('accountOverview.stw.backpack')}</p>
                <p class="text-xl font-semibold tabular-nums">{overview.stw.backpackSize}</p>
              </div>
              <div class="surface-tile px-3 py-2">
                <p class="text-[11px] text-muted-foreground">{$t('accountOverview.stw.storage')}</p>
                <p class="text-xl font-semibold tabular-nums">{overview.stw.storageSize}</p>
              </div>
              <div class="surface-tile px-3 py-2">
                <p class="text-[11px] text-muted-foreground">{$t('accountOverview.stw.zones')}</p>
                <p class="text-xl font-semibold tabular-nums">{fmt.format(overview.stw.matchesPlayed)}</p>
              </div>
              <div class="surface-tile px-3 py-2">
                <p class="text-[11px] text-muted-foreground">{$t('accountOverview.stw.collectionBook')}</p>
                <p class="text-xl font-semibold tabular-nums">{fmt.format(overview.stw.collectionBookLevel)}</p>
              </div>
              <div class="surface-tile px-3 py-2">
                <p class="text-[11px] text-muted-foreground">{$t('accountOverview.stw.researchPoints')}</p>
                <p class="text-xl font-semibold tabular-nums">{fmt.format(overview.stw.researchPoints)}</p>
              </div>
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <div class="surface-tile px-3 py-2">
                <p class="mb-1 text-[11px] text-muted-foreground">{$t('accountOverview.stw.fort')}</p>
                <p class="text-sm tabular-nums">
                  F {overview.stw.fort.fortitude} · O {overview.stw.fort.offense} · R
                  {overview.stw.fort.resistance} · T {overview.stw.fort.tech}
                </p>
              </div>
              <div class="surface-tile px-3 py-2">
                <p class="mb-1 text-[11px] text-muted-foreground">{$t('accountOverview.stw.research')}</p>
                <p class="text-sm tabular-nums">
                  F {overview.stw.researchLevels.fortitude} · O {overview.stw.researchLevels.offense} · R
                  {overview.stw.researchLevels.resistance} · T {overview.stw.researchLevels.technology}
                </p>
              </div>
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <div class="surface-tile px-3 py-2">
                <p class="mb-1 text-[11px] text-muted-foreground">{$t('accountOverview.stw.ssd')}</p>
                {#each Object.entries(overview.stw.stormShields) as [name, level] (name)}
                  <p class="text-xs tabular-nums">{name}: {level}</p>
                {/each}
              </div>
              <div class="surface-tile px-3 py-2">
                <p class="mb-1 text-[11px] text-muted-foreground">{$t('accountOverview.stw.endurance')}</p>
                {#each Object.entries(overview.stw.endurance) as [name, when] (name)}
                  <p class="text-xs">
                    {name}:
                    {when
                      ? new Date(when).toLocaleDateString($language)
                      : $t('accountOverview.stw.enduranceMissing')}
                  </p>
                {/each}
              </div>
            </div>
          </HudPanel>
        {/if}
      </Tabs.Content>
    </Tabs.Root>

    <HudPanel title={$t('accountOverview.mfa.title')}>
      <p class="mb-3 text-sm text-muted-foreground">{$t('accountOverview.mfa.description')}</p>
      <div class="flex flex-wrap gap-2">
        <Button
          disabled={claiming !== null || overview.br.mfaClaimed || !overview.mfaEnabled}
          loading={claiming === 'br'}
          onclick={() => claimMfa('br')}
          variant="outline"
        >
          <ShieldCheckIcon class="size-4" />
          {overview.br.mfaClaimed
            ? $t('accountOverview.mfa.alreadyBr')
            : $t('accountOverview.mfa.claimBr')}
        </Button>
        <Button
          disabled={
            claiming !== null ||
            !!overview.stw?.mfaClaimed ||
            !overview.mfaEnabled ||
            !overview.stw?.hasCampaignAccess
          }
          loading={claiming === 'stw'}
          onclick={() => claimMfa('stw')}
          variant="outline"
        >
          <ShieldCheckIcon class="size-4" />
          {overview.stw?.mfaClaimed
            ? $t('accountOverview.mfa.alreadyStw')
            : $t('accountOverview.mfa.claimStw')}
        </Button>
      </div>
      {#if !overview.mfaEnabled}
        <p class="mt-2 text-xs text-destructive">{$t('accountOverview.mfa.need2fa')}</p>
      {/if}
    </HudPanel>
  {/if}
</PageContent>
