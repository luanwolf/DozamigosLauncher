<script lang="ts">
  import { toast } from 'svelte-sonner';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import UserPlusIcon from '@lucide/svelte/icons/user-plus';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { t } from '$lib/i18n';
  import {
    addTaxiAccount,
    removeTaxiAccount,
    taxiAccounts,
    updateTaxiSettings
  } from '$lib/modules/taxi-service';
  import { accountStore } from '$lib/storage';
  import { getAccountLabel } from '$lib/utils';
  import PageContent from '$components/layout/PageContent.svelte';
  import { Button } from '$components/ui/button';
  import HudPanel from '$components/ui/hud/HudPanel.svelte';
  import { Label } from '$components/ui/label';
  import { Switch } from '$components/ui/switch';

  const activeAccount = accountStore.getActiveStore(true);
  const entries = $derived([...taxiAccounts.values()]);
  const canAdd = $derived($activeAccount !== null && !taxiAccounts.has($activeAccount.accountId));

  async function addCurrent() {
    if (!$activeAccount) return;
    try {
      await addTaxiAccount($activeAccount, true);
      toast.success($t('taxiService.started'));
    } catch (error) {
      if (error instanceof Error && error.message === 'AUTO_KICK_CONFLICT') {
        toast.error($t('taxiService.conflictAutoKick'));
        return;
      }
      throw error;
    }
  }
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('taxiService.page.description')}
  title={$t('taxiService.page.title')}
>
  <Button class="w-full sm:w-auto sm:self-start" disabled={!canAdd} onclick={addCurrent}>
    <UserPlusIcon class="size-4" />
    {$t('taxiService.addCurrent')}
  </Button>

  {#if entries.length}
    <div class="space-y-3">
      {#each entries as entry (entry.account.accountId)}
        <HudPanel class="p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="font-medium">{getAccountLabel(entry.account)}</p>
              <p class="text-xs text-muted-foreground">
                {entry.status === 'BUSY' ? $t('taxiService.busy') : $t('taxiService.active')} · {entry.status}
              </p>
            </div>
            <Button
              onclick={() => {
                removeTaxiAccount(entry.account.accountId);
                toast.success($t('taxiService.removed'));
              }}
              size="icon"
              variant="outline"
            >
              <Trash2Icon class="size-4" />
            </Button>
          </div>
          <div class="mt-3 flex items-center justify-between gap-3">
            <Label for={`taxi-friends-${entry.account.accountId}`}>{$t('taxiService.autoAcceptFriends')}</Label>
            <Switch
              id={`taxi-friends-${entry.account.accountId}`}
              checked={entry.autoAcceptFriends}
              onCheckedChange={(checked) => updateTaxiSettings(entry.account.accountId, checked)}
            />
          </div>
        </HudPanel>
      {/each}
    </div>
  {/if}
</PageContent>
