<script lang="ts">
  import { onMount } from 'svelte';
  import { on } from 'svelte/events';
  import { getVersion } from '@tauri-apps/api/app';
  import { page } from '$app/state';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import DownloadIcon from '@lucide/svelte/icons/download';
  import appIcon from '$lib/assets/app-icon.png';
  import { APP_VERSION } from '$lib/constants/app';
  import { NavZones, zoneForPath, type NavZone } from '$lib/constants/sidebar';
  import { t } from '$lib/i18n';
  import { accountStore } from '$lib/storage';
  import { pendingLauncherUpdate } from '$lib/stores/pending-launcher-update';
  import { cn } from '$lib/utils';
  import { Button } from '$components/ui/button';
  import * as Sidebar from '$components/ui/sidebar';
  import * as Tooltip from '$components/ui/tooltip';

  const sidebar = Sidebar.useSidebar();
  const activeAccount = accountStore.getActiveStore(true);

  const activeZone = $derived(zoneForPath(page.url.pathname));

  /** Hide side panel under ~Steam Deck half / narrow laptop — keep rail only. */
  let wideEnough = $state(true);
  let appVersion = $state(APP_VERSION);

  onMount(() => {
    void getVersion()
      .then((v) => {
        appVersion = v;
      })
      .catch(() => {});

    const mq = window.matchMedia('(min-width: 900px)');
    wideEnough = mq.matches;
    const onChange = () => {
      wideEnough = mq.matches;
    };
    return on(mq, 'change', onChange);
  });

  function isZoneVisible(zone: NavZone) {
    return !zone.hidden;
  }

  const panelItems = $derived(activeZone.deck ? [] : activeZone.items);

  const showPanel = $derived(panelItems.length > 0 && wideEnough);
  const shellWidth = $derived(showPanel ? '18.25rem' : '3.75rem');
</script>

<Sidebar.Root
  style="--sidebar-width: {shellWidth}; width: {shellWidth};"
  class="border-r border-sidebar-border bg-sidebar transition-[width] duration-200"
  collapsible="none"
>
  <div class="flex h-full min-h-0 w-full">
    <div class="zone-rail flex w-[3.75rem] shrink-0 flex-col border-r border-sidebar-border">
      <a
        class="app-shell-header flex shrink-0 items-center justify-center border-b border-sidebar-border"
        aria-label="Dozamigos"
        href="/inicio"
      >
        <img class="size-9 object-contain" alt="Dozamigos" decoding="async" src={appIcon} />
      </a>

      <nav class="flex flex-1 flex-col gap-1 p-1.5" aria-label="Zonas Dozamigos">
        {#each NavZones as zone (zone.id)}
          {#if isZoneVisible(zone)}
            {@const isActive = activeZone.id === zone.id}
            <Tooltip.Root>
              <Tooltip.Trigger>
                <a
                  class={cn(
                    'zone-rail-btn glitch-target flex size-11 items-center justify-center transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={$t(`zones.${zone.id}.title`)}
                  href={zone.href}
                  onclick={() => sidebar.setOpenMobile(false)}
                >
                  <zone.icon class="size-5" />
                </a>
              </Tooltip.Trigger>
              <Tooltip.Content side="right">{$t(`zones.${zone.id}.title`)}</Tooltip.Content>
            </Tooltip.Root>
          {/if}
        {/each}
      </nav>

      <div class="flex flex-col gap-1.5 border-t border-sidebar-border p-1.5">
        {#if $pendingLauncherUpdate}
          {@const pending = $pendingLauncherUpdate}
          <Tooltip.Root>
            <Tooltip.Trigger>
              <button
                class="update-pill zone-rail-btn glitch-target flex size-11 items-center justify-center text-[var(--glow-magenta)] transition-colors hover:bg-sidebar-accent"
                aria-label={$t('updater.pending', { version: pending.version })}
                onclick={() => pending.reopen()}
                type="button"
              >
                <DownloadIcon class="size-5" />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content side="right">
              {$t('updater.pending', { version: pending.version })}
            </Tooltip.Content>
          </Tooltip.Root>
        {/if}

        <div class="flex flex-col items-center gap-0.5">
          <Tooltip.Root>
            <Tooltip.Trigger>
              <a
                class="zone-rail-btn glitch-target flex size-11 items-center justify-center text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                aria-label={$t('sidebar.externalLinks.repository')}
                href="https://github.com/luanwolf/DozamigosLauncher"
                onclick={(event) => {
                  event.preventDefault();
                  void openUrl('https://github.com/luanwolf/DozamigosLauncher');
                }}
              >
                <img class="size-5" alt="" src="/icons/github.svg" />
              </a>
            </Tooltip.Trigger>
            <Tooltip.Content side="right">
              {$t('sidebar.externalLinks.repository')}
            </Tooltip.Content>
          </Tooltip.Root>
          <span
            class="max-w-[3.25rem] truncate text-center text-[9px] leading-none tabular-nums text-muted-foreground/65"
            aria-label="{$t('sidebar.version')} {appVersion}"
            title="{$t('sidebar.version')} {appVersion}"
          >
            v{appVersion}
          </span>
        </div>
      </div>
    </div>

    {#if showPanel}
      <div class="flex min-w-0 flex-1 flex-col">
        <div class="app-shell-header flex shrink-0 flex-col justify-center border-b border-sidebar-border px-3">
          <p class="label-kicker text-primary">{$t('zones.panelLabel')}</p>
          <p class="font-display text-2xl leading-none text-foreground">
            {$t(`zones.${activeZone.id}.title`)}
          </p>
        </div>

        <Sidebar.Content class="gap-0.5 px-2 py-3">
          <Sidebar.Menu class="gap-0.5">
            {#each panelItems as item (item.id)}
              {@const isActive = page.url.pathname === item.href}
              {@const isDisabled = item.requiresLogin && !$activeAccount}
              {@const Icon = item.icon}

              <Sidebar.MenuItem>
                <Sidebar.MenuButton {isActive}>
                  {#snippet child({ props })}
                    <Tooltip.Root>
                      <Tooltip.Trigger class="w-full {isDisabled && 'cursor-default'}">
                        <Button
                          {...props}
                          class={cn(
                            'relative h-9 w-full justify-start gap-2.5 rounded-none px-2.5 text-sm font-medium',
                            isActive
                              ? 'bg-sidebar-accent text-foreground before:absolute before:inset-y-1.5 before:left-0 before:w-1 before:bg-primary'
                              : 'text-foreground/70 hover:bg-sidebar-accent/80 hover:text-foreground'
                          )}
                          disabled={isDisabled}
                          href={item.href}
                          onclick={() => sidebar.setOpenMobile(false)}
                          size="sm"
                          variant="ghost"
                        >
                          <Icon class="size-4 shrink-0 opacity-80" />
                          <span class="truncate">{$t(`${item.id}.page.title`)}</span>
                        </Button>
                      </Tooltip.Trigger>
                      {#if isDisabled}
                        <Tooltip.Content>{$t('sidebar.loginRequired')}</Tooltip.Content>
                      {/if}
                    </Tooltip.Root>
                  {/snippet}
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            {/each}
          </Sidebar.Menu>
        </Sidebar.Content>
      </div>
    {/if}
  </div>
</Sidebar.Root>

<style>
  /* Slow breathing so it reads as "pending", not as an error blink. */
  .update-pill {
    animation: update-pill-breathe 2.4s ease-in-out infinite;
  }

  @keyframes update-pill-breathe {
    0%,
    100% {
      opacity: 0.7;
      filter: drop-shadow(0 0 0 transparent);
    }
    50% {
      opacity: 1;
      filter: drop-shadow(0 0 6px var(--glow-magenta));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .update-pill {
      animation: none;
      opacity: 1;
    }
  }
</style>
