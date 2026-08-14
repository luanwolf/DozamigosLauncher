<script lang="ts" module>
  import type { BulkState } from '$types/account';
  import type { DailyQuestData } from '$types/game/stw/resources';

  type DailyQuest = DailyQuestData & {
    id: string;
    templateKey: string;
    completionProgress: number;
  };

  type QuestState = BulkState<{
    hasFounder: boolean;
    quests: DailyQuest[];
    rerollsRemaining: number;
  }>;

  function loadFromStorage<T>(key: string, fallback: T): T {
    if (typeof localStorage === 'undefined') return fallback;
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  let isFetching = $state(false);
  let questState = $state<QuestState | null>(null);
  let rerolling = $state(false);
  let selectedForReroll = $state<Set<string>>(new Set());
  let autoReroll = $state(loadFromStorage<boolean>('autoReroll', false));
  let blacklist = $state(new Set<string>(loadFromStorage<string[]>('questBlacklist', [])));
  let showBlacklist = $state(false);
</script>

<script lang="ts">
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import { untrack } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { dailyQuests } from '$lib/data';
  import { language, t } from '$lib/i18n';
  import { logger } from '$lib/logger';
  import { clientQuestLogin, composeMCP } from '$lib/modules/mcp';
  import { accountStore } from '$lib/storage';
  import { activityLog } from '$lib/stores/activity-log';
  import { getErrorDetail, handleError } from '$lib/utils';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import PageActionButton from '$components/layout/PageActionButton.svelte';
  import PageContent from '$components/layout/PageContent.svelte';
  import AccountResultCard from '$components/ui/AccountResultCard.svelte';
  import HudPanel from '$components/ui/hud/HudPanel.svelte';
  import { Button } from '$components/ui/button';
  import { Label } from '$components/ui/label';
  import { Progress } from '$components/ui/progress';
  import { Switch } from '$components/ui/switch';
  import type { FullQueryProfile } from '$types/game/mcp';

  const activeAccount = accountStore.getActiveStore();

  const allQuestsSorted = $derived(
    Object.entries(dailyQuests)
      .map(([key, q]) => ({ key, name: q.names[$language] ?? q.names['pt-br'] }))
      .sort((a, b) => a.name.localeCompare(b.name))
  );

  function saveBlacklist() {
    localStorage.setItem('questBlacklist', JSON.stringify([...blacklist]));
  }

  function toggleBlacklistQuest(key: string) {
    if (blacklist.has(key)) {
      blacklist.delete(key);
    } else {
      blacklist.add(key);
    }
    blacklist = new Set(blacklist);
    saveBlacklist();
  }

  function clearBlacklist() {
    blacklist = new Set();
    saveBlacklist();
  }

  function selectAllBlacklist() {
    blacklist = new Set(Object.keys(dailyQuests));
    saveBlacklist();
  }

  function toggleAutoReroll() {
    autoReroll = !autoReroll;
    localStorage.setItem('autoReroll', String(autoReroll));
  }

  async function fetchDailyQuests() {
    const account = $activeAccount;
    if (!account) return;

    isFetching = true;
    questState = null;
    selectedForReroll = new Set();

    const state: QuestState = {
      accountId: account.accountId,
      displayName: account.displayName,
      data: { hasFounder: false, quests: [], rerollsRemaining: 0 }
    };

    try {
      const campaignProfile = await clientQuestLogin(account, 'campaign');
      handleQueryProfile(campaignProfile, state);
      if (state.data.quests.length) questState = state;
    } catch (error) {
      handleError({ error, message: 'Failed to fetch daily quests', account, toastId: false });
    }

    isFetching = false;

    if (autoReroll && questState && questState.data.rerollsRemaining > 0) {
      await rerollBlacklisted();
    }
  }

  function handleQueryProfile(queryProfile: FullQueryProfile<'campaign'>, state: QuestState) {
    const profile = queryProfile.profileChanges[0].profile;
    const items = profile.items;

    state.data.rerollsRemaining = profile.stats.attributes.quest_manager?.dailyQuestRerolls || 0;
    state.data.quests = [];
    state.data.hasFounder = Object.values(items).some((item) => item.templateId === 'Token:receivemtxcurrency');

    for (const [id, item] of Object.entries(items)) {
      if (!item.templateId.startsWith('Quest:') || item.attributes.quest_state !== 'Active') continue;
      const templateKey = item.templateId.split(':')[1].toLowerCase();
      const quest = dailyQuests[templateKey];
      if (!quest) continue;

      const completionKey = Object.keys(item.attributes).find((attr) => attr.includes('completion'))!;
      state.data.quests.push({
        id,
        templateKey,
        names: quest.names,
        completionProgress: item.attributes[completionKey] || 0,
        limit: quest.limit,
        rewards: quest.rewards
      });
    }

    const existingIds = new Set(state.data.quests.map((q) => q.id));
    selectedForReroll = new Set([...selectedForReroll].filter((id) => existingIds.has(id)));
    for (const quest of state.data.quests) {
      if (blacklist.has(quest.templateKey)) selectedForReroll.add(quest.id);
    }
    selectedForReroll = new Set(selectedForReroll);
  }

  async function rerollBlacklisted() {
    const account = $activeAccount;
    const state = questState;
    if (!account || !state) return;
    if (blacklist.size === 0) return;

    rerolling = true;

    const shouldReroll = (q: DailyQuest) => blacklist.has(q.templateKey);

    let rerolled = false;
    while (state.data.rerollsRemaining > 0) {
      const quest = state.data.quests.find(shouldReroll);
      if (!quest) break;

      const oldName = quest.names[$language] ?? quest.names['pt-br'];
      const previousIds = new Set(state.data.quests.map((q) => q.id));

      try {
        const response = await composeMCP<FullQueryProfile<'campaign'>>(
          account,
          'FortRerollDailyQuest',
          'campaign',
          { questId: quest.id }
        );
        handleQueryProfile(response, state);
        rerolled = true;

        const newQuest = state.data.quests.find((q) => !previousIds.has(q.id));
        const newName = newQuest ? (newQuest.names[$language] ?? newQuest.names['pt-br']) : '?';
        activityLog.add(
          'quest',
          $t('activityLog.questRerolledDetail', { old: oldName, new: newName }),
          account.displayName
        );
      } catch (error) {
        logger.warn('Failed to auto-reroll quest', { accountId: account.accountId, questId: quest.id, error });
        activityLog.add(
          'error',
          $t('activityLog.questError', { detail: getErrorDetail(error) }),
          account.displayName
        );
        break;
      }
    }

    rerolling = false;
    if (rerolled) {
      toast.success($t('dailyQuests.rerollDone'));
    }
  }

  function toggleQuestSelection(questId: string) {
    const sel = new Set(selectedForReroll);
    if (sel.has(questId)) sel.delete(questId);
    else sel.add(questId);
    selectedForReroll = sel;
  }

  async function rerollSelected() {
    const account = $activeAccount;
    const state = questState;
    if (!account || !state) return;

    const toReroll = [...selectedForReroll];
    if (!toReroll.length) return;

    rerolling = true;

    for (const questId of toReroll) {
      if (state.data.rerollsRemaining <= 0) break;
      try {
        const response = await composeMCP<FullQueryProfile<'campaign'>>(
          account,
          'FortRerollDailyQuest',
          'campaign',
          { questId }
        );
        handleQueryProfile(response, state);
      } catch (error) {
        logger.warn('Failed to reroll daily quest', { accountId: account.accountId, questId, error });
        activityLog.add(
          'error',
          $t('activityLog.questError', { detail: getErrorDetail(error) }),
          account.displayName
        );
      }
    }

    rerolling = false;
    toast.success($t('dailyQuests.rerollDone'));
    activityLog.add('quest', $t('activityLog.questsRerolled'), account.displayName);
  }

  $effect(() => {
    const account = $activeAccount;
    untrack(() => {
      questState = null;
      selectedForReroll = new Set();
    });

    if (account) {
      fetchDailyQuests();
    }
  });
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('dailyQuests.page.description')}
  title={$t('dailyQuests.page.title')}
>
  {#snippet actions()}
    <PageActionButton
      disabled={isFetching}
      label={$t('dailyQuests.getQuests')}
      loading={isFetching}
      loadingText={$t('dailyQuests.loading')}
      onclick={fetchDailyQuests}
      type="button"
    >
      <RefreshCwIcon class="size-4" />
    </PageActionButton>
  {/snippet}
  <HudPanel class="flex min-w-0 flex-col">
    <div class="divide-y divide-border/50">
      <div class="flex items-center justify-between gap-4 px-4 py-3">
        <div class="flex min-w-0 flex-col gap-0.5">
          <Label class="cursor-pointer font-medium" for="autoRerollToggle">
            {$t('dailyQuests.autoReroll')}
          </Label>
          <span class="text-xs text-muted-foreground">{$t('dailyQuests.autoRerollDescription')}</span>
        </div>
        <Switch id="autoRerollToggle" checked={autoReroll} onCheckedChange={toggleAutoReroll} />
      </div>

      <button
        class="flex w-full items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-muted/50"
        onclick={() => (showBlacklist = !showBlacklist)}
        type="button"
      >
        <span class="text-muted-foreground">
          {#if blacklist.size > 0}
            <span class="font-medium text-foreground">{$t('dailyQuests.blacklistCount', { count: blacklist.size })}</span>
            {$t('dailyQuests.configureBlacklist')}
          {:else}
            {$t('dailyQuests.blacklistEmpty')}
          {/if}
        </span>
        <ChevronDownIcon class="size-4 shrink-0 transition-transform {showBlacklist ? 'rotate-180' : ''}" />
      </button>

      {#if showBlacklist}
        <div class="space-y-3 p-4">
          <div class="flex justify-end gap-3">
            <Button size="sm" variant="outline" onclick={clearBlacklist} disabled={blacklist.size === 0}>
              {$t('dailyQuests.clearBlacklist')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onclick={selectAllBlacklist}
              disabled={blacklist.size === Object.keys(dailyQuests).length}
            >
              {$t('dailyQuests.selectAll')}
            </Button>
          </div>

          <div class="hud-list max-h-72 overflow-y-auto">
            {#each allQuestsSorted as quest (quest.key)}
              {@const checked = blacklist.has(quest.key)}
              <button
                class="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent/30
                  {checked ? 'bg-destructive/10 text-destructive' : ''}"
                onclick={() => toggleBlacklistQuest(quest.key)}
                type="button"
              >
                <span
                  class="flex size-4 shrink-0 items-center justify-center rounded border-2 transition-colors
                    {checked ? 'border-destructive bg-destructive text-destructive-foreground' : 'border-muted-foreground/40'}"
                >
                  {#if checked}
                    <svg class="size-3" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  {/if}
                </span>
                {quest.name}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </HudPanel>

  {#if !isFetching && questState}
    {@const state = questState}
    {@const rerollsLeft = state.data.rerollsRemaining}

    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <div class="flex items-center gap-1.5">
        <div class="size-2 rounded-full bg-destructive"></div>
        <span>{$t('dailyQuests.resultStatus.blacklisted')}</span>
      </div>

      <div class="flex items-center gap-1.5">
        <div class="size-2 rounded-full bg-primary"></div>
        <span>{$t('dailyQuests.resultStatus.selected')}</span>
      </div>
    </div>

    <AccountResultCard accountId={state.accountId} displayName={state.displayName}>
      {#snippet badge()}
        <span class="text-xs tabular-nums text-muted-foreground">
          {$t('dailyQuests.activeQuestCount', { count: state.data.quests.length })}
        </span>
      {/snippet}

      {#snippet actions()}
        {#if rerollsLeft > 0 && selectedForReroll.size > 0}
          <Button
            disabled={rerolling}
            loading={rerolling}
            loadingText={$t('dailyQuests.rerolling')}
            onclick={rerollSelected}
            size="sm"
            variant="default"
          >
            <RefreshCwIcon class="size-4" />
            {$t('dailyQuests.rerollSelected', { count: Math.min(selectedForReroll.size, rerollsLeft) })}
          </Button>
        {/if}
      {/snippet}

      <div class="space-y-3">
        {#if rerollsLeft > 0}
          <div class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2 text-sm">
            <span class="text-muted-foreground">
              {$t('dailyQuests.rerollsRemaining', { count: rerollsLeft })}
            </span>
          </div>
        {/if}

        <div class="grid grid-cols-1 gap-2">
          {#each state.data.quests as quest (quest.id)}
            {@const rewards = [
              { name: $t('stw.gold'), icon: '/resources/eventcurrency_scaling.png', amount: quest.rewards.gold },
              {
                name: state.data.hasFounder ? $t('vbucks') : $t('stw.xrayTickets'),
                icon: state.data.hasFounder ? '/resources/currency_mtxswap.png' : '/resources/currency_xrayllama.png',
                amount: quest.rewards.mtx
              },
              { name: $t('xp'), icon: '/misc/battle-royale-xp.png', amount: quest.rewards.xp }
            ]}
            {@const isSelected = selectedForReroll.has(quest.id)}
            {@const isBlacklisted = blacklist.has(quest.templateKey)}

            <div
              class="rounded-md border px-3 py-2.5 transition-colors
                {isBlacklisted ? 'border-destructive/50 bg-destructive/5' : isSelected ? 'border-primary bg-primary/5' : 'bg-muted/20'}"
            >
              <div class="flex items-start gap-2.5">
                {#if rerollsLeft > 0}
                  <button
                    class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border-2 transition-colors
                      {isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'}
                      disabled:opacity-50"
                    disabled={rerolling}
                    onclick={() => toggleQuestSelection(quest.id)}
                    type="button"
                  >
                    {#if isSelected}
                      <svg class="size-3" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    {/if}
                  </button>
                {/if}

                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <h3 class="text-sm leading-snug font-medium">{quest.names[$language]}</h3>
                    <span class="shrink-0 text-xs font-semibold tabular-nums">
                      {quest.completionProgress}/{quest.limit}
                    </span>
                  </div>

                  <Progress class="mt-2 h-1.5" value={(quest.completionProgress / quest.limit) * 100} />

                  <div class="mt-2 flex flex-wrap gap-2">
                    {#each rewards as reward (reward.name)}
                      {#if reward.amount > 0}
                        <div class="flex items-center gap-1.5 rounded-md bg-background/60 px-2 py-1">
                          <img class="size-3.5" alt={reward.name} src={reward.icon} />
                          <span class="text-xs font-medium tabular-nums">{reward.amount.toLocaleString($language)}</span>
                        </div>
                      {/if}
                    {/each}
                    {#if isBlacklisted}
                      <span class="rounded-md bg-destructive/10 px-2 py-1 text-[10px] font-semibold text-destructive uppercase">
                        auto
                      </span>
                    {/if}
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </AccountResultCard>
  {/if}
</PageContent>
