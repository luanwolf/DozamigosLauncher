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

<div class={cn('hud-chip', className)}>
  {@render children()}
</div>
