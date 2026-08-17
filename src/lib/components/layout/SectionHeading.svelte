<script lang="ts">
  import type { ClassValue } from 'svelte/elements';
  import { cn } from '$lib/utils';

  type Props = {
    title: string;
    description?: string;
    class?: ClassValue;
  };

  let { title, description, class: className }: Props = $props();
</script>

<div class={cn('flex flex-col gap-1', className)}>
  <h2 class="font-display text-xl leading-none text-foreground">
    {title}
  </h2>
  {#if description}
    <p class="font-tagline text-sm text-muted-foreground">{description}</p>
  {/if}
  <div class="mt-1 h-px w-8 bg-primary/60" aria-hidden="true"></div>
</div>
