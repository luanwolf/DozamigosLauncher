<script lang="ts" module>
  import type { BulkState } from '$types/account';
  import type { VbucksBreakdown } from '$lib/utils';

  type VbucksState = BulkState<VbucksBreakdown | { error: string }>;

  let selectedAccounts = $state<string[]>([]);
  let isFetching = $state(false);
  let results = $state<VbucksState[]>([]);
</script>

<script lang="ts">
  import CoinsIcon from '@lucide/svelte/icons/coins';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { language, t } from '$lib/i18n';
  import { queryProfile } from '$lib/modules/mcp';
  import {
    getAccountLabel,
    getAccountsFromSelection,
    handleError,
    parseVbucksBreakdown
  } from '$lib/utils';
  import PageContent from '$components/layout/PageContent.svelte';
  import AccountCombobox from '$components/ui/AccountCombobox.svelte';
  import AccountResultCard from '$components/ui/AccountResultCard.svelte';
  import { Button } from '$components/ui/button';

  const total = $derived(
    results.reduce((sum, state) => ('error' in state.data ? sum : sum + state.data.total), 0)
  );

  async function loadVbucks() {
    isFetching = true;
    results = [];

    const accounts = getAccountsFromSelection(selectedAccounts);
    const next: VbucksState[] = [];

    await Promise.allSettled(
      accounts.map(async (account) => {
        try {
          const profile = await queryProfile(account, 'common_core');
          next.push({
            accountId: account.accountId,
            displayName: getAccountLabel(account),
            data: parseVbucksBreakdown(profile)
          });
        } catch (error) {
          handleError({ error, message: 'Failed to load V-Bucks', account, toastId: false });
          next.push({
            accountId: account.accountId,
            displayName: getAccountLabel(account),
            data: { error: $t('vbucksInformation.unknownError') }
          });
        }
      })
    );

    results = next.sort((a, b) => a.displayName.localeCompare(b.displayName, $language));
    isFetching = false;
  }
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('vbucksInformation.page.description')}
  title={$t('vbucksInformation.page.title')}
>
  <AccountCombobox disabled={isFetching} type="multiple" bind:value={selectedAccounts} />

  <Button
    class="w-full sm:w-auto sm:self-start"
    disabled={!selectedAccounts.length || isFetching}
    loading={isFetching}
    loadingText={$t('vbucksInformation.loading')}
    onclick={loadVbucks}
    type="button"
  >
    <CoinsIcon class="size-4" />
    {$t('vbucksInformation.getInformation')}
  </Button>

  {#if !isFetching && results.length}
    <div class="flex items-center justify-between rounded-none border border-border/70 bg-card px-3 py-2">
      <span class="text-sm text-muted-foreground">{$t('vbucksInformation.total')}</span>
      <span class="flex items-center gap-1.5 text-lg font-bold tabular-nums">
        <img class="size-5" alt="" src="/resources/currency_mtxswap.png" />
        {total.toLocaleString($language)}
      </span>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {#each results as state (state.accountId)}
        <AccountResultCard accountId={state.accountId} displayName={state.displayName}>
          {#if 'error' in state.data}
            <p class="text-sm text-destructive">{state.data.error}</p>
          {:else}
            <div class="space-y-1 text-sm">
              <p class="flex items-center gap-1.5 text-base font-bold tabular-nums">
                <img class="size-4" alt="" src="/resources/currency_mtxswap.png" />
                {state.data.total.toLocaleString($language)}
              </p>
              <p class="text-xs text-muted-foreground">
                {$t('vbucksInformation.purchased')}: {state.data.purchased.toLocaleString($language)}
              </p>
              <p class="text-xs text-muted-foreground">
                {$t('vbucksInformation.earned')}: {state.data.earned.toLocaleString($language)}
              </p>
              {#if state.data.other > 0}
                <p class="text-xs text-muted-foreground">
                  {$t('vbucksInformation.other')}: {state.data.other.toLocaleString($language)}
                </p>
              {/if}
            </div>
          {/if}
        </AccountResultCard>
      {/each}
    </div>
  {/if}
</PageContent>
