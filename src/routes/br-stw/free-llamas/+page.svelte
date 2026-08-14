<script lang="ts" module>
  import type { BulkState } from '$types/account';

  type LlamaState = BulkState<{
    opened: number;
    status: 'claimed' | 'none' | 'error';
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

  let isClaiming = $state(false);
  let llamaState = $state<LlamaState | null>(null);
  let autoClaim = $state(loadFromStorage<boolean>('autoClaimLlamas', false));
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { t } from '$lib/i18n';
  import { logger } from '$lib/logger';
  import { composeMCP } from '$lib/modules/mcp';
  import { accountStore } from '$lib/storage';
  import { activityLog } from '$lib/stores/activity-log';
  import { getErrorDetail, handleError } from '$lib/utils';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import PageContent from '$components/layout/PageContent.svelte';
  import AccountResultCard from '$components/ui/AccountResultCard.svelte';
  import { Button } from '$components/ui/button';
  import HudPanel from '$components/ui/hud/HudPanel.svelte';
  import { Label } from '$components/ui/label';
  import { Switch } from '$components/ui/switch';
  import type { FullQueryProfile } from '$types/game/mcp';

  const activeAccount = accountStore.getActiveStore();

  function toggleAutoClaim() {
    autoClaim = !autoClaim;
    localStorage.setItem('autoClaimLlamas', JSON.stringify(autoClaim));
  }

  async function claimLlamas() {
    const account = $activeAccount;
    if (!account) return;

    isClaiming = true;
    llamaState = null;

    const state: LlamaState = {
      accountId: account.accountId,
      displayName: account.displayName,
      data: { opened: 0, status: 'none' }
    };

    try {
      const populateResult = await composeMCP<FullQueryProfile<'campaign'>>(
        account,
        'PopulatePrerolledOffers',
        'campaign',
        {}
      );

      const profile = populateResult.profileChanges[0].profile;

      const cardPackIds = Object.entries(profile.items)
        .filter(([, item]) => item.templateId.startsWith('CardPack:'))
        .map(([id]) => id);

      if (cardPackIds.length > 0) {
        await composeMCP(account, 'OpenCardPackBatch', 'campaign', { cardPackItemIds: cardPackIds });
        state.data.opened = cardPackIds.length;
        state.data.status = 'claimed';
        activityLog.add('llama', $t('activityLog.llamasClaimed', { count: cardPackIds.length }), account.displayName);
      } else {
        state.data.status = 'none';
        activityLog.add('info', $t('activityLog.llamasNone'), account.displayName);
      }

      llamaState = state;
    } catch (error) {
      state.data.status = 'error';
      llamaState = state;
      logger.error('Failed to claim free llamas', { accountId: account.accountId, error });
      activityLog.add(
        'error',
        $t('activityLog.llamasError', { detail: getErrorDetail(error) }),
        account.displayName
      );
      handleError({ error, message: 'Failed to claim free llamas', account, toastId: false });
    }

    isClaiming = false;

    if (state.data.opened > 0) {
      toast.success($t('freeLlamas.claimed', { count: state.data.opened }));
    } else if (state.data.status === 'none') {
      toast.info($t('freeLlamas.noneAvailable'));
    }
  }

  $effect(() => {
    const account = $activeAccount;
    untrack(() => {
      llamaState = null;
    });

    if (!account) return;

    const ranAtStartup = sessionStorage.getItem('startupActionsRan') === 'true';
    if (autoClaim && !ranAtStartup) {
      claimLlamas();
    }
  });
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('freeLlamas.page.description')}
  title={$t('freeLlamas.page.title')}
>
  <HudPanel class="flex min-w-0 flex-col">
    <div class="divide-y divide-border/50 px-4">
      <div class="flex items-center justify-between gap-4 py-3">
        <div class="flex min-w-0 flex-col gap-0.5">
          <Label class="cursor-pointer font-medium" for="autoClaimToggle">
            {$t('freeLlamas.autoClaim')}
          </Label>
          <span class="text-xs text-muted-foreground">{$t('freeLlamas.autoClaimDescription')}</span>
        </div>
        <Switch id="autoClaimToggle" checked={autoClaim} onCheckedChange={toggleAutoClaim} />
      </div>
    </div>
  </HudPanel>

  <Button
    class="w-full sm:w-auto sm:self-start"
    disabled={isClaiming}
    loading={isClaiming}
    loadingText={$t('freeLlamas.claiming')}
    onclick={claimLlamas}
    type="submit"
  >
    {$t('freeLlamas.claim')}
  </Button>

  {#if !isClaiming && llamaState}
    {@const state = llamaState}

    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <div class="flex items-center gap-1.5">
        <div class="size-2 rounded-full bg-green-500"></div>
        <span>{$t('freeLlamas.resultStatus.claimed')}</span>
      </div>

      <div class="flex items-center gap-1.5">
        <div class="size-2 rounded-full bg-gray-500"></div>
        <span>{$t('freeLlamas.resultStatus.none')}</span>
      </div>

      <div class="flex items-center gap-1.5">
        <div class="size-2 rounded-full bg-red-500"></div>
        <span>{$t('freeLlamas.resultStatus.error')}</span>
      </div>
    </div>

    <AccountResultCard accountId={state.accountId} displayName={state.displayName}>
      {#snippet badge()}
        {#if state.data.status === 'claimed'}
          <span class="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-500 uppercase">
            {$t('freeLlamas.resultStatus.claimed')}
          </span>
        {:else if state.data.status === 'none'}
          <span class="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
            {$t('freeLlamas.resultStatus.none')}
          </span>
        {:else}
          <span class="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive uppercase">
            {$t('freeLlamas.resultStatus.error')}
          </span>
        {/if}
      {/snippet}

      <div class="flex items-center gap-4">
        <img
          class="size-16 shrink-0 drop-shadow-sm"
          alt="Llama"
          src="/resources/voucher_cardpack_jackpot.png"
        />
        <div class="min-w-0 flex-1">
          {#if state.data.status === 'claimed'}
            <p class="text-2xl leading-none font-bold tabular-nums text-green-500">
              {state.data.opened}
            </p>
            <p class="mt-1 text-sm font-medium">{$t('freeLlamas.openedCount', { count: state.data.opened })}</p>
          {:else if state.data.status === 'none'}
            <p class="text-sm text-muted-foreground">{$t('freeLlamas.noneAvailable')}</p>
          {:else}
            <p class="text-sm text-destructive">{$t('freeLlamas.claimError')}</p>
          {/if}
        </div>
      </div>
    </AccountResultCard>
  {/if}
</PageContent>
