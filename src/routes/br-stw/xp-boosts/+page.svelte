<script lang="ts" module>
  import type { BulkState } from '$types/account';
  import type { XpBoostStack } from '$lib/modules/stw-xp-boosts';

  type BoostState = BulkState<{
    personal: number;
    teammate: number;
    stacks: XpBoostStack[];
    message?: string;
    error?: string;
  }>;

  let selectedAccounts = $state<string[]>([]);
  let amount = $state(1);
  let targetPlayer = $state('');
  let busy = $state(false);
  let results = $state<BoostState[]>([]);
</script>

<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { t } from '$lib/i18n';
  import { fetchUserByNameOrId } from '$lib/modules/lookup';
  import {
    activateXpBoost,
    fetchXpBoosts,
    preferredStack,
    type XpBoostKind
  } from '$lib/modules/stw-xp-boosts';
  import { getAccountLabel, getAccountsFromSelection, handleError } from '$lib/utils';
  import PageContent from '$components/layout/PageContent.svelte';
  import AccountCombobox from '$components/ui/AccountCombobox.svelte';
  import AccountResultCard from '$components/ui/AccountResultCard.svelte';
  import { Button } from '$components/ui/button';
  import { Input } from '$components/ui/input';
  import { Label } from '$components/ui/label';

  function summarize(stacks: XpBoostStack[]) {
    return {
      personal: stacks.filter((s) => s.kind === 'personal').reduce((n, s) => n + s.quantity, 0),
      teammate: stacks.filter((s) => s.kind === 'teammate').reduce((n, s) => n + s.quantity, 0),
      stacks
    };
  }

  async function loadBoosts() {
    busy = true;
    results = [];
    const accounts = getAccountsFromSelection(selectedAccounts);
    const next: BoostState[] = [];

    await Promise.allSettled(
      accounts.map(async (account) => {
        try {
          const stacks = await fetchXpBoosts(account);
          next.push({ accountId: account.accountId, displayName: getAccountLabel(account), data: summarize(stacks) });
        } catch (error) {
          handleError({ error, message: 'Failed to load XP boosts', account, toastId: false });
          next.push({
            accountId: account.accountId,
            displayName: getAccountLabel(account),
            data: { personal: 0, teammate: 0, stacks: [], error: error instanceof Error ? error.message : String(error) }
          });
        }
      })
    );

    results = next;
    busy = false;
  }

  async function consume(kind: XpBoostKind) {
    let targetAccountId: string | undefined;
    if (kind === 'teammate') {
      const accounts = getAccountsFromSelection(selectedAccounts);
      const lookupAccount = accounts[0];
      if (!lookupAccount) return;
      try {
        targetAccountId = (await fetchUserByNameOrId(lookupAccount, targetPlayer.trim())).accountId;
      } catch {
        toast.error($t('xpBoosts.playerNotFound'));
        return;
      }
    }

    busy = true;
    const accounts = getAccountsFromSelection(selectedAccounts);
    const next: BoostState[] = [];

    await Promise.allSettled(
      accounts.map(async (account) => {
        try {
          const stacks = await fetchXpBoosts(account);
          const stack = preferredStack(stacks, kind);
          if (!stack) {
            next.push({
              accountId: account.accountId,
              displayName: getAccountLabel(account),
              data: { ...summarize(stacks), error: $t('xpBoosts.noneAvailable') }
            });
            return;
          }

          const used = await activateXpBoost(account, stack, amount, targetAccountId);
          const refreshed = await fetchXpBoosts(account);
          next.push({
            accountId: account.accountId,
            displayName: getAccountLabel(account),
            data: { ...summarize(refreshed), message: $t('xpBoosts.used', { count: used }) }
          });
        } catch (error) {
          handleError({ error, message: 'Failed to activate XP boost', account, toastId: false });
          next.push({
            accountId: account.accountId,
            displayName: getAccountLabel(account),
            data: {
              personal: 0,
              teammate: 0,
              stacks: [],
              error: error instanceof Error ? error.message : String(error)
            }
          });
        }
      })
    );

    results = next;
    busy = false;
  }
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('xpBoosts.page.description')}
  title={$t('xpBoosts.page.title')}
>
  <AccountCombobox disabled={busy} type="multiple" bind:value={selectedAccounts} />

  <div class="grid gap-3 sm:grid-cols-2">
    <div class="space-y-2">
      <Label for="xp-amount">{$t('xpBoosts.amount')}</Label>
      <Input id="xp-amount" disabled={busy} min="1" type="number" bind:value={amount} />
    </div>
    <div class="space-y-2">
      <Label for="xp-target">{$t('xpBoosts.target')}</Label>
      <Input id="xp-target" disabled={busy} placeholder={$t('xpBoosts.targetPlaceholder')} bind:value={targetPlayer} />
    </div>
  </div>

  <div class="flex flex-wrap gap-2">
    <Button disabled={!selectedAccounts.length || busy} loading={busy} onclick={loadBoosts} variant="outline">
      {$t('xpBoosts.load')}
    </Button>
    <Button disabled={!selectedAccounts.length || busy} loading={busy} onclick={() => consume('personal')}>
      {$t('xpBoosts.usePersonal')}
    </Button>
    <Button
      disabled={!selectedAccounts.length || busy || !targetPlayer.trim()}
      loading={busy}
      onclick={() => consume('teammate')}
      variant="secondary"
    >
      {$t('xpBoosts.useTeammate')}
    </Button>
  </div>

  {#if results.length}
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {#each results as state (state.accountId)}
        <AccountResultCard accountId={state.accountId} displayName={state.displayName}>
          {#if state.data.error}
            <p class="text-sm text-destructive">{state.data.error}</p>
          {:else}
            <p class="text-sm">{$t('xpBoosts.personal')}: {state.data.personal}</p>
            <p class="text-sm">{$t('xpBoosts.teammate')}: {state.data.teammate}</p>
            {#if state.data.message}
              <p class="text-sm text-emerald-500">{state.data.message}</p>
            {/if}
          {/if}
        </AccountResultCard>
      {/each}
    </div>
  {/if}
</PageContent>
