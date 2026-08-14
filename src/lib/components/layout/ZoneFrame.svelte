<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { zoneForPath } from '$lib/constants/sidebar';
  import { t } from '$lib/i18n';
  import { accountStore, settingsStore } from '$lib/storage';
  import { cn } from '$lib/utils';

  const activeAccount = accountStore.getActiveStore(true);
  const zone = $derived(zoneForPath(page.url.pathname));
  const show = $derived(!zone.deck);

  let narrow = $state(false);

  onMount(() => {
    const mq = window.matchMedia('(max-width: 899px)');
    narrow = mq.matches;
    const onChange = () => {
      narrow = mq.matches;
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  });

  const chips = $derived(
    zone.deck
      ? []
      : zone.items.filter((item) => {
          if (item.id === 'settings') return true;
          const menu = $settingsStore.customizableMenu as Record<string, boolean | undefined> | undefined;
          return menu?.[item.id] !== false;
        })
  );
</script>

{#if show}
  <div class="zone-ribbon mb-3 space-y-3 border-b border-border/40 pb-3 sm:mb-4">
    <div class="flex items-end justify-between gap-3">
      <div class="min-w-0">
        <p class="label-kicker text-primary">{$t('zones.panelLabel')}</p>
        <a class="font-display text-xl leading-none text-foreground hover:text-primary sm:text-2xl" href={zone.href}>
          {$t(`zones.${zone.id}.title`)}
        </a>
        <p class="mt-1 hidden max-w-xl text-sm text-muted-foreground sm:block">
          {$t(`zones.${zone.id}.blurb`)}
        </p>
      </div>
      <a
        class="shrink-0 border border-border px-2.5 py-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase hover:border-primary hover:text-primary"
        href="/inicio"
      >
        {$t('zones.backToDeck')}
      </a>
    </div>

    {#if narrow && chips.length}
      <div class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
        {#each chips as item (item.id)}
          {@const isActive = page.url.pathname === item.href}
          {@const isDisabled = item.requiresLogin && !$activeAccount}
          <a
            class={cn(
              'shrink-0 border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap',
              isActive
                ? 'border-primary bg-primary/15 text-foreground'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
              isDisabled && 'pointer-events-none opacity-40'
            )}
            href={isDisabled ? undefined : item.href}
            aria-disabled={isDisabled}
          >
            {$t(`${item.id}.page.title`)}
          </a>
        {/each}
      </div>
    {/if}
  </div>
{/if}
