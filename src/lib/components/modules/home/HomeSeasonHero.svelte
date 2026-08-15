<script lang="ts">
  import { onMount } from 'svelte';
  import CheckIcon from '@lucide/svelte/icons/check';
  import GiftIcon from '@lucide/svelte/icons/gift';
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import ShoppingBagIcon from '@lucide/svelte/icons/shopping-bag';
  import TagIcon from '@lucide/svelte/icons/tag';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { t } from '$lib/i18n';
  import { BOOK_XP_PER_LEVEL } from '$lib/modules/br-challenges';
  import type { SeasonInfo } from '$lib/modules/fortnite-season';
  import { fetchFreeGames, type FreeGame } from '$lib/modules/free-games';
  import { isFreeGameRedeemed, redeemedFreeGameIds } from '$lib/modules/free-games-owned';
  import { fetchSteamFreeGames, type SteamFreeGame } from '$lib/modules/steam-free-games';
  import { ownedAppsCache } from '$lib/stores';
  import { Button } from '$components/ui/button';
  import { Progress } from '$components/ui/progress';

  type BattlePassInfo = {
    level: number;
    xp: number;
  } | null;

  type Props = {
    season: SeasonInfo | null;
    battlePass: BattlePassInfo;
    loading?: boolean;
    requiresLogin?: boolean;
  };

  const ROTATE_MS = 9000;

  const { season, battlePass, loading = false, requiresLogin = false }: Props = $props();

  let freeGames = $state<FreeGame[]>([]);
  let steamGames = $state<SteamFreeGame[]>([]);
  let slideIndex = $state(0);

  const seasonBanner = $derived(season?.keyArt || null);
  const seasonTitle = $derived(
    season?.name || (requiresLogin ? $t('home.season.loginForTimeline') : $t('home.season.title'))
  );

  type Slide = { kind: 'season' } | { kind: 'free'; game: FreeGame } | { kind: 'steam'; game: SteamFreeGame };

  const slides = $derived.by((): Slide[] => {
    const list: Slide[] = [{ kind: 'season' }];
    for (const game of freeGames) list.push({ kind: 'free', game });
    for (const game of steamGames) list.push({ kind: 'steam', game });
    return list;
  });

  const activeIndex = $derived(slides.length ? ((slideIndex % slides.length) + slides.length) % slides.length : 0);
  const current = $derived(slides[activeIndex] ?? slides[0]!);
  const currentRedeemed = $derived(
    current.kind === 'free' ? isFreeGameRedeemed(current.game, $ownedAppsCache, $redeemedFreeGameIds) : false
  );

  const timelineBegin = $derived(season?.begin);
  const timelineEnd = $derived(season?.displayedEnd ?? season?.end);
  const hasLiveTimeline = $derived(Boolean(season?.hasTimeline && timelineBegin && timelineEnd));

  const daysRemaining = $derived.by(() => {
    if (season?.daysRemaining != null && hasLiveTimeline) return season.daysRemaining;
    return timelineEnd ? Math.max(0, Math.ceil((timelineEnd.getTime() - Date.now()) / 86_400_000)) : 0;
  });

  const progressPercent = $derived.by(() => {
    if (season?.progressPercent != null && hasLiveTimeline) return season.progressPercent;

    if (!timelineBegin || !timelineEnd) return 0;
    const total = timelineEnd.getTime() - timelineBegin.getTime();
    if (total <= 0) return 0;

    const elapsed = Date.now() - timelineBegin.getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  });

  const endsInLabel = $derived.by(() => {
    const key = daysRemaining === 1 ? 'one' : 'other';
    return $t(`home.season.endsIn.${key}`, { count: daysRemaining });
  });

  const battlePassLevelProgress = $derived.by(() => {
    if (!battlePass) return null;
    const xpInLevel = battlePass.xp % BOOK_XP_PER_LEVEL;
    return Math.min(100, Math.max(0, (xpInLevel / BOOK_XP_PER_LEVEL) * 100));
  });

  const xpInLevel = $derived(battlePass ? battlePass.xp % BOOK_XP_PER_LEVEL : 0);

  function formatEndDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function goTo(index: number) {
    if (!slides.length) return;
    slideIndex = ((index % slides.length) + slides.length) % slides.length;
  }

  onMount(() => {
    void fetchFreeGames()
      .then((games) => {
        freeGames = games;
      })
      .catch(() => {
        freeGames = [];
      });

    void fetchSteamFreeGames()
      .then((games) => {
        steamGames = games;
      })
      .catch(() => {
        steamGames = [];
      });
  });

  $effect(() => {
    const total = slides.length;
    if (total <= 1) return;

    const id = setInterval(() => {
      slideIndex = (slideIndex + 1) % total;
    }, ROTATE_MS);

    return () => clearInterval(id);
  });
</script>

<section class="storm-hero border border-border/60">
  {#each slides as slide, i (slide.kind === 'season' ? 'season' : `${slide.kind}-${slide.kind === 'steam' ? slide.game.appId : slide.game.id}`)}
    {@const src =
      slide.kind === 'free'
        ? slide.game.banner || slide.game.thumbnail || seasonBanner
        : slide.kind === 'steam'
          ? slide.game.banner || slide.game.image || seasonBanner
          : seasonBanner}
    {#if src}
      <img
        alt=""
        aria-hidden="true"
        class="storm-hero-media storm-hero-media-fade {i === activeIndex ? 'is-active' : ''}"
        decoding="async"
        loading={i === 0 ? 'eager' : 'lazy'}
        {src}
      />
    {/if}
  {/each}

  <div class="storm-hero-veil" aria-hidden="true"></div>

  <div class="storm-hero-copy">
    {#key activeIndex}
      <div class="storm-hero-slide w-full">
        {#if current.kind === 'season'}
          {#if loading}
            <div class="flex items-center gap-3 py-2">
              <LoaderCircleIcon class="size-6 animate-spin text-primary" strokeWidth={2.25} />
              <p class="text-sm text-foreground/80">{$t('loading')}</p>
            </div>
          {:else}
            <div class="flex w-full flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
              <div class="max-w-xl min-w-0 space-y-2">
                <p class="label-kicker text-primary">{$t('home.season.kicker')}</p>
                <h1 class="font-display text-3xl leading-none text-foreground sm:text-4xl md:text-5xl">
                  {seasonTitle}
                </h1>
                <p class="text-sm text-foreground/85 sm:text-base">
                  {hasLiveTimeline ? endsInLabel : $t('home.season.datesUnavailable')}
                </p>
                {#if hasLiveTimeline}
                  <Progress class="h-1.5 max-w-xs bg-background/50" value={progressPercent} />
                {/if}
                <div class="pt-2">
                  <Button href="/br-stw/item-shop" size="lg">
                    <ShoppingBagIcon class="size-4" />
                    {$t('home.itemShop.open')}
                  </Button>
                </div>
              </div>

              {#if battlePass}
                <div class="storm-hero-level shrink-0 sm:mb-1">
                  <p class="text-sm font-semibold tracking-wide text-foreground">
                    {$t('home.season.battlePass.levelCurrent', { level: battlePass.level })}
                  </p>
                  <Progress class="mt-2 h-1.5 bg-background/50" value={battlePassLevelProgress ?? 0} />
                  <p class="mt-1.5 text-xs text-muted-foreground">
                    {$t('home.season.battlePass.xpInLevel', {
                      current: xpInLevel.toLocaleString(),
                      total: BOOK_XP_PER_LEVEL.toLocaleString()
                    })}
                  </p>
                </div>
              {/if}
            </div>
          {/if}
        {:else if current.kind === 'steam'}
          <div class="max-w-xl space-y-2">
            <p class="label-kicker text-primary">{$t('home.steamFreeGames.kicker')}</p>
            <h1 class="font-display text-3xl leading-none text-foreground sm:text-4xl md:text-5xl">
              {current.game.title}
            </h1>
            <p class="text-sm text-foreground/85 sm:text-base">
              {#if current.game.originalPrice}
                <span class="line-through opacity-70">{current.game.originalPrice}</span>
              {/if}
              <span class="ml-2 font-semibold text-emerald-400">{$t('home.steamFreeGames.free')}</span>
            </p>
            <div class="flex flex-wrap gap-2 pt-2">
              <Button onclick={() => openUrl(current.kind === 'steam' ? current.game.storeUrl : '')} size="lg">
                <GiftIcon class="size-4" />
                {$t('home.steamFreeGames.claim')}
              </Button>
            </div>
          </div>
        {:else}
          <div class="max-w-xl space-y-2">
            <p class="label-kicker text-primary">{$t('home.freeGames.kicker')}</p>
            <h1 class="font-display text-3xl leading-none text-foreground sm:text-4xl md:text-5xl">
              {current.game.title}
            </h1>
            <p class="text-sm text-foreground/85 sm:text-base">
              {$t('home.freeGames.endsAt', { date: formatEndDate(current.game.endDate) })}
            </p>
            <div class="flex flex-wrap gap-2 pt-2">
              {#if currentRedeemed}
                <Button disabled size="lg" variant="secondary">
                  <CheckIcon class="size-4" />
                  {$t('freeGames.statusClaimed')}
                </Button>
              {:else}
                <Button href="/downloader/free-games" size="lg">
                  <GiftIcon class="size-4" />
                  {$t('home.freeGames.claim')}
                </Button>
              {/if}
              <Button href="/downloader/free-games" size="lg" variant="outline">
                <TagIcon class="size-4" />
                {$t('home.freeGames.viewAll')}
              </Button>
            </div>
          </div>
        {/if}
      </div>
    {/key}
  </div>

  {#if slides.length > 1}
    <div class="storm-hero-dots" role="tablist" aria-label="Hero">
      {#each slides as _, i (i)}
        <button
          aria-label={`Slide ${i + 1}`}
          aria-selected={i === activeIndex}
          class="storm-hero-dot {i === activeIndex ? 'is-active' : ''}"
          onclick={() => goTo(i)}
          role="tab"
          type="button"
        ></button>
      {/each}
    </div>
  {/if}
</section>
