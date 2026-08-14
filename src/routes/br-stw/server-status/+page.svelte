<script lang="ts" module>
  type ServiceStatus = {
    status: 'UP' | 'DOWN' | 'MAJOR_OUTAGE' | 'PARTIAL_OUTAGE' | 'UNDER_MAINTENANCE';
    message: string;
  };

  type StatusPageStatus = {
    name: string;
    status: 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' | 'under_maintenance';
  };

  let isLoading = $state(true);
  let notifyUser = $state(false);
  let notifyUserIntervalId: number;
  let serviceStatus = $state<ServiceStatus>();
  let statusPageServices = $state<StatusPageStatus[]>([]);
  let expectedWait = $state<number>(0);
  let lastUpdated = $state<Date>();
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import { language, t } from '$lib/i18n';
  import { requestNotificationPermission, sendNotificationMessage } from '$lib/modules/notification';
  import { getLightswitch, getStatusPage, getWaitingRoom } from '$lib/modules/server-status';
  import { accountStore, settingsStore } from '$lib/storage';
  import { get } from 'svelte/store';
  import { formatRemainingDuration, handleError } from '$lib/utils';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import PageActionButton from '$components/layout/PageActionButton.svelte';
  import PageContent from '$components/layout/PageContent.svelte';
  import PageLoading from '$components/layout/PageLoading.svelte';
  import { Alert, type AlertColor } from '$components/ui/alert';
  import { Button } from '$components/ui/button';
  import { ExternalLink } from '$components/ui/external-link';
  import HudPanel from '$components/ui/hud/HudPanel.svelte';
  import { Separator } from '$components/ui/separator';
  import { Switch } from '$components/ui/switch';
  import * as Tooltip from '$components/ui/tooltip';
  import type { LightswitchData } from '$types/game/server-status';

  $effect(() => {
    if (notifyUser) {
      notifyUserIntervalId = window.setInterval(async () => {
        await fetchServerStatus();

        if (serviceStatus?.status === 'UP') {
          notifyUser = false;
          clearInterval(notifyUserIntervalId);

          if (get(settingsStore).app?.windowsNotifications !== false) {
            await sendNotificationMessage(
              $t('serverStatus.notification.message'),
              $t('serverStatus.notification.title')
            );
          }
        }
      }, 15_000);
    } else {
      clearInterval(notifyUserIntervalId);
    }
  });

  async function fetchServerStatus() {
    isLoading = true;

    const activeAccount = accountStore.getActive() || undefined;

    try {
      const [lightswitchData, queueData, statusPageData] = await Promise.all([
        getLightswitch(),
        getWaitingRoom(),
        getStatusPage()
      ]);

      lastUpdated = new Date();
      expectedWait = queueData?.expectedWait || 0;
      serviceStatus = {
        status: getStatusFromLightswitch(lightswitchData),
        message: lightswitchData.message
      };

      const fnComponentIds = statusPageData.components?.find((x) => x.name === 'Fortnite')?.components || [];
      statusPageServices = fnComponentIds.map((id) => {
        const component = statusPageData.components.find((x) => x.id === id);
        return {
          name: component!.name,
          status: component!.status as StatusPageStatus['status']
        };
      });
    } catch (error) {
      handleError({ error, message: $t('serverStatus.failedToFetch'), account: activeAccount });
    } finally {
      isLoading = false;
    }
  }

  function getStatusFromLightswitch(data: LightswitchData): ServiceStatus['status'] {
    if (data.status !== 'UP') {
      if (data.allowedActions && data.allowedActions.includes('PLAY')) {
        return 'PARTIAL_OUTAGE';
      }

      return data.message?.includes('maintenance') ? 'UNDER_MAINTENANCE' : 'MAJOR_OUTAGE';
    }

    return 'UP';
  }

  function getStatusData(status: ServiceStatus['status'] | StatusPageStatus['status']): {
    text: string;
    color: `bg-${AlertColor}-${number}`;
  } {
    switch (status.toLowerCase()) {
      case 'up':
      case 'operational':
        return { text: $t('serverStatus.statuses.operational'), color: 'bg-green-500' };
      case 'down':
      case 'major_outage':
        return { text: $t('serverStatus.statuses.down'), color: 'bg-red-500' };
      case 'partial_outage':
        return { text: $t('serverStatus.statuses.partialOutage'), color: 'bg-orange-500' };
      case 'under_maintenance':
        return { text: $t('serverStatus.statuses.underMaintenance'), color: 'bg-blue-500' };
      case 'degraded_performance':
        return { text: $t('serverStatus.statuses.degradedPerformance'), color: 'bg-yellow-500' };
      default:
        return { text: $t('serverStatus.statuses.unknown'), color: 'bg-gray-500' };
    }
  }

  onMount(() => {
    fetchServerStatus();
  });
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === 'F5') {
      event.preventDefault();
      fetchServerStatus();
    }
  }}
/>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('serverStatus.lastUpdated', {
    date: lastUpdated ? lastUpdated.toLocaleTimeString($language) : '...'
  })}
  title={$t('serverStatus.page.title')}
>
  {#snippet actions()}
    <PageActionButton
      disabled={isLoading}
      label={$t('serverStatus.refresh')}
      loading={isLoading}
      loadingText={$t('serverStatus.refreshing')}
      onclick={fetchServerStatus}
    >
      <RefreshCwIcon class="size-4" />
    </PageActionButton>
  {/snippet}

  {#if serviceStatus && serviceStatus.status !== 'UP'}
    <HudPanel flush>
      <div class="hud-list-item items-center justify-between">
        <Tooltip.Root>
          <Tooltip.Trigger>
            {$t('serverStatus.notifyMe.title')}
          </Tooltip.Trigger>

          <Tooltip.Content>
            <p class="max-w-xs text-sm">
              {$t('serverStatus.notifyMe.description')}
            </p>
          </Tooltip.Content>
        </Tooltip.Root>

        <Switch
          onCheckedChange={() => {
            requestNotificationPermission();
          }}
          bind:checked={notifyUser}
        />
      </div>
    </HudPanel>
  {/if}

  {#if serviceStatus}
    <Alert
      color={getStatusData(serviceStatus.status).color.split('-')[1] as AlertColor}
      message={serviceStatus.message}
      title={$t('serverStatus.status', { status: getStatusData(serviceStatus.status).text })}
    />
  {:else}
    <div class="skeleton-loader mb-2 rounded-md bg-muted/30 p-3">
      <div class="flex items-center gap-2">
        <div class="size-4 rounded-full bg-muted/80"></div>
        <div class="h-5 w-32 rounded bg-muted/80 font-medium"></div>
      </div>

      <div class="mt-3 h-4 w-30 rounded bg-muted/80"></div>
    </div>
  {/if}

  {#if expectedWait}
    <Alert
      color="yellow"
      message={$t('serverStatus.queue.description', { time: formatRemainingDuration(expectedWait * 1000) })}
      title={$t('serverStatus.queue.title')}
    />
  {/if}

  <Separator orientation="horizontal" />

  {#if isLoading && !statusPageServices.length}
    <PageLoading label={$t('loading')} />
  {:else if statusPageServices.length}
    <HudPanel flush>
      <div class="hud-panel-header flex items-center gap-2 border-b-0 pb-0 text-muted-foreground">
        <ExternalLinkIcon class="size-4" />
        <ExternalLink class="text-sm font-medium hover:underline" href="https://status.epicgames.com">
          status.epicgames.com
        </ExternalLink>
      </div>

      <div class="hud-list">
        {#each statusPageServices as service (service.name)}
          <div class="hud-list-item items-center justify-between">
            <div class="flex min-w-0 items-center gap-3 truncate">
              <div class="size-3 shrink-0 rounded-full {getStatusData(service.status).color}"></div>
              <span class="truncate font-medium max-xs:text-sm">{service.name}</span>
            </div>

            <div class="shrink-0 text-sm">
              {getStatusData(service.status).text}
            </div>
          </div>
        {/each}
      </div>
    </HudPanel>
  {/if}
</PageContent>
