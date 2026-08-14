<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import { cn } from '$lib/utils';

  type Props = {
    class?: ClassValue;
    children: Snippet;
  };

  let { class: className, children }: Props = $props();
</script>

<div class={cn('hud-toolbar flex flex-wrap items-center gap-3 sm:gap-4', className)}>
  {@render children()}
</div>
