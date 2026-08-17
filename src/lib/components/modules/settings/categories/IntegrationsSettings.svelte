<script lang="ts">
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import FileTextIcon from '@lucide/svelte/icons/file-text';
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { toast } from 'svelte-sonner';
  import {
    EXTERNAL_INTEGRATIONS,
    INTEGRATION_CATEGORIES,
    type IntegrationStatus
  } from '$lib/constants/external-integrations';
  import { isFortniteApiConfigured } from '$lib/env';
  import { t } from '$lib/i18n';
  import { openIslandInBrowser } from '$lib/modules/discovery';
  import { fetchFnbrStats, isFnbrApiConfigured } from '$lib/modules/fnbr-api';
  import { processValidatorLog, runProbes } from '$lib/modules/process-validator';
  import { accountStore } from '$lib/storage';
  import SectionHeading from '$components/layout/SectionHeading.svelte';
  import { Badge } from '$components/ui/badge';
  import { Button } from '$components/ui/button';
  import HudPanel from '$components/ui/hud/HudPanel.svelte';
  import { Input } from '$components/ui/input';

  const activeAccount = accountStore.getActiveStore(true);

  let islandCode = $state('');
  let showDiagnostics = $state(false);

  const statusVariant: Record<IntegrationStatus, 'secondary' | 'outline' | 'default'> = {
    integrated: 'default',
    linkOnly: 'outline',
    needsLogin: 'secondary',
    needsApiKey: 'secondary'
  };

  function resolveStatus(status: IntegrationStatus): IntegrationStatus {
    if (status === 'needsApiKey' && isFortniteApiConfigured()) return 'integrated';
    if (status === 'needsLogin' && $activeAccount) return 'integrated';
    return status;
  }

  async function openIsland() {
    try {
      await openIslandInBrowser(islandCode);
    } catch {
      toast.error($t('externalIntegrations.islandCode.invalid'));
    }
  }

  async function openFortniteDbProfile() {
    const account = $activeAccount;
    if (!account) {
      toast.error($t('accountManager.selectAccount'));
      return;
    }
    await openUrl(`https://fortnitedb.com/profile/${account.accountId}`);
  }

  $effect(() => {
    void runProbes('integrations', [
      {
        id: 'fn-key',
        label: 'fortnite-api key',
        hostPath: 'fortnite-api.com (Authorization)',
        run: async () => ({ status: isFortniteApiConfigured() ? 200 : 401, empty: !isFortniteApiConfigured() })
      },
      {
        id: 'fnbr',
        label: 'fnbr.co stats',
        hostPath: 'fnbr.co/api/stats',
        run: async () => {
          if (!isFnbrApiConfigured()) return { status: 0, empty: true };
          const data = await fetchFnbrStats();
          return { status: 200, empty: !data.totalCosmetics };
        }
      }
    ]);
  });
</script>

<div class="space-y-5">
  <div class="flex flex-wrap items-center justify-between gap-2">
    <SectionHeading
      description={$t('externalIntegrations.page.description')}
      title={$t('externalIntegrations.page.title')}
    />
    <Button size="sm" variant="outline" onclick={() => (showDiagnostics = !showDiagnostics)}>
      {$t('externalIntegrations.diagnostics')}
    </Button>
  </div>

  <div class="flex flex-wrap gap-2">
    {#each [
      { href: '/br-stw/stats', label: $t('brStats.page.title') },
      { href: '/br-stw/support-creator', label: $t('supportCreator.page.title') },
      { href: '/br-stw/locker', label: $t('locker.page.title') }
    ] as link (link.href)}
      <Button href={link.href} size="sm" variant="outline">
        {link.label}
        <ArrowRightIcon class="size-3.5 opacity-60" />
      </Button>
    {/each}
  </div>

  <HudPanel class="p-4">
    <SectionHeading
      description={$t('externalIntegrations.islandCode.hint')}
      title={$t('externalIntegrations.islandCode.title')}
    />
    <div class="mt-3 flex flex-col gap-2 sm:flex-row">
      <Input
        class="h-8"
        placeholder={$t('externalIntegrations.islandCode.placeholder')}
        bind:value={islandCode}
      />
      <Button class="shrink-0" onclick={openIsland} type="button">
        <ExternalLinkIcon class="size-4" />
        {$t('externalIntegrations.islandCode.open')}
      </Button>
    </div>
    <Button class="mt-3" disabled={!$activeAccount} onclick={openFortniteDbProfile} size="sm" variant="outline">
      {$t('externalIntegrations.openProfile')}
    </Button>
  </HudPanel>

  {#if showDiagnostics}
    <HudPanel class="p-4">
      <SectionHeading class="mb-2" title={$t('externalIntegrations.diagnostics')} />
      {#if $processValidatorLog.length === 0}
        <p class="text-xs text-muted-foreground">{$t('externalIntegrations.diagnosticsEmpty')}</p>
      {:else}
        <div class="hud-list max-h-64 overflow-y-auto">
          {#each $processValidatorLog.slice(0, 20) as entry (entry.id)}
            <div class="flex items-start justify-between gap-2 px-1 py-2 text-xs">
              <div class="min-w-0">
                <p class="font-medium">{entry.label}</p>
                <p class="truncate text-muted-foreground">{entry.hostPath}</p>
                {#if entry.detail}
                  <p class="text-destructive">{entry.detail}</p>
                {/if}
              </div>
              <span class="shrink-0 tabular-nums {entry.ok ? 'text-primary' : 'text-destructive'}">
                {entry.ok ? 'ok' : entry.code} ({entry.ms}ms)
              </span>
            </div>
          {/each}
        </div>
      {/if}
    </HudPanel>
  {/if}

  {#each INTEGRATION_CATEGORIES as category (category)}
    {@const items = EXTERNAL_INTEGRATIONS.filter((item) => item.category === category)}
    {#if items.length}
      <section class="space-y-3">
        <h2 class="font-tagline text-sm text-muted-foreground">
          {$t(`externalIntegrations.categories.${category}`)}
        </h2>

        <div class="grid gap-3 md:grid-cols-2">
          {#each items as item (item.id)}
            {@const status = resolveStatus(item.status)}
            <HudPanel class="flex h-full flex-col p-4">
              <div class="flex items-start justify-between gap-2">
                <p class="font-medium">{item.name}</p>
                <Badge variant={statusVariant[status]}>
                  {$t(`externalIntegrations.status.${status}`)}
                </Badge>
              </div>
              <p class="mt-2 flex-1 text-sm text-muted-foreground">{$t(item.descriptionKey)}</p>
              <div class="mt-3 flex flex-wrap gap-2">
                {#if item.href}
                  <Button href={item.href} size="sm">
                    {$t('externalIntegrations.openCorner')}
                    <ArrowRightIcon class="size-3.5" />
                  </Button>
                {/if}
                {#if item.siteUrl}
                  <Button onclick={() => openUrl(item.siteUrl!)} size="sm" variant="outline">
                    <ExternalLinkIcon class="size-3.5" />
                    {$t('externalIntegrations.openSite')}
                  </Button>
                {/if}
                {#if item.docsUrl}
                  <Button onclick={() => openUrl(item.docsUrl!)} size="sm" variant="ghost">
                    <FileTextIcon class="size-3.5" />
                    {$t('externalIntegrations.viewDocs')}
                  </Button>
                {/if}
              </div>
            </HudPanel>
          {/each}
        </div>
      </section>
    {/if}
  {/each}

  <p class="text-center text-xs text-muted-foreground">
    {$t('externalIntegrations.reference')}
    <button
      class="text-primary underline-offset-2 hover:underline"
      onclick={() => openUrl('https://github.com/LeleDerGrasshalmi/FortniteEndpointsDocumentation')}
      type="button"
    >
      FortniteEndpointsDocumentation
    </button>
  </p>
</div>
