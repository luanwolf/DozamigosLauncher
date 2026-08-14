<script lang="ts" module>
  import type { EpicDeviceAuthData } from '$types/game/authorizations';

  let allDeviceAuths = $state<Record<string, EpicDeviceAuthData[]>>({});
  let isFetchingDeviceAuths = $state(false);
  let isGeneratingDeviceAuth = $state(false);
  let deviceAuthError = $state(false);
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import { toast } from 'svelte-sonner';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import { t } from '$lib/i18n';
  import { logger } from '$lib/logger';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { createDeviceAuth, getAllDeviceAuths } from '$lib/modules/device-auth';
  import { accountStore, deviceAuthsStore } from '$lib/storage';
  import { handleError } from '$lib/utils';
  import PageActionButton from '$components/layout/PageActionButton.svelte';
  import PageContent from '$components/layout/PageContent.svelte';
  import DeviceAuthCard from '$components/modules/device-auth/DeviceAuthCard.svelte';
  import DeviceAuthCardSkeleton from '$components/modules/device-auth/DeviceAuthCardSkeleton.svelte';

  const activeAccount = accountStore.getActiveStore();
  const deviceAuths = $derived(allDeviceAuths[$activeAccount.accountId] || []);

  async function fetchDeviceAuths(account = $activeAccount, forceRefresh = false) {
    if (isFetchingDeviceAuths || (!forceRefresh && deviceAuths?.length)) return;

    isFetchingDeviceAuths = true;
    deviceAuthError = false;

    try {
      const data = await getAllDeviceAuths(account);
      allDeviceAuths[account.accountId] = data.sort((a, b) => {
        const aHasCustomName = $deviceAuthsStore.some((x) => x.deviceId === a.deviceId) ? 1 : 0;
        const bHasCustomName = $deviceAuthsStore.some((x) => x.deviceId === b.deviceId) ? 1 : 0;
        const hasCustomName = bHasCustomName - aHasCustomName;

        const aDate = a.lastAccess?.dateTime || a.created?.dateTime;
        const bDate = b.lastAccess?.dateTime || b.created?.dateTime;
        const dateDifference = aDate && bDate && new Date(bDate).getTime() - new Date(aDate).getTime();

        return hasCustomName || dateDifference || 0;
      });
    } catch (error) {
      deviceAuthError = true;
      logger.error('Failed to fetch device authentications', { error });
    } finally {
      isFetchingDeviceAuths = false;
    }
  }

  async function generateDeviceAuth() {
    if (isGeneratingDeviceAuth) return;

    isGeneratingDeviceAuth = true;
    const toastId = toast.loading($t('deviceAuth.generating'));

    try {
      const deviceAuth = await createDeviceAuth($activeAccount);
      allDeviceAuths[$activeAccount.accountId] = [deviceAuth, ...deviceAuths];
      toast.success($t('deviceAuth.generated'), { id: toastId });
    } catch (error) {
      handleError({ error, message: $t('deviceAuth.failedToGenerate'), account: $activeAccount, toastId });
    } finally {
      isGeneratingDeviceAuth = false;
    }
  }

  $effect(() => {
    const account = $activeAccount;
    untrack(() => {
      fetchDeviceAuths(account);
    });
  });
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === 'F5') {
      event.preventDefault();
      fetchDeviceAuths($activeAccount, true);
    }
  }}
/>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('deviceAuth.page.description')}
  title={$t('deviceAuth.page.title')}
>
  {#snippet actions()}
    <PageActionButton
      aria-label={$t('deviceAuth.generate')}
      disabled={isGeneratingDeviceAuth || isFetchingDeviceAuths}
      label={$t('deviceAuth.generate')}
      loading={isGeneratingDeviceAuth}
      onclick={generateDeviceAuth}
    >
      <PlusIcon class="size-4" />
    </PageActionButton>
  {/snippet}

  {#if deviceAuthError}
    <p class="text-sm text-destructive">{$t('deviceAuth.failedToFetch')}</p>
  {:else}
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {#if !isFetchingDeviceAuths}
        {#each deviceAuths as auth (auth.deviceId)}
          <DeviceAuthCard {allDeviceAuths} {auth} />
        {:else}
          <p class="col-span-full text-sm text-muted-foreground">{$t('deviceAuth.noAuths')}</p>
        {/each}
      {:else}
        <DeviceAuthCardSkeleton />
        <DeviceAuthCardSkeleton />
      {/if}
    </div>
  {/if}
</PageContent>
