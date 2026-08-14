<script lang="ts">
  import BellIcon from '@lucide/svelte/icons/bell';
  import CheckCheckIcon from '@lucide/svelte/icons/check-check';
  import GiftIcon from '@lucide/svelte/icons/gift';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import TagIcon from '@lucide/svelte/icons/tag';
  import TrashIcon from '@lucide/svelte/icons/trash-2';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import { Popover } from 'bits-ui';
  import { language, t } from '$lib/i18n';
  import { activityLog, unreadCount, type ActivityType } from '$lib/stores/activity-log';
  import { Button } from '$components/ui/button';

  let open = $state(false);

  $effect(() => {
    if (open) activityLog.markAllRead();
  });

  function formatTime(date: Date): string {
    return date.toLocaleTimeString($language, { hour: '2-digit', minute: '2-digit' });
  }

  function entryIcon(type: ActivityType) {
    switch (type) {
      case 'llama':
        return { Icon: GiftIcon, class: 'bg-yellow-500/15 text-yellow-500' };
      case 'game':
        return { Icon: TagIcon, class: 'bg-green-500/15 text-green-500' };
      case 'quest':
        return { Icon: RefreshCwIcon, class: 'bg-blue-500/15 text-blue-500' };
      case 'error':
        return { Icon: TriangleAlertIcon, class: 'bg-destructive/15 text-destructive' };
      default:
        return { Icon: BellIcon, class: 'bg-muted text-muted-foreground' };
    }
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <div class="relative" {...props}>
        <Button class="rounded-none p-2! hover:bg-accent!" variant="ghost">
          <BellIcon class="size-6" />
        </Button>
        {#if $unreadCount > 0}
          <span
            class="pointer-events-none absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white"
          >
            {$unreadCount > 99 ? '99+' : $unreadCount}
          </span>
        {/if}
      </div>
    {/snippet}
  </Popover.Trigger>

  <Popover.Portal>
    <Popover.Content
      align="end"
      class="hud-panel z-[100] flex w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden p-0 outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
      side="bottom"
      sideOffset={8}
    >
      <div class="hud-panel-header flex items-center justify-between gap-2">
        <div class="flex min-w-0 items-center gap-2">
          <BellIcon class="size-4 shrink-0 text-muted-foreground" />
          <h2 class="truncate text-sm font-medium text-foreground">{$t('activityLog.title')}</h2>
          {#if $unreadCount > 0}
            <span
              class="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary tabular-nums"
            >
              {$unreadCount}
            </span>
          {/if}
        </div>

        {#if $activityLog.length > 0}
          <div class="flex shrink-0 items-center gap-0.5">
            <Button
              class="h-8 gap-1 px-2 text-xs"
              onclick={() => activityLog.markAllRead()}
              size="sm"
              variant="ghost"
            >
              <CheckCheckIcon class="size-3.5" />
              <span class="max-sm:hidden">{$t('activityLog.markAllRead')}</span>
            </Button>
            <Button class="h-8 px-2" onclick={() => activityLog.clear()} size="sm" variant="ghost">
              <TrashIcon class="size-3.5" />
              <span class="sr-only">{$t('activityLog.clear')}</span>
            </Button>
          </div>
        {/if}
      </div>

      <div class="max-h-[min(24rem,60vh)] overflow-y-auto">
        {#if $activityLog.length === 0}
          <div class="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <BellIcon class="size-10 text-muted-foreground/25" />
            <p class="text-sm text-muted-foreground">{$t('activityLog.empty')}</p>
          </div>
        {:else}
          <ul class="hud-list">
            {#each $activityLog as entry (entry.id)}
              {@const icon = entryIcon(entry.type)}
              <li class="hud-list-item {entry.read ? '' : 'hud-list-item-active'}">
                <div
                  class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full {icon.class}"
                >
                  <icon.Icon class="size-4" />
                </div>

                <div class="min-w-0 flex-1">
                  <p class="leading-snug {entry.read ? 'text-muted-foreground' : 'text-foreground'}">
                    {entry.message}
                  </p>
                  {#if entry.account}
                    <p class="mt-0.5 truncate text-xs text-muted-foreground">{entry.account}</p>
                  {/if}
                  <p class="mt-1 text-[10px] text-muted-foreground/70 tabular-nums">{formatTime(entry.timestamp)}</p>
                </div>

                {#if !entry.read}
                  <div class="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true"></div>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>
