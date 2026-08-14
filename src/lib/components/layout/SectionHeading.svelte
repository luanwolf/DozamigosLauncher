<script lang="ts">
  import type { ClassValue } from 'svelte/elements';
  import { cn } from '$lib/utils';

  type Props = {
    title: string;
    class?: ClassValue;
  };

  let { title, class: className }: Props = $props();
</script>

<div class={cn('flex flex-col gap-1', className)}>
  <h2 class="text-base font-semibold tracking-tight text-foreground sm:text-lg">
    {title}
  </h2>
  <div class="h-px w-8 bg-primary/60" aria-hidden="true"></div>
</div>
