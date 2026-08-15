<script lang="ts">
  import BellIcon from '@lucide/svelte/icons/bell';
  import DownloadIcon from '@lucide/svelte/icons/download';
  import GiftIcon from '@lucide/svelte/icons/gift';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import TagIcon from '@lucide/svelte/icons/tag';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import XIcon from '@lucide/svelte/icons/x';
  import { RarityColors } from '$lib/constants/stw/resources';
  import { language, t } from '$lib/i18n';
  import { floatingNotifications, type FloatingNotification } from '$lib/stores/floating-notifications';
  import type { ActivityType } from '$lib/stores/activity-log';
  import { resolveStwTemplateDisplay } from '$lib/utils/stw-template-display';
  import { Button } from '$components/ui/button';

  function entryIcon(type: ActivityType) {
    switch (type) {
      case 'llama':
        return { Icon: GiftIcon, class: 'bg-yellow-500/15 text-yellow-500' };
      case 'game':
        return { Icon: TagIcon, class: 'bg-green-500/15 text-green-500' };
      case 'quest':
        return { Icon: RefreshCwIcon, class: 'bg-blue-500/15 text-blue-500' };
      case 'update':
        return { Icon: DownloadIcon, class: 'bg-primary/15 text-primary' };
      case 'error':
        return { Icon: TriangleAlertIcon, class: 'bg-destructive/15 text-destructive' };
      default:
        return { Icon: BellIcon, class: 'bg-muted text-muted-foreground' };
    }
  }

  function previewItems(entry: FloatingNotification) {
    if (!entry.items?.length) return [];
    const totals: Record<string, number> = {};
    for (const item of entry.items) {
      totals[item.templateId] = (totals[item.templateId] ?? 0) + item.quantity;
    }
    return Object.entries(totals)
      .slice(0, 6)
      .map(([templateId, quantity]) => ({
        templateId,
        quantity,
        display: resolveStwTemplateDisplay(templateId, $language)
      }));
  }

  async function runAction(entryId: string, action: NonNullable<FloatingNotification['actions']>[number]) {
    try {
      await action.onClick();
    } finally {
      if (!action.id.startsWith('keep:')) {
        floatingNotifications.dismiss(entryId);
      }
    }
  }
</script>

<div
  class="pointer-events-none fixed right-3 bottom-3 z-[200] flex w-[min(22rem,calc(100vw-1.5rem))] flex-col-reverse gap-2 sm:right-5 sm:bottom-5"
  aria-live="polite"
>
  {#each $floatingNotifications as entry (entry.id)}
    {@const icon = entryIcon(entry.type)}
    {@const items = previewItems(entry)}
    <article
      class="hud-panel pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-200"
      role="status"
    >
      <div class="flex items-start gap-2.5 p-3">
        <div class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full {icon.class}">
          <icon.Icon class="size-4" />
        </div>

        <div class="min-w-0 flex-1">
          <p class="font-display text-[11px] tracking-[0.12em] text-primary uppercase">{entry.title}</p>
          <p class="mt-0.5 text-sm leading-snug text-foreground">{entry.message}</p>
          {#if entry.account}
            <p class="mt-0.5 truncate text-xs text-muted-foreground">{entry.account}</p>
          {/if}

          {#if items.length}
            <div class="mt-2 grid grid-cols-3 gap-1.5">
              {#each items as item (item.templateId)}
                {@const rarityColor = RarityColors[item.display.rarity] ?? RarityColors.c}
                <div class="border border-border/60 bg-card/60" title={item.display.name}>
                  <div
                    style="background-color: {rarityColor}12"
                    class="relative flex h-12 items-center justify-center p-1"
                  >
                    <img class="max-h-full max-w-full object-contain" alt="" loading="lazy" src={item.display.imageUrl} />
                    {#if item.quantity > 1}
                      <span class="absolute right-0.5 bottom-0.5 bg-background/80 px-1 text-[9px] font-bold tabular-nums">
                        ×{item.quantity}
                      </span>
                    {/if}
                  </div>
                  <p class="line-clamp-1 border-t border-border/50 px-1 py-0.5 text-[9px] leading-tight">
                    {item.display.name}
                  </p>
                </div>
              {/each}
            </div>
            {#if entry.items && entry.items.length > 6}
              <p class="mt-1 text-[10px] text-muted-foreground">
                {$t('activityLog.moreItems', { count: entry.items.length - 6 })}
              </p>
            {/if}
          {/if}

          {#if entry.actions?.length}
            <div class="mt-2.5 flex flex-wrap gap-1.5">
              {#each entry.actions as action (action.id)}
                <Button
                  class="h-7 px-2.5 text-xs"
                  onclick={() => void runAction(entry.id, action)}
                  size="sm"
                  variant={action.variant ?? 'default'}
                >
                  {action.label}
                </Button>
              {/each}
            </div>
          {/if}
        </div>

        <Button
          class="size-7 shrink-0 p-0"
          aria-label={$t('activityLog.dismiss')}
          onclick={() => floatingNotifications.dismiss(entry.id)}
          size="icon-sm"
          variant="ghost"
        >
          <XIcon class="size-3.5" />
        </Button>
      </div>
    </article>
  {/each}
</div>
