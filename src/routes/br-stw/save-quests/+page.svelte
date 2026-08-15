<script lang="ts" module>
  import type { BulkState } from '$types/account';
  import type { StwQuestEntry } from '$lib/modules/stw-quests';

  type QuestState = BulkState<{
    save: StwQuestEntry[];
    pinned: string[];
    message?: string;
    error?: string;
  }>;

  let selectedAccounts = $state<string[]>([]);
  let autoPin = $state(false);
  let busy = $state(false);
  let results = $state<QuestState[]>([]);
</script>

<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { t } from '$lib/i18n';
  import {
    autoPinUrnAndMiniBoss,
    claimCompletedQuests,
    fetchCampaignQuests
  } from '$lib/modules/stw-quests';
  import { getAccountLabel, getAccountsFromSelection, handleError } from '$lib/utils';
  import PageContent from '$components/layout/PageContent.svelte';
  import AccountCombobox from '$components/ui/AccountCombobox.svelte';
  import AccountResultCard from '$components/ui/AccountResultCard.svelte';
  import { Button } from '$components/ui/button';
  import { Label } from '$components/ui/label';
  import { Switch } from '$components/ui/switch';

  async function loadQuests() {
    busy = true;
    results = [];
    const accounts = getAccountsFromSelection(selectedAccounts);
    const next: QuestState[] = [];

    await Promise.allSettled(
      accounts.map(async (account) => {
        try {
          if (autoPin) await autoPinUrnAndMiniBoss(account);
          const { quests, pinned } = await fetchCampaignQuests(account);
          next.push({
            accountId: account.accountId,
            displayName: getAccountLabel(account),
            data: {
              save: quests.filter((q) => q.bucket === 'save' || q.bucket === 'event'),
              pinned,
              message: autoPin ? $t('saveQuests.pinned') : undefined
            }
          });
        } catch (error) {
          handleError({ error, message: 'Failed to load save quests', account, toastId: false });
          next.push({
            accountId: account.accountId,
            displayName: getAccountLabel(account),
            data: { save: [], pinned: [], error: error instanceof Error ? error.message : String(error) }
          });
        }
      })
    );

    results = next;
    busy = false;
  }

  async function claimAll() {
    busy = true;
    const accounts = getAccountsFromSelection(selectedAccounts);
    const next: QuestState[] = [];

    await Promise.allSettled(
      accounts.map(async (account) => {
        try {
          const { quests, pinned } = await fetchCampaignQuests(account);
          const completed = quests.filter((q) => q.bucket === 'save' && q.state === 'Completed').map((q) => q.id);
          const claimed = await claimCompletedQuests(account, completed);
          const refreshed = await fetchCampaignQuests(account);
          next.push({
            accountId: account.accountId,
            displayName: getAccountLabel(account),
            data: {
              save: refreshed.quests.filter((q) => q.bucket === 'save' || q.bucket === 'event'),
              pinned,
              message: $t('saveQuests.claimed', { count: claimed })
            }
          });
        } catch (error) {
          handleError({ error, message: 'Failed to claim save quests', account, toastId: false });
          next.push({
            accountId: account.accountId,
            displayName: getAccountLabel(account),
            data: { save: [], pinned: [], error: error instanceof Error ? error.message : String(error) }
          });
        }
      })
    );

    results = next;
    busy = false;
    toast.success($t('saveQuests.claimed', { count: next.reduce((n, s) => n + (s.data.message ? 1 : 0), 0) }));
  }
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('saveQuests.page.description')}
  title={$t('saveQuests.page.title')}
>
  <AccountCombobox disabled={busy} type="multiple" bind:value={selectedAccounts} />

  <div class="flex items-center justify-between gap-3 rounded-none border border-border/70 px-3 py-2">
    <Label for="auto-pin">{$t('saveQuests.autoPin')}</Label>
    <Switch id="auto-pin" disabled={busy} bind:checked={autoPin} />
  </div>

  <div class="flex flex-wrap gap-2">
    <Button disabled={!selectedAccounts.length || busy} loading={busy} onclick={loadQuests}>
      {$t('saveQuests.load')}
    </Button>
    <Button disabled={!selectedAccounts.length || busy} loading={busy} onclick={claimAll} variant="secondary">
      {$t('saveQuests.claimCompleted')}
    </Button>
  </div>

  {#if results.length}
    <div class="space-y-3">
      {#each results as state (state.accountId)}
        <AccountResultCard accountId={state.accountId} displayName={state.displayName}>
          {#if state.data.error}
            <p class="text-sm text-destructive">{state.data.error}</p>
          {:else if !state.data.save.length}
            <p class="text-sm text-muted-foreground">{$t('saveQuests.empty')}</p>
          {:else}
            {#if state.data.message}
              <p class="mb-2 text-sm text-emerald-500">{state.data.message}</p>
            {/if}
            <ul class="space-y-1 text-xs">
              {#each state.data.save.slice(0, 12) as quest (quest.id)}
                <li class="truncate">
                  <span class="font-medium">{quest.state}</span>
                  · {quest.templateId.replace(/^Quest:/i, '')}
                  {#if quest.progressLabel}
                    <span class="text-muted-foreground">({quest.progressLabel})</span>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        </AccountResultCard>
      {/each}
    </div>
  {/if}
</PageContent>
