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

<div
  class={cn(
    'grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-6',
    variant === 'stw' && 'items-stretch',
    className
  )}
>
  {@render children()}
</div>
