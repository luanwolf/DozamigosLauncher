<script lang="ts">
  import type { Component } from 'svelte';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import CodeXmlIcon from '@lucide/svelte/icons/code-xml';
  import DownloadIcon from '@lucide/svelte/icons/download';
  import GlobeIcon from '@lucide/svelte/icons/globe';
  import SettingsIcon from '@lucide/svelte/icons/settings';
  import SlidersVertical from '@lucide/svelte/icons/sliders-vertical';
  import UsersIcon from '@lucide/svelte/icons/users';
  import { platform } from '@tauri-apps/plugin-os';
  import { t } from '$lib/i18n';
  import { accountStore } from '$lib/storage';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import PageContent from '$components/layout/PageContent.svelte';
  import AccountSettings from '$components/modules/settings/categories/AccountSettings.svelte';
  import AdvancedSettings from '$components/modules/settings/categories/AdvancedSettings.svelte';
  import CustomizableMenu from '$components/modules/settings/categories/CustomizableMenu.svelte';
  import DownloaderSettings from '$components/modules/settings/categories/DownloaderSettings.svelte';
  import GeneralSettings from '$components/modules/settings/categories/GeneralSettings.svelte';
  import IntegrationsSettings from '$components/modules/settings/categories/IntegrationsSettings.svelte';
  import HudPanel from '$components/ui/hud/HudPanel.svelte';
  import { Separator } from '$components/ui/separator';
  import * as Tabs from '$components/ui/tabs';
  import type { LucideIcon } from '$types/lucide';

  type Category = {
    id: string;
    name: string;
    icon: LucideIcon;
    disabled?: boolean;
    bare?: boolean;
    component: Component;
  };

  const categories = $derived<Category[]>(
    [
      {
        id: 'general',
        name: $t('settings.tabs.general'),
        icon: SettingsIcon,
        component: GeneralSettings
      },
      {
        id: 'accounts',
        name: $t('settings.tabs.accounts'),
        icon: UsersIcon,
        disabled: !$accountStore.accounts.length,
        component: AccountSettings
      },
      {
        id: 'customizableMenu',
        name: $t('settings.tabs.customizableMenu'),
        icon: SlidersVertical,
        component: CustomizableMenu
      },
      platform() === 'windows' && {
        id: 'downloader',
        name: $t('settings.tabs.downloader'),
        icon: DownloadIcon,
        component: DownloaderSettings
      },
      {
        id: 'advanced',
        name: $t('settings.tabs.advanced'),
        icon: CodeXmlIcon,
        component: AdvancedSettings
      },
      import.meta.env.DEV && {
        id: 'integrations',
        name: $t('settings.tabs.integrations'),
        icon: GlobeIcon,
        bare: true,
        component: IntegrationsSettings
      }
    ].filter((x) => !!x)
  );

  let tab = $state('general');

  onMount(() => {
    const q = page.url.searchParams.get('tab');
    if (q && categories.some((c) => c.id === q)) tab = q;
  });
</script>

<PageContent center centerClass={HUD_PAGE_WIDTH} description={$t('settings.description')} title={$t('settings.title')}>
  <Tabs.Root class="flex flex-col gap-4" bind:value={tab}>
    <Tabs.List>
      {#each categories as category (category.id)}
        <Tabs.Trigger class="flex items-center justify-center gap-2" disabled={category.disabled} value={category.id}>
          <category.icon class="size-4 not-sm:size-5" />
          <span class="not-sm:hidden">
            {category.name}
          </span>
        </Tabs.Trigger>
      {/each}
    </Tabs.List>

    <Separator />

    {#each categories as category (category.id)}
      <Tabs.Content class="flex-1 overflow-y-auto" value={category.id}>
        {#if category.bare}
          <category.component />
        {:else}
          <HudPanel>
            <category.component />
          </HudPanel>
        {/if}
      </Tabs.Content>
    {/each}
  </Tabs.Root>
</PageContent>
