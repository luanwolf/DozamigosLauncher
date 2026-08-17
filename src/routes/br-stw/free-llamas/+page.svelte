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
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { language, t } from '$lib/i18n';
  import { logger } from '$lib/logger';
  import { claimFreeLlamas } from '$lib/modules/stw-auto-llama';
  import { accountStore } from '$lib/storage';
  import { activityLog } from '$lib/stores/activity-log';
  import { getAccountLabel, getErrorDetail, handleError } from '$lib/utils';
  import { resolveStwTemplateDisplay } from '$lib/utils/stw-template-display';
  import PageContent from '$components/layout/PageContent.svelte';
  import AccountResultCard from '$components/ui/AccountResultCard.svelte';
  import { Button } from '$components/ui/button';
  import HudPanel from '$components/ui/hud/HudPanel.svelte';
  import { Label } from '$components/ui/label';
  import { Switch } from '$components/ui/switch';

  const activeAccount = accountStore.getActiveStore();
  const llamaHistory = $derived($activityLog.filter((entry) => entry.type === 'llama' && entry.items?.length));

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
      displayName: getAccountLabel(account),
      data: { opened: 0, status: 'none' }
    };

    try {
      const result = await claimFreeLlamas(account);
      state.data.opened = result.opened;
      state.data.status = result.opened > 0 ? 'claimed' : 'none';

      const count = result.opened;
      if (count > 0) {
        activityLog.add('llama', $t('activityLog.llamasClaimed', { count }), getAccountLabel(account), {
          title: $t('activityLog.llamasTitle'),
          items: result.received
        });
      } else {
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
    <div class="px-4">
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
    <AccountResultCard accountId={state.accountId} displayName={state.displayName}>
      {#if state.data.status === 'claimed'}
        <p class="text-sm font-medium">{$t('freeLlamas.openedCount', { count: state.data.opened })}</p>
      {:else if state.data.status === 'none'}
        <p class="text-sm text-muted-foreground">{$t('freeLlamas.noneAvailable')}</p>
      {:else}
        <p class="text-sm text-destructive">{$t('freeLlamas.claimError')}</p>
      {/if}
    </AccountResultCard>
  {/if}

  <section class="space-y-3">
    <div>
      <h2 class="font-display text-xl text-foreground">{$t('freeLlamas.history.title')}</h2>
      <p class="text-sm text-muted-foreground">{$t('freeLlamas.history.description')}</p>
    </div>

    {#if llamaHistory.length}
      <div class="space-y-3">
        {#each llamaHistory as entry (entry.id)}
          <HudPanel class="p-4">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p class="font-semibold text-foreground">{entry.message}</p>
                {#if entry.account}
                  <p class="text-xs text-muted-foreground">{entry.account}</p>
                {/if}
              </div>
              <time class="text-xs text-muted-foreground" datetime={entry.timestamp}>
                {new Date(entry.timestamp).toLocaleString($language)}
              </time>
            </div>

            <ul class="mt-3 divide-y divide-border/50 border-t border-border/50">
              {#each entry.items ?? [] as item, index (`${entry.id}-${item.templateId}-${index}`)}
                {@const display = resolveStwTemplateDisplay(item.templateId, $language)}
                <li class="flex items-center gap-3 py-2">
                  <img class="size-9 shrink-0 object-contain" alt="" loading="lazy" src={display.imageUrl} />
                  <span class="min-w-0 flex-1 truncate text-sm">{display.name}</span>
                  <span class="text-sm font-semibold tabular-nums">×{item.quantity.toLocaleString($language)}</span>
                </li>
              {/each}
            </ul>
          </HudPanel>
        {/each}
      </div>
    {:else}
      <HudPanel class="p-4 text-sm text-muted-foreground">{$t('freeLlamas.history.empty')}</HudPanel>
    {/if}
  </section>
</PageContent>
