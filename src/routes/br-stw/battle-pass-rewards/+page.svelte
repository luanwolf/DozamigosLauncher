<script lang="ts" module>
  import type { BulkState } from '$types/account';
  import type { BattlePassAccountSnapshot } from '$lib/modules/battle-pass-claim';

  type PassState = BulkState<BattlePassAccountSnapshot & { error?: string }>;

  let selectedAccounts = $state<string[]>([]);
  let busy = $state(false);
  let results = $state<PassState[]>([]);
</script>

<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { t } from '$lib/i18n';
  import { claimBattlePassOffers, fetchBattlePassSnapshot } from '$lib/modules/battle-pass-claim';
  import { getAccountLabel, getAccountsFromSelection, handleError } from '$lib/utils';
  import PageContent from '$components/layout/PageContent.svelte';
  import AccountCombobox from '$components/ui/AccountCombobox.svelte';
  import AccountResultCard from '$components/ui/AccountResultCard.svelte';
  import { Button } from '$components/ui/button';
  import HudPanel from '$components/ui/hud/HudPanel.svelte';

  async function loadStatus() {
    busy = true;
    results = [];
    const accounts = getAccountsFromSelection(selectedAccounts);
    const next: PassState[] = [];

    await Promise.allSettled(
      accounts.map(async (account) => {
        try {
          const status = await fetchBattlePassSnapshot(account);
          next.push({
            accountId: account.accountId,
            displayName: getAccountLabel(account),
            data: status
          });
        } catch (error) {
          handleError({ error, message: 'Failed to load battle pass status', account, toastId: false });
          next.push({
            accountId: account.accountId,
            displayName: getAccountLabel(account),
            data: {
              level: 0,
              xp: 0,
              purchased: false,
              seasonNum: 0,
              battleStars: 0,
              seasonPassTemplateId: null,
              offers: [],
              error: error instanceof Error ? error.message : String(error)
            }
          });
        }
      })
    );

    results = next;
    busy = false;
  }

  async function claimOne(accountId: string, offerId: string) {
    const account = getAccountsFromSelection([accountId])[0];
    if (!account) return;

    busy = true;
    try {
      const prev = results.find((r) => r.accountId === accountId)?.data;
      const status = await claimBattlePassOffers(account, [offerId], prev?.seasonPassTemplateId);
      results = results.map((r) => (r.accountId === accountId ? { ...r, data: status } : r));
      toast.success($t('battlePassRewards.claimedToast', { count: 1 }));
    } catch (error) {
      handleError({
        error,
        message: $t('battlePassRewards.claimFailed'),
        account,
        toastId: true
      });
    }
    busy = false;
  }

  async function claimAllForAccount(accountId: string) {
    const account = getAccountsFromSelection([accountId])[0];
    const prev = results.find((r) => r.accountId === accountId)?.data;
    if (!account || !prev?.offers.length) return;

    busy = true;
    try {
      const ids = prev.offers.map((o) => o.offerId);
      const status = await claimBattlePassOffers(account, ids, prev.seasonPassTemplateId);
      results = results.map((r) => (r.accountId === accountId ? { ...r, data: status } : r));
      toast.success($t('battlePassRewards.claimedToast', { count: ids.length }));
    } catch (error) {
      handleError({
        error,
        message: $t('battlePassRewards.claimFailed'),
        account,
        toastId: true
      });
    }
    busy = false;
  }
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('battlePassRewards.page.description')}
  title={$t('battlePassRewards.page.title')}
>
  <AccountCombobox disabled={busy} type="multiple" bind:value={selectedAccounts} />

  <div class="flex flex-wrap gap-2">
    <Button
      disabled={busy || !selectedAccounts.length}
      loading={busy}
      loadingText={$t('battlePassRewards.loading')}
      onclick={loadStatus}
      type="button"
    >
      {$t('battlePassRewards.check')}
    </Button>
  </div>

  <HudPanel class="p-4 text-sm text-muted-foreground">
    {$t('battlePassRewards.hint')}
  </HudPanel>

  {#if results.length}
    <div class="space-y-3">
      {#each results as state (state.accountId)}
        <AccountResultCard accountId={state.accountId} displayName={state.displayName}>
          {#if state.data.error}
            <p class="text-sm text-destructive">{state.data.error}</p>
          {:else}
            <div class="space-y-3">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0 space-y-0.5">
                  <p class="text-sm font-medium">
                    {$t('battlePassRewards.level', { level: state.data.level })}
                    ·
                    {$t('battlePassRewards.season', { season: state.data.seasonNum })}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {state.data.purchased
                      ? $t('battlePassRewards.purchased')
                      : $t('battlePassRewards.freeTrack')}
                    ·
                    {$t('battlePassRewards.stars', { count: state.data.battleStars })}
                  </p>
                </div>
                {#if state.data.offers.length}
                  <Button
                    disabled={busy}
                    loading={busy}
                    onclick={() => claimAllForAccount(state.accountId)}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    {$t('battlePassRewards.claimAll')}
                  </Button>
                {/if}
              </div>

              {#if state.data.offers.length}
                <ul class="space-y-2">
                  {#each state.data.offers as offer (offer.offerId)}
                    <li
                      class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2"
                    >
                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium">{offer.title}</p>
                        <p class="text-xs text-muted-foreground">
                          {$t('battlePassRewards.offerPrice', { price: offer.price })}
                        </p>
                      </div>
                      <Button
                        disabled={busy || offer.price > state.data.battleStars}
                        loading={busy}
                        onclick={() => claimOne(state.accountId, offer.offerId)}
                        size="sm"
                        type="button"
                      >
                        {$t('battlePassRewards.claim')}
                      </Button>
                    </li>
                  {/each}
                </ul>
              {:else}
                <p class="text-sm text-muted-foreground">{$t('battlePassRewards.noOffers')}</p>
              {/if}
            </div>
          {/if}
        </AccountResultCard>
      {/each}
    </div>
  {/if}
</PageContent>
