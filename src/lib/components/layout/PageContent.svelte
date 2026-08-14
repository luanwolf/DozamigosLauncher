<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import { cn } from '$lib/utils';

  type Props = {
    title?: string | Snippet;
    description?: string | Snippet;
    /** Renders on the right, aligned with the page title (e.g. refresh, balance). */
    actions?: Snippet;
    class?: ClassValue;
    /** Centers page content vertically and horizontally (narrow forms, tool pages). */
    center?: boolean;
    /** Extra classes on the centered wrapper (e.g. `max-w-4xl` for wider layouts). */
    centerClass?: ClassValue;
    /** Hide the default page chrome (for full-bleed heroes). */
    bare?: boolean;
    children: Snippet;
  };

  const {
    title,
    description,
    actions,
    class: className,
    center = false,
    centerClass,
    bare = false,
    children
  }: Props = $props();
</script>

<div
  class={cn(
    'page-enter',
    center && 'mx-auto flex w-full flex-col',
    center && (centerClass || 'min-h-full max-w-lg items-center justify-center'),
    centerClass
  )}
>
  {#if !bare && (title || description || actions)}
    <div class="flex w-full flex-col gap-2">
      {#if title || actions}
        <div class="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
          {#if title}
            <div class="min-w-0">
              {#if typeof title === 'string'}
                <h2 class="font-display text-2xl leading-none text-foreground sm:text-3xl md:text-4xl">{title}</h2>
              {:else}
                {@render title()}
              {/if}
            </div>
          {/if}

          {#if actions}
            <div class="flex flex-wrap items-center justify-end gap-2">
              {@render actions()}
            </div>
          {/if}
        </div>
      {/if}

      {#if description}
        {#if typeof description === 'string'}
          <p class="max-w-2xl text-sm text-muted-foreground">{description}</p>
        {:else}
          {@render description()}
        {/if}
      {/if}

      <div class="mt-1 h-1 w-14 bg-primary" aria-hidden="true"></div>
    </div>
  {/if}

  <div class={cn('hud-section-stack w-full', !bare && (title || description || actions) && 'mt-5', className)}>
    {@render children()}
  </div>
</div>
