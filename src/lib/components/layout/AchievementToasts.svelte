<script lang="ts">
  import XIcon from '@lucide/svelte/icons/x';
  import { achievementToasts, dismissAchievement } from '$lib/stores/achievement-toasts';
  import { Button } from '$components/ui/button';
</script>

<div class="achievement-host pointer-events-none fixed inset-x-0 z-100 flex flex-col items-center gap-2 px-3">
  {#each $achievementToasts as toast (toast.id)}
    <div
      class="glitch-toast glitch-toast-drop hud-panel pointer-events-auto flex w-[min(26rem,100%)] items-start gap-2 px-3.5 py-2.5"
    >
      <div class="min-w-0 flex-1">
        <p
          class="glitch-toast-title font-display truncate text-base leading-none text-foreground"
          data-text={toast.title}
        >
          {toast.title}
        </p>

        {#if toast.message}
          <p class="mt-1 line-clamp-2 text-sm text-muted-foreground">{toast.message}</p>
        {/if}

        {#if toast.progress !== undefined}
          <div class="achievement-rail mt-2">
            <div class="achievement-rail-fill" style="width: {Math.max(0, Math.min(100, toast.progress))}%"></div>
          </div>
        {/if}

        {#if toast.actions?.length}
          <div class="mt-2.5 flex flex-wrap gap-2">
            {#each toast.actions as action (action.id)}
              <Button onclick={() => action.onClick()} size="sm" variant={action.primary ? 'default' : 'outline'}>
                {action.label}
              </Button>
            {/each}
          </div>
        {/if}
      </div>

      <button
        class="shrink-0 p-1.5 text-muted-foreground hover:text-foreground"
        aria-label="Fechar"
        onclick={() => dismissAchievement(toast.id)}
        type="button"
      >
        <XIcon class="size-4" />
      </button>
    </div>
  {/each}
</div>

<style>
  .achievement-host {
    top: calc(var(--app-header-height) + 0.75rem);
  }

  .achievement-rail {
    height: 3px;
    background: oklch(0.3 0.05 265);
  }

  .achievement-rail-fill {
    height: 100%;
    background: var(--glow-magenta);
    transition: width 0.2s ease;
  }

  @media (prefers-reduced-motion: reduce) {
    .achievement-rail-fill {
      transition: none;
    }
  }
</style>
