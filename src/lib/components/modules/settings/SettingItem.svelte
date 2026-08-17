<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Label } from '$components/ui/label';

  type Props = {
    title: string;
    description?: string;
    labelFor?: string;
    orientation: 'horizontal' | 'vertical';
    children: Snippet;
  };

  const { title, description, labelFor, orientation, children }: Props = $props();
</script>

<div
  class={['flex', orientation === 'horizontal' ? 'flex-row items-center justify-between gap-x-4' : 'flex-col gap-y-2']}
>
  <Label class="flex flex-col items-start gap-1" for={labelFor}>
    <span class="font-display text-lg leading-none text-foreground">{title}</span>
    {#if description}
      <span class="font-tagline text-sm font-normal text-muted-foreground">{description}</span>
    {/if}
  </Label>

  {@render children()}
</div>
