<script lang="ts">
  import { Tabs as TabsPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils';

  let { ref = $bindable(null), class: className, ...restProps }: TabsPrimitive.TriggerProps = $props();
</script>

<TabsPrimitive.Trigger
  {...restProps}
  class={cn(
    'relative cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
    'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
    'data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-xs',
    'disabled:cursor-not-allowed disabled:opacity-50',
    className
  )}
  data-slot="tabs-trigger"
  bind:ref
/>
