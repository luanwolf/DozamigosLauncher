<script lang="ts" module>
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

  function loadFromStorage<T>(key: string, fallback: T): T {
    if (typeof localStorage === 'undefined') return fallback;
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveToStorage(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  let creatorCode = $state(loadFromStorage<string>('sacCode', ''));
  let autoRefresh = $state(loadFromStorage<boolean>('sacAutoRefresh', false));
  let lastSetTimestamp = $state(loadFromStorage<number>('sacLastSet', 0));
  let isSetting = $state(false);
  let isRemoving = $state(false);
  let isChecking = $state(false);

  type AccountCode = { accountId: string; displayName: string; code: string };
  let currentCode = $state<AccountCode | null>(null);
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import CheckIcon from '@lucide/svelte/icons/check';
  import ClockIcon from '@lucide/svelte/icons/clock';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import { toast } from 'svelte-sonner';
  import { t } from '$lib/i18n';
  import { logger } from '$lib/logger';
  import { composeMCP, queryProfile } from '$lib/modules/mcp';
  import { lookupCreatorCode } from '$lib/modules/creator-code';
  import { accountStore } from '$lib/storage';
  import { handleError } from '$lib/utils';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import PageContent from '$components/layout/PageContent.svelte';
  import AccountResultCard from '$components/ui/AccountResultCard.svelte';
  import { Button } from '$components/ui/button';
  import HudPanel from '$components/ui/hud/HudPanel.svelte';
  import { Input } from '$components/ui/input';
  import { Label } from '$components/ui/label';
  import { Switch } from '$components/ui/switch';

  const activeAccount = accountStore.getActiveStore();

  const daysUntilExpiry = $derived.by(() => {
    if (!lastSetTimestamp) return null;
    const remaining = FOURTEEN_DAYS_MS - (Date.now() - lastSetTimestamp);
    return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
  });

  function toggleAutoRefresh() {
    autoRefresh = !autoRefresh;
    saveToStorage('sacAutoRefresh', autoRefresh);
  }

  async function setCode() {
    const account = $activeAccount;
    const code = creatorCode.trim();
    if (!account || !code) return;

    isSetting = true;

    try {
      const validated = await lookupCreatorCode(code);
      if (!validated) {
        toast.error($t('supportCreator.invalidCreator'));
        isSetting = false;
        return;
      }

      toast.info($t('supportCreator.validatedAs', { name: validated.displayName }));
      await composeMCP(account, 'SetAffiliateName', 'common_core', { affiliateName: code });
      lastSetTimestamp = Date.now();
      saveToStorage('sacCode', code);
      saveToStorage('sacLastSet', lastSetTimestamp);
      toast.success($t('supportCreator.setSuccess', { code }));
      await checkCurrentCode();
    } catch (error) {
      logger.error('Failed to set affiliate name', { accountId: account.accountId, error });
      handleError({ error, message: $t('supportCreator.setError'), account, toastId: false });
    }

    isSetting = false;
  }

  async function removeCode() {
    const account = $activeAccount;
    if (!account) return;

    isRemoving = true;

    try {
      await composeMCP(account, 'SetAffiliateName', 'common_core', { affiliateName: '' });
      toast.success($t('supportCreator.removeSuccess'));
      await checkCurrentCode();
    } catch (error) {
      logger.error('Failed to remove affiliate name', { accountId: account.accountId, error });
      handleError({ error, message: $t('supportCreator.removeError'), account, toastId: false });
    }

    isRemoving = false;
  }

  async function checkCurrentCode() {
    const account = $activeAccount;
    if (!account) return;

    isChecking = true;
    currentCode = null;

    try {
      const profile = await queryProfile(account, 'common_core');
      const attrs = profile.profileChanges[0].profile.stats.attributes as Record<string, any>;
      currentCode = {
        accountId: account.accountId,
        displayName: account.displayName,
        code: (attrs.mtx_affiliate as string) || ''
      };
    } catch (error) {
      handleError({ error, message: $t('supportCreator.checkError'), account, toastId: false });
    }

    isChecking = false;
  }

  async function autoRefreshIfNeeded() {
    const account = $activeAccount;
    if (!autoRefresh || !account) return;

    const code = creatorCode.trim();
    if (!code) return;

    const expired = !lastSetTimestamp || Date.now() - lastSetTimestamp >= FOURTEEN_DAYS_MS;
    if (!expired) return;

    logger.info('Auto-refreshing SAC code', { code });
    toast.info($t('supportCreator.autoRefreshing', { code }));

    try {
      const validated = await lookupCreatorCode(code);
      if (!validated) {
        toast.error($t('supportCreator.invalidCreator'));
        return;
      }
      await composeMCP(account, 'SetAffiliateName', 'common_core', { affiliateName: code });
      lastSetTimestamp = Date.now();
      saveToStorage('sacLastSet', lastSetTimestamp);
      toast.success($t('supportCreator.autoRefreshDone', { code }));
    } catch (error) {
      logger.error('Auto-refresh SAC failed', { accountId: account.accountId, error });
    }
  }

  $effect(() => {
    const account = $activeAccount;
    untrack(() => {
      currentCode = null;
    });

    if (!account) return;

    autoRefreshIfNeeded().then(() => checkCurrentCode());
  });
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('supportCreator.page.description')}
  title={$t('supportCreator.page.title')}
>
  <HudPanel class="flex min-w-0 flex-col">
    <div class="divide-y divide-border/50 px-4">
      <div class="flex flex-col gap-2 py-3">
        <Label for="creatorCodeInput">{$t('supportCreator.creatorCode')}</Label>
        <div class="flex gap-2">
          <Input
            id="creatorCodeInput"
            class="flex-1"
            placeholder={$t('supportCreator.codePlaceholder')}
            disabled={isSetting}
            bind:value={creatorCode}
            onkeydown={(e) => e.key === 'Enter' && setCode()}
          />
          <Button
            disabled={!creatorCode.trim() || isSetting}
            loading={isSetting}
            onclick={setCode}
          >
            <CheckIcon class="size-4" />
            {$t('supportCreator.apply')}
          </Button>
        </div>
      </div>

      <div class="flex items-center justify-between gap-4 py-3">
        <div class="flex min-w-0 flex-col gap-0.5">
          <Label class="cursor-pointer font-medium" for="sacAutoRefreshToggle">
            {$t('supportCreator.autoRefresh')}
          </Label>
          <span class="text-xs text-muted-foreground">{$t('supportCreator.autoRefreshDescription')}</span>
        </div>
        <Switch id="sacAutoRefreshToggle" checked={autoRefresh} onCheckedChange={toggleAutoRefresh} />
      </div>

      {#if lastSetTimestamp > 0}
        <div class="flex flex-wrap items-center gap-2 py-3 text-xs">
          <ClockIcon class="size-3.5 shrink-0 text-muted-foreground" />
          <span class="text-muted-foreground">
            {#if daysUntilExpiry === 0}
              <span class="font-medium text-destructive">{$t('supportCreator.expiredToday')}</span>
            {:else if daysUntilExpiry !== null && daysUntilExpiry <= 3}
              <span class="font-medium text-amber-500">
                {$t('supportCreator.expiresIn', { days: daysUntilExpiry })}
              </span>
            {:else}
              {$t('supportCreator.expiresIn', { days: daysUntilExpiry ?? 14 })}
            {/if}
          </span>
          {#if creatorCode}
            <span class="font-medium">({creatorCode})</span>
          {/if}
        </div>
      {/if}
    </div>
  </HudPanel>

  <div class="flex w-full flex-wrap gap-2 sm:w-auto sm:self-start">
    <Button
      class="w-full sm:w-auto"
      variant="outline"
      disabled={isChecking}
      loading={isChecking}
      loadingText={$t('supportCreator.checking')}
      onclick={checkCurrentCode}
    >
      <RefreshCwIcon class="size-4" />
      {$t('supportCreator.checkCurrent')}
    </Button>
    <Button
      class="w-full sm:w-auto"
      variant="destructive"
      disabled={isRemoving}
      loading={isRemoving}
      onclick={removeCode}
      title={$t('supportCreator.remove')}
    >
      <Trash2Icon class="size-4" />
      {$t('supportCreator.remove')}
    </Button>
  </div>

  {#if currentCode}
    {@const entry = currentCode}
    <AccountResultCard accountId={entry.accountId} displayName={entry.displayName}>
      {#snippet badge()}
        {#if entry.code}
          <span class="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase">
            {$t('supportCreator.statusActive')}
          </span>
        {:else}
          <span class="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
            {$t('supportCreator.statusEmpty')}
          </span>
        {/if}
      {/snippet}

      <div class="space-y-1">
        <p class="text-xs text-muted-foreground">{$t('supportCreator.currentCode')}</p>
        {#if entry.code}
          <p class="text-2xl leading-none font-bold tracking-wide text-primary">{entry.code}</p>
        {:else}
          <p class="text-sm text-muted-foreground">{$t('supportCreator.noCode')}</p>
        {/if}
      </div>
    </AccountResultCard>
  {/if}
</PageContent>
