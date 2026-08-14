<script lang="ts">
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import type { FortniteNewsItem } from '$lib/modules/fortnite-api';
  import { t } from '$lib/i18n';
  import { cn } from '$lib/utils';
  import HudPanel from '$components/ui/hud/HudPanel.svelte';
  import { Button } from '$components/ui/button';

  type Slide = FortniteNewsItem & { image: string };

  type Props = {
    title: string;
    items: FortniteNewsItem[];
    loading?: boolean;
    error?: boolean;
  };

  const AUTOPLAY_MS = 30_000;

  const { title, items, loading = false, error = false }: Props = $props();

  let activeIndex = $state(0);

  const slides = $derived.by((): Slide[] =>
    items.map((item) => ({
      ...item,
      image: item.image || item.tileImage || ''
    }))
  );

  const slideCount = $derived(slides.length);
  const activeSlide = $derived(slides[activeIndex]);
  const canNavigate = $derived(slideCount > 1);

  function goTo(index: number) {
    if (!slideCount) return;
    activeIndex = ((index % slideCount) + slideCount) % slideCount;
  }

  function prev() {
    goTo(activeIndex - 1);
  }

  function next() {
    goTo(activeIndex + 1);
  }

  $effect(() => {
    items;
    activeIndex = 0;
  });

  $effect(() => {
    if (loading || error || slideCount <= 1) return;

    const intervalId = setInterval(() => {
      next();
    }, AUTOPLAY_MS);

    return () => clearInterval(intervalId);
  });
</script>

<HudPanel class="flex h-full flex-col" flush bodyClass="flex min-h-0 flex-1 flex-col p-4">
  {#snippet header()}
    <h3 class="min-w-0 truncate text-sm font-medium text-foreground">{title}</h3>
  {/snippet}

  {#snippet actions()}
    {#if !loading && !error && canNavigate}
      <div class="flex shrink-0 items-center gap-0.5">
        <span class="mr-1 text-xs tabular-nums text-muted-foreground">
          {activeIndex + 1}/{slideCount}
        </span>
        <Button aria-label={$t('home.news.previous')} onclick={prev} size="icon-sm" variant="ghost">
          <ChevronLeftIcon class="size-4" />
        </Button>
        <Button aria-label={$t('home.news.next')} onclick={next} size="icon-sm" variant="ghost">
          <ChevronRightIcon class="size-4" />
        </Button>
      </div>
    {/if}
  {/snippet}

  {#if loading}
    <div class="flex flex-1 animate-pulse flex-row items-start gap-4">
      <div class="aspect-video w-36 shrink-0 bg-muted/40 sm:w-44 md:w-52"></div>
      <div class="min-w-0 flex-1 space-y-3">
        <div class="h-4 w-2/3 rounded bg-muted"></div>
        <div class="space-y-2">
          <div class="h-3 w-full rounded bg-muted"></div>
          <div class="h-3 w-full rounded bg-muted"></div>
          <div class="h-3 w-4/5 rounded bg-muted"></div>
        </div>
      </div>
    </div>
  {:else if error}
    <p class="flex flex-1 items-center justify-center text-center text-sm text-destructive">
      {$t('home.news.loadFailed')}
    </p>
  {:else if !activeSlide}
    <p class="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
      {$t('home.news.empty')}
    </p>
  {:else}
    <div class="flex flex-1 flex-col gap-3">
      <div class="flex min-h-0 flex-1 flex-row items-start gap-4">
        {#if activeSlide.image}
          <div class="relative w-36 shrink-0 overflow-hidden sm:w-44 md:w-52">
            {#key activeSlide.id}
              <img
                class="aspect-video w-full object-cover"
                alt={activeSlide.title}
                decoding="async"
                loading={activeIndex === 0 ? 'eager' : 'lazy'}
                src={activeSlide.image}
              />
            {/key}
          </div>
        {/if}

        <div class="flex min-w-0 flex-1 flex-col gap-2">
          {#key activeSlide.id}
            <h4 class="text-base font-semibold leading-snug text-foreground">{activeSlide.title}</h4>
            <p class="line-clamp-6 text-sm leading-relaxed text-muted-foreground">
              {activeSlide.body}
            </p>
          {/key}
        </div>
      </div>

      {#if canNavigate}
        <div class="flex justify-center gap-1.5 pt-1">
          {#each slides as slide, index (slide.id)}
            <button
              aria-current={index === activeIndex ? 'true' : undefined}
              aria-label={$t('home.news.goToSlide', { index: index + 1 })}
              class={cn(
                'size-1.5 rounded-full transition-colors',
                index === activeIndex ? 'bg-primary' : 'bg-muted-foreground/25 hover:bg-muted-foreground/40'
              )}
              onclick={() => goTo(index)}
              type="button"
            ></button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</HudPanel>
