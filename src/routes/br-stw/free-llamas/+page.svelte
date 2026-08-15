<script lang="ts" module>
  import type { BulkState } from '$types/account';
  import {
    readAutoLlamaPrefs,
    writeAutoLlamaPrefs,
    type AutoLlamaCurrency,
    type AutoLlamaPrefs
  } from '$lib/modules/stw-auto-llama';

  type LlamaState = BulkState<{
    opened: number;
    bought: number;
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
  let prefs = $state<AutoLlamaPrefs>(readAutoLlamaPrefs());
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { t } from '$lib/i18n';
  import { logger } from '$lib/logger';
  import { claimFreeAndOptionalSurvivorBuys } from '$lib/modules/stw-auto-llama';
  import { accountStore } from '$lib/storage';
  import { activityLog } from '$lib/stores/activity-log';
  import { getAccountLabel, getErrorDetail, handleError } from '$lib/utils';
  import PageContent from '$components/layout/PageContent.svelte';
  import AccountResultCard from '$components/ui/AccountResultCard.svelte';
  import { Button } from '$components/ui/button';
  import HudPanel from '$components/ui/hud/HudPanel.svelte';
  import { Input } from '$components/ui/input';
  import { Label } from '$components/ui/label';
  import { Switch } from '$components/ui/switch';

  const activeAccount = accountStore.getActiveStore();

  function toggleAutoClaim() {
    autoClaim = !autoClaim;
    localStorage.setItem('autoClaimLlamas', JSON.stringify(autoClaim));
  }

  function persistPrefs(patch: Partial<AutoLlamaPrefs>) {
    prefs = { ...prefs, ...patch };
    writeAutoLlamaPrefs(prefs);
  }

  async function claimLlamas() {
    const account = $activeAccount;
    if (!account) return;

    isClaiming = true;
    llamaState = null;

    const state: LlamaState = {
      accountId: account.accountId,
      displayName: getAccountLabel(account),
      data: { opened: 0, bought: 0, status: 'none' }
    };

    try {
      const result = await claimFreeAndOptionalSurvivorBuys(account, prefs);
      state.data.opened = result.opened;
      state.data.bought = result.bought;
      state.data.status = result.opened + result.bought > 0 ? 'claimed' : 'none';

      if (result.opened > 0) {
        activityLog.add('llama', $t('activityLog.llamasClaimed', { count: result.opened }), getAccountLabel(account));
      } else if (result.bought < 1) {
        activityLog.add('info', $t('activityLog.llamasNone'), getAccountLabel(account));
      }
      llamaState = state;
    } catch (error) {
      state.data.status = 'error';
      llamaState = state;
      logger.error('Failed to claim free llamas', { accountId: account.accountId, error });
      activityLog.add(
        'error',
        $t('activityLog.llamasError', { detail: getErrorDetail(error) }),
        getAccountLabel(account)
      );
      handleError({ error, message: 'Failed to claim free llamas', account, toastId: false });
    }

    isClaiming = false;

    if (state.data.opened + state.data.bought > 0) {
      toast.success($t('freeLlamas.claimed', { count: state.data.opened + state.data.bought }));
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

      <div class="flex items-center justify-between gap-4 py-3">
        <div class="flex min-w-0 flex-col gap-0.5">
          <Label class="cursor-pointer font-medium" for="buySurvivorToggle">
            {$t('freeLlamas.buySurvivor')}
          </Label>
          <span class="text-xs text-muted-foreground">{$t('freeLlamas.buySurvivorDescription')}</span>
        </div>
        <Switch
          id="buySurvivorToggle"
          checked={prefs.buySurvivorLlamas}
          onCheckedChange={(checked) => persistPrefs({ buySurvivorLlamas: checked })}
        />
      </div>

      <div class="space-y-2 py-3">
        <Label>{$t('freeLlamas.currency')}</Label>
        <div class="flex flex-wrap gap-2">
          <Button
            onclick={() => persistPrefs({ currency: 'xray' satisfies AutoLlamaCurrency })}
            size="sm"
            variant={prefs.currency === 'xray' ? 'default' : 'outline'}
          >
            {$t('freeLlamas.currencyXray')}
          </Button>
          <Button
            onclick={() => persistPrefs({ currency: 'token' satisfies AutoLlamaCurrency })}
            size="sm"
            variant={prefs.currency === 'token' ? 'default' : 'outline'}
          >
            {$t('freeLlamas.currencyToken')}
          </Button>
        </div>
        <div class="space-y-1">
          <Label for="max-buys">{$t('freeLlamas.maxBuys')}</Label>
          <Input
            id="max-buys"
            min="1"
            onchange={(e) =>
              persistPrefs({ maxBuysPerRun: Math.max(1, Number.parseInt(e.currentTarget.value, 10) || 1) })}
            type="number"
            value={prefs.maxBuysPerRun}
          />
        </div>
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
    <AccountResultCard accountId={state.accountId} displayName={state.displayName}>
      {#if state.data.status === 'claimed'}
        <p class="text-sm font-medium">{$t('freeLlamas.openedCount', { count: state.data.opened })}</p>
        {#if state.data.bought > 0}
          <p class="text-sm text-muted-foreground">{$t('freeLlamas.boughtCount', { count: state.data.bought })}</p>
        {/if}
      {:else if state.data.status === 'none'}
        <p class="text-sm text-muted-foreground">{$t('freeLlamas.noneAvailable')}</p>
      {:else}
        <p class="text-sm text-destructive">{$t('freeLlamas.claimError')}</p>
      {/if}
    </AccountResultCard>
  {/if}
</PageContent>
