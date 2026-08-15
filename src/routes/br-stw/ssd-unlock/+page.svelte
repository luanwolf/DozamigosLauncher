<script lang="ts" module>
  import type { BulkState } from '$types/account';
  import type { StwQuestEntry } from '$lib/modules/stw-quests';

  type SsdState = BulkState<{ items: StwQuestEntry[]; message?: string; error?: string }>;

  let selectedAccounts = $state<string[]>([]);
  let busy = $state(false);
  let results = $state<SsdState[]>([]);
  let confirmOpen = $state(false);
</script>

<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { t } from '$lib/i18n';
  import { claimCompletedQuests, fetchCampaignQuests, listClaimableSsdRewards } from '$lib/modules/stw-quests';
  import { getAccountLabel, getAccountsFromSelection, handleError } from '$lib/utils';
  import PageContent from '$components/layout/PageContent.svelte';
  import AccountCombobox from '$components/ui/AccountCombobox.svelte';
  import AccountResultCard from '$components/ui/AccountResultCard.svelte';
  import { Button, buttonVariants } from '$components/ui/button';
  import * as Dialog from '$components/ui/dialog';

  const pendingCount = $derived(results.reduce((n, state) => n + state.data.items.length, 0));

  async function loadRewards() {
    busy = true;
    results = [];
    const accounts = getAccountsFromSelection(selectedAccounts);
    const next: SsdState[] = [];

    await Promise.allSettled(
      accounts.map(async (account) => {
        try {
          const { quests } = await fetchCampaignQuests(account);
          next.push({
            accountId: account.accountId,
            displayName: getAccountLabel(account),
            data: { items: listClaimableSsdRewards(quests) }
          });
        } catch (error) {
          handleError({ error, message: 'Failed to load SSD rewards', account, toastId: false });
          next.push({
            accountId: account.accountId,
            displayName: getAccountLabel(account),
            data: { items: [], error: error instanceof Error ? error.message : String(error) }
          });
        }
      })
    );

    results = next;
    busy = false;
  }

  async function unlock() {
    confirmOpen = false;
    busy = true;
    const next: SsdState[] = [];

    await Promise.allSettled(
      results.map(async (state) => {
        const account = getAccountsFromSelection([state.accountId])[0];
        if (!account) return;
        try {
          const claimed = await claimCompletedQuests(
            account,
            state.data.items.map((item) => item.id)
          );
          next.push({
            ...state,
            data: { items: [], message: $t('ssdUnlock.done', { count: claimed }) }
          });
        } catch (error) {
          handleError({ error, message: 'Failed to unlock SSD rewards', account, toastId: false });
          next.push({
            ...state,
            data: {
              items: state.data.items,
              error: error instanceof Error ? error.message : String(error)
            }
          });
        }
      })
    );

    results = next;
    busy = false;
    toast.success($t('ssdUnlock.done', { count: next.reduce((n, s) => n + (s.data.message ? 1 : 0), 0) }));
  }
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('ssdUnlock.page.description')}
  title={$t('ssdUnlock.page.title')}
>
  <AccountCombobox disabled={busy} type="multiple" bind:value={selectedAccounts} />

  <div class="flex flex-wrap gap-2">
    <Button disabled={!selectedAccounts.length || busy} loading={busy} onclick={loadRewards}>
      {$t('ssdUnlock.load')}
    </Button>
    <Button disabled={!pendingCount || busy} onclick={() => (confirmOpen = true)} variant="destructive">
      {$t('ssdUnlock.unlock')}
    </Button>
  </div>

  {#if results.length}
    <div class="space-y-3">
      {#each results as state (state.accountId)}
        <AccountResultCard accountId={state.accountId} displayName={state.displayName}>
          {#if state.data.error}
            <p class="text-sm text-destructive">{state.data.error}</p>
          {:else if state.data.message}
            <p class="text-sm text-emerald-500">{state.data.message}</p>
          {:else if !state.data.items.length}
            <p class="text-sm text-muted-foreground">{$t('ssdUnlock.empty')}</p>
          {:else}
            <ul class="space-y-1 text-xs">
              {#each state.data.items as item (item.id)}
                <li class="truncate">{item.templateId.replace(/^Quest:/i, '')}</li>
              {/each}
            </ul>
          {/if}
        </AccountResultCard>
      {/each}
    </div>
  {/if}
</PageContent>

<Dialog.Root bind:open={confirmOpen}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title>{$t('ssdUnlock.warningTitle')}</Dialog.Title>
      <Dialog.Description>{$t('ssdUnlock.warning')}</Dialog.Description>
    </Dialog.Header>
    <p class="text-sm text-muted-foreground">{$t('ssdUnlock.unlock')}: {pendingCount}</p>
    <Dialog.Footer>
      <Dialog.Close class={buttonVariants({ variant: 'outline' })}>{$t('stwStore.purchaseDialog.cancel')}</Dialog.Close>
      <Button onclick={unlock} variant="destructive">{$t('ssdUnlock.confirm')}</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
