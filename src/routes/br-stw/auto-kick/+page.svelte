<script lang="ts">
  import { toast } from 'svelte-sonner';
  import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import UserPlusIcon from '@lucide/svelte/icons/user-plus';
  import { platform } from '@tauri-apps/plugin-os';
  import { t } from '$lib/i18n';
  import {
    addAutoKickAccount,
    autoKickAccounts,
    removeAutoKickAccount,
    updateAutoKickSettings
  } from '$lib/modules/autokick/base';
  import { accountStore } from '$lib/storage';
  import { cn } from '$lib/utils';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import PageContent from '$components/layout/PageContent.svelte';
  import { Alert } from '$components/ui/alert';
  import { Button } from '$components/ui/button';
  import HudPanel from '$components/ui/hud/HudPanel.svelte';
  import { Label } from '$components/ui/label';
  import { Switch } from '$components/ui/switch';
  import type { AutomationSetting as AutomationSettingWithId } from '$types/settings';

  type AutomationSetting = keyof Omit<AutomationSettingWithId, 'accountId'>;

  const activeAccount = accountStore.getActiveStore(true);
  const allAccounts = $derived($accountStore.accounts);

  const canAddCurrentAccount = $derived(
    $activeAccount !== null && !autoKickAccounts.has($activeAccount.accountId)
  );

  function addCurrentAccount() {
    if (!$activeAccount || autoKickAccounts.has($activeAccount.accountId)) return;

    void addAutoKickAccount($activeAccount, { autoKick: true });
  }

  const settings: { id: AutomationSetting; label: string }[] = $derived([
    {
      id: 'autoKick',
      label: $t('autoKick.settings.kick')
    },
    {
      id: 'autoClaim',
      label: $t('autoKick.settings.claim')
    },
    {
      id: 'autoTransferMaterials',
      label: $t('autoKick.settings.transferMaterials')
    },
    {
      id: 'autoInvite',
      label: $t('autoKick.settings.invite')
    }
  ]);
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('autoKick.page.description')}
  title={$t('autoKick.page.title')}
>
  {#if platform() === 'android' || platform() === 'ios'}
    <Alert
      color="yellow"
      icon={AlertTriangleIcon}
      message={$t('autoKick.mobileIncompatibilityWarning.description')}
      title={$t('autoKick.mobileIncompatibilityWarning.title')}
    />
  {/if}

  <Button
    class="w-full sm:w-auto sm:self-start"
    disabled={!canAddCurrentAccount}
    onclick={addCurrentAccount}
    type="button"
  >
    <UserPlusIcon class="size-4" />
    {$t('autoKick.addCurrentAccount')}
  </Button>

  <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
    <div class="flex items-center gap-1.5">
      <div class="size-2 rounded-full bg-green-500"></div>
      <span>{$t('autoKick.accountStatus.active')}</span>
    </div>

    <div class="flex items-center gap-1.5">
      <div class="size-2 rounded-full bg-red-500"></div>
      <span>{$t('autoKick.accountStatus.loginExpired')}</span>
    </div>

    <div class="flex items-center gap-1.5">
      <div class="size-2 rounded-full bg-gray-500"></div>
      <span>{$t('autoKick.accountStatus.disconnected')}</span>
    </div>
  </div>

  {#if autoKickAccounts.size}
    <div class="grid grid-cols-3 gap-2">
      {#each autoKickAccounts as [accountId, automationAccount] (accountId)}
        {@const isLoading = automationAccount.status === 'LOADING'}

        <HudPanel class="flex min-w-0 flex-col">
          <div class="hud-panel-header flex items-center justify-between gap-2 py-2">
            <div class="flex min-w-0 items-center gap-2">
              <div
                class={cn(
                  'size-2 shrink-0 rounded-full',
                  (automationAccount.status === 'DISCONNECTED' || isLoading) && 'bg-gray-500',
                  automationAccount.status === 'ACTIVE' && 'bg-green-500',
                  automationAccount.status === 'INVALID_CREDENTIALS' && 'bg-red-500'
                )}
              ></div>

              <span class="truncate text-sm font-medium">
                {allAccounts.find((x) => x.accountId === accountId)?.displayName}
              </span>
            </div>

            <Button
              class="size-7 shrink-0 hover:text-destructive"
              disabled={isLoading}
              onclick={() => removeAutoKickAccount(accountId)}
              size="icon"
              variant="ghost"
            >
              {#if isLoading}
                <RefreshCwIcon class="size-3.5 animate-spin opacity-50" />
              {:else}
                <Trash2Icon class="size-3.5" />
              {/if}
            </Button>
          </div>

          <div class="divide-y divide-border/50 px-4">
            {#each settings as setting (setting.id)}
              <div class="flex items-center justify-between gap-2 py-2">
                <Label class="text-xs font-normal" for="{accountId}-{setting.id}">{setting.label}</Label>
                <Switch
                  id="{accountId}-{setting.id}"
                  checked={automationAccount.settings[setting.id]}
                  disabled={isLoading || (setting.id === 'autoInvite' && !automationAccount.settings.autoKick)}
                  onCheckedChange={(checked) => updateAutoKickSettings(accountId, { [setting.id]: checked })}
                />
              </div>
            {/each}
          </div>
        </HudPanel>
      {/each}
    </div>
  {/if}
</PageContent>
