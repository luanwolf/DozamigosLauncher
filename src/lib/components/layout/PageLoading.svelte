<script lang="ts">
  import type { ClassValue } from 'svelte/elements';
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import { cn } from '$lib/utils';

  type Props = {
    label?: string;
    /** Smaller padding for inline sections. */
    compact?: boolean;
    class?: ClassValue;
  };

  const { label = '', compact = false, class: className }: Props = $props();
</script>

<div
  class={cn(
    'flex flex-col items-center justify-center gap-3 text-center',
    compact ? 'py-8' : 'py-16',
    className
  )}
  role="status"
  aria-live="polite"
  aria-busy="true"
>
  <div class="relative flex size-12 items-center justify-center">
    <span class="absolute inset-0 rounded-full bg-primary/10" aria-hidden="true"></span>
    <LoaderCircleIcon class="relative size-8 animate-spin text-primary" strokeWidth={2.25} />
  </div>
  {#if label}
    <p class="text-sm text-muted-foreground">{label}</p>
  {/if}
</div>
