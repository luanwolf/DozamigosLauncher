<script lang="ts" module>
  import type { BulkState } from '$types/account';

  type XPState = BulkState<{
    battleRoyale: number;
    creative: number;
    saveTheWorld: number;
  }>;

  let isFetching = $state(false);
  let xpState = $state<XPState | null>(null);
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import { language, t } from '$lib/i18n';
  import { queryProfile } from '$lib/modules/mcp';
  import { accountStore } from '$lib/storage';
  import { handleError } from '$lib/utils';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import PageContent from '$components/layout/PageContent.svelte';
  import AccountResultCard from '$components/ui/AccountResultCard.svelte';
  import { Button } from '$components/ui/button';
  import { Progress } from '$components/ui/progress';

  const activeAccount = accountStore.getActiveStore();

  async function fetchXPData() {
    const account = $activeAccount;
    if (!account) return;

    isFetching = true;
    xpState = null;

    const state: XPState = {
      accountId: account.accountId,
      displayName: account.displayName,
      data: { battleRoyale: 0, saveTheWorld: 0, creative: 0 }
    };

    const [athena, campaign] = await Promise.allSettled([
      queryProfile(account, 'athena'),
      queryProfile(account, 'campaign')
    ]);

    if (athena.status === 'fulfilled') {
      const attributes = athena.value.profileChanges[0].profile.stats.attributes;
      state.data.creative = attributes.creative_dynamic_xp?.currentWeekXp || 0;
      state.data.battleRoyale = attributes.playtime_xp?.currentWeekXp || 0;
    } else {
      handleError({ error: athena.reason, message: 'Failed to fetch Athena profile', account, toastId: false });
    }

    if (campaign.status === 'fulfilled') {
      const items = Object.values(campaign.value.profileChanges[0].profile.items);
      const xpItem = items.find((item) => item.templateId === 'Token:stw_accolade_tracker');
      if (xpItem) {
        state.data.saveTheWorld = xpItem.attributes?.weekly_xp || 0;
      }
    } else {
      handleError({ error: campaign.reason, message: 'Failed to fetch Campaign profile', account, toastId: false });
    }

    xpState = state;
    isFetching = false;
  }

  function getNextDayOfWeek(dayIndex: number, hours = 0) {
    const now = new Date();
    const currentDay = now.getDay();
    const daysUntilTarget = (7 + dayIndex - currentDay) % 7;

    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const nextDay = new Date();
    nextDay.setUTCDate(now.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
    nextDay.setUTCHours(hours, 0, 0, 0);

    return nextDay;
  }

  $effect(() => {
    const account = $activeAccount;
    untrack(() => {
      xpState = null;
    });

    if (account) {
      fetchXPData();
    }
  });
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('earnedXP.page.description')}
  title={$t('earnedXP.page.title')}
>
  <Button
    class="w-full sm:w-auto sm:self-start"
    disabled={isFetching}
    loading={isFetching}
    loadingText={$t('earnedXP.loading')}
    onclick={fetchXPData}
    type="button"
  >
    {$t('earnedXP.check')}
  </Button>

  {#if !isFetching && xpState}
    {@const gamemodes = [
      {
        id: 'battleRoyale',
        name: $t('gameModes.battleRoyale'),
        value: xpState.data.battleRoyale || 0,
        limit: 4_000_000
      },
      {
        id: 'creative',
        name: $t('gameModes.creative'),
        value: xpState.data.creative || 0,
        limit: 4_000_000
      },
      {
        id: 'saveTheWorld',
        name: $t('gameModes.saveTheWorld'),
        value: xpState.data.saveTheWorld || 0,
        limit: 3_400_000
      }
    ]}

    <AccountResultCard accountId={xpState.accountId} displayName={xpState.displayName}>
      <div class="space-y-4">
        {#each gamemodes as gamemode (gamemode.id)}
          {@const resetDate = gamemode.id === 'saveTheWorld' ? getNextDayOfWeek(4, 0) : getNextDayOfWeek(0, 13)}
          {@const percent = (gamemode.value / gamemode.limit) * 100}

          <div class="space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <div class="flex min-w-0 items-center gap-1.5">
                <img class="size-4 shrink-0" alt="XP" src="/misc/battle-royale-xp.png" />
                <span class="truncate text-sm font-medium">{gamemode.name}</span>
              </div>

              <div class="shrink-0 text-right text-xs tabular-nums">
                <span class="font-semibold">{gamemode.value.toLocaleString($language)}</span>
                <span class="text-muted-foreground">
                  / {new Intl.NumberFormat($language, {
                    notation: 'compact',
                    compactDisplay: 'short'
                  }).format(gamemode.limit)}
                </span>
              </div>
            </div>

            <Progress class="h-2" value={percent} />

            <p class="text-[11px] text-muted-foreground">
              {$t('earnedXP.resetsAt', { time: resetDate.toLocaleString($language) })}
            </p>
          </div>
        {/each}
      </div>
    </AccountResultCard>
  {/if}
</PageContent>
