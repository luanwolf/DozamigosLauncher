<script lang="ts">
  import type { ClassValue } from 'svelte/elements';
  import { Progress as ProgressPrimitive } from 'bits-ui';
  import { cn, type WithoutChildrenOrChild } from '$lib/utils';

  type Props = WithoutChildrenOrChild<ProgressPrimitive.RootProps> & {
    indicatorClass?: ClassValue;
  };

  let { ref = $bindable(null), class: className, indicatorClass, max = 100, value, ...restProps }: Props = $props();
</script>

<ProgressPrimitive.Root
  {...restProps}
  class={cn('relative h-1.5 w-full overflow-hidden bg-muted', className)}
  data-slot="progress"
  {max}
  {value}
  bind:ref
>
  <div
    style="transform: translateX(-{100 - (100 * (value || 0)) / (max || 1)}%)"
    class={cn('size-full flex-1 bg-[var(--glow-magenta)] transition-all', indicatorClass)}
    data-slot="progress-indicator"
  ></div>
</ProgressPrimitive.Root>
