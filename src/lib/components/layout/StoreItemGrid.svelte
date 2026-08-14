<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import { cn } from '$lib/utils';

  type StoreItemGridProps = {
    /** `br` — cards quadrados da loja BR; `stw` — cards altos da loja STW */
    variant: 'br' | 'stw';
    class?: ClassValue;
    children: Snippet;
  };

  let { variant, class: className, children }: StoreItemGridProps = $props();
</script>

<!--
  auto-fill reflows columns as the main content area grows or shrinks
  (sidebar open/collapsed, window resize on desktop).
-->
<div
  class={cn(
    'grid w-full gap-5 sm:gap-6',
    variant === 'br' &&
      '[grid-template-columns:repeat(auto-fill,minmax(min(100%,12rem),1fr))]',
    variant === 'stw' &&
      'items-stretch gap-3 sm:gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,13rem),1fr))]',
    className
  )}
>
  {@render children()}
</div>
