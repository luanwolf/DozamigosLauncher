<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import { avatarCache } from '$lib/stores';
  import { cn } from '$lib/utils';
  import HudPanel from '$components/ui/hud/HudPanel.svelte';

  type Props = {
    accountId: string;
    displayName: string;
    class?: ClassValue;
    badge?: Snippet;
    actions?: Snippet;
    children: Snippet;
  };

  const { accountId, displayName, class: className, badge, actions, children }: Props = $props();
</script>

<HudPanel class={cn('flex min-w-0 flex-col', className)}>
  {#snippet header()}
    <div class="flex min-w-0 flex-1 items-center gap-2">
      <img
        class="size-7 shrink-0 rounded-full"
        alt=""
        src={avatarCache.get(accountId) || '/misc/default-outfit-icon.png'}
      />
      <span class="min-w-0 truncate text-sm font-semibold">{displayName}</span>
    </div>

    <div class="flex shrink-0 items-center gap-2">
      {#if badge}
        {@render badge()}
      {/if}
      {#if actions}
        {@render actions()}
      {/if}
    </div>
  {/snippet}

  <div class="min-w-0 px-4 py-3">
    {@render children()}
  </div>
</HudPanel>
