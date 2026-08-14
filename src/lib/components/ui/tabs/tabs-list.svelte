<script lang="ts">
  import { Tabs as TabsPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils';

  let { ref = $bindable(null), class: className, ...restProps }: TabsPrimitive.ListProps = $props();
</script>

<TabsPrimitive.List
  {...restProps}
  class={cn(
    'inline-flex h-8 w-full items-center gap-0.5 rounded-md border border-border/70 bg-card/50 p-0.5 text-muted-foreground',
    className
  )}
  data-slot="tabs-list"
  bind:ref
/>
