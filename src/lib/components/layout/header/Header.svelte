<script lang="ts">
  import { onMount } from 'svelte';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import MinusIcon from '@lucide/svelte/icons/minus';
  import SettingsIcon from '@lucide/svelte/icons/settings';
  import SquareIcon from '@lucide/svelte/icons/square';
  import XIcon from '@lucide/svelte/icons/x';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { platform } from '@tauri-apps/plugin-os';
  import { pauseDownload } from '$lib/modules/download.svelte.js';
  import { settingsStore } from '$lib/storage';
  import ActiveAccountBar from '$components/layout/ActiveAccountBar.svelte';
  import LaunchGame from '$components/layout/header/LaunchGame.svelte';
  import SidebarBurger from '$components/layout/header/SidebarBurger.svelte';
  import { Button } from '$components/ui/button';

  const appWindow = getCurrentWindow();

  let maximized = $state(false);

  async function syncMaximized() {
    maximized = await appWindow.isMaximized();
  }

  async function minimizeOrHide() {
    if (settingsStore.get().app?.hideToTray) {
      await appWindow.hide();
    } else {
      await appWindow.minimize();
    }
  }

  async function toggleMaximize() {
    await appWindow.toggleMaximize();
    await syncMaximized();
  }

  async function close() {
    await pauseDownload();
    await appWindow.close();
  }

  function onHeaderDblClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (target?.closest('button, a, input, [role="button"]')) return;
    void toggleMaximize();
  }

  onMount(() => {
    void syncMaximized();
    let unlisten: (() => void) | undefined;
    void appWindow.onResized(() => {
      void syncMaximized();
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<header
  class="app-shell-header header-glitch-edge sticky top-0 z-[60] flex min-w-0 shrink-0 items-center gap-1.5 overflow-hidden bg-sidebar/95 px-2 backdrop-blur-md select-none sm:gap-2 sm:px-4"
  data-tauri-drag-region
  ondblclick={onHeaderDblClick}
>
  <SidebarBurger />

  <ActiveAccountBar embedded />

  {#if import.meta.env.DEV}
    <span
      class="dev-glitch-badge hidden border border-primary/50 bg-primary px-1.5 py-0.5 font-display text-sm leading-none text-primary-foreground min-[700px]:inline"
    >
      DEV
    </span>
  {/if}

  <div class="ml-auto flex shrink-0 items-center gap-x-1 sm:gap-x-2">
    <div class="flex items-center gap-x-1 sm:gap-x-2">
      {#if platform() === 'windows'}
        <LaunchGame />
      {/if}

      <Button class="p-2! hover:bg-accent!" href="/settings" variant="ghost">
        <SettingsIcon class="size-5" />
      </Button>
    </div>

    <div class="hidden items-center min-[520px]:flex">
      <button
        class="glitch-target p-2 transition-colors duration-200 hover:bg-accent"
        onclick={minimizeOrHide}
        type="button"
      >
        <MinusIcon class="size-4" />
      </button>
      <button
        class="glitch-target p-2 transition-colors duration-200 hover:bg-accent"
        onclick={toggleMaximize}
        type="button"
      >
        {#if maximized}
          <CopyIcon class="size-4" />
        {:else}
          <SquareIcon class="size-4" />
        {/if}
      </button>
      <button
        class="glitch-target p-2 transition-colors duration-200 hover:bg-destructive hover:text-white"
        onclick={close}
        type="button"
      >
        <XIcon class="size-4" />
      </button>
    </div>
  </div>
</header>
