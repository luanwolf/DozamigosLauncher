<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import { cn } from '$lib/utils';

  type Variant = 'panel' | 'ghost' | 'flat';

  type Props = {
    variant?: Variant;
    class?: ClassValue;
    headerClass?: ClassValue;
    bodyClass?: ClassValue;
    title?: string;
    header?: Snippet;
    actions?: Snippet;
    /** Body without padding — for lists with dividers. */
    flush?: boolean;
    children: Snippet;
  };

  const {
    variant = 'panel',
    class: className,
    headerClass,
    bodyClass,
    title,
    header,
    actions,
    flush,
    children
  }: Props = $props();

  const shellClass = $derived(
    variant === 'ghost' ? 'hud-toolbar' : variant === 'flat' ? 'hud-surface-flat' : 'hud-panel'
  );

  const bodyFlush = $derived(flush ?? variant === 'ghost');
</script>

<div class={cn(shellClass, className)}>
  {#if title || header || actions}
    <div class={cn('hud-panel-header flex items-center justify-between gap-2', headerClass)}>
      {#if header}
        {@render header()}
      {:else if title}
        <h3 class="font-display min-w-0 truncate text-lg leading-none text-foreground">{title}</h3>
      {/if}

      {#if actions}
        <div class="flex shrink-0 items-center gap-1">
          {@render actions()}
        </div>
      {/if}
    </div>
  {/if}

  <div class={cn(bodyFlush ? 'min-w-0' : 'hud-panel-body', bodyClass)}>
    {@render children()}
  </div>
</div>
