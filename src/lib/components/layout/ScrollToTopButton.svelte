<script lang="ts">
  import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
  import { t } from '$lib/i18n';
  import { cn } from '$lib/utils';
  import { Button } from '$components/ui/button';

  type Props = {
    scrollContainer: HTMLElement | undefined;
  };

  const SCROLL_THRESHOLD = 250;

  const { scrollContainer }: Props = $props();

  let visible = $state(false);

  function updateVisibility() {
    visible = (scrollContainer?.scrollTop ?? 0) > SCROLL_THRESHOLD;
  }

  function scrollToTop() {
    scrollContainer?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  $effect(() => {
    const el = scrollContainer;
    if (!el) {
      visible = false;
      return;
    }

    updateVisibility();
    el.addEventListener('scroll', updateVisibility, { passive: true });

    return () => {
      el.removeEventListener('scroll', updateVisibility);
    };
  });
</script>

{#if visible}
  <Button
    class={cn(
      'hud-panel fixed bottom-6 right-6 z-40 size-10 bg-card transition-opacity hover:bg-muted/50'
    )}
    onclick={scrollToTop}
    size="icon"
    variant="outline"
    aria-label={$t('scrollToTop')}
  >
    <ArrowUpIcon class="size-5" />
  </Button>
{/if}
