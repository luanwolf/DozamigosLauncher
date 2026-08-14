<script lang="ts" module>
  let isGeneratingLink = $state(false);
</script>

<script lang="ts">
  import CopyIcon from '@lucide/svelte/icons/copy';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import { writeText } from '@tauri-apps/plugin-clipboard-manager';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { toast } from 'svelte-sonner';
  import { VBUCKS_PACKS, VBUCKS_SHOP_URL, type VbucksPack } from '$lib/constants/vbucks-packs';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { language, t } from '$lib/i18n';
  import { generateAuthenticatedGamePageUrl } from '$lib/modules/epic-web-url';
  import { accountStore } from '$lib/storage';
  import { handleError } from '$lib/utils';
  import PageContent from '$components/layout/PageContent.svelte';
  import { Button } from '$components/ui/button';

  const activeAccount = accountStore.getActiveStore(true);

  function formatPrice(brl: number): string {
    return brl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  async function openPackInBrowser(pack: VbucksPack) {
    await openStoreUrl(pack.storeUrl);
  }

  async function copyPackLink(pack: VbucksPack) {
    await copyStoreUrl(pack.storeUrl);
  }

  async function openAllPacksInBrowser() {
    await openStoreUrl(VBUCKS_SHOP_URL);
  }

  async function copyAllPacksLink() {
    await copyStoreUrl(VBUCKS_SHOP_URL);
  }

  async function openStoreUrl(storeUrl: string) {
    const account = $activeAccount;
    if (!account) {
      toast.error($t('accountManager.selectAccount'));
      return;
    }

    isGeneratingLink = true;
    try {
      const url = await generateAuthenticatedGamePageUrl(account, storeUrl);
      await openUrl(url);
    } catch (error) {
      handleError({ error, message: $t('buyVbucks.failedToOpenStore'), account });
    } finally {
      isGeneratingLink = false;
    }
  }

  async function copyStoreUrl(storeUrl: string) {
    const account = $activeAccount;
    if (!account) {
      toast.error($t('accountManager.selectAccount'));
      return;
    }

    isGeneratingLink = true;
    try {
      const url = await generateAuthenticatedGamePageUrl(account, storeUrl);
      await writeText(url);
      toast.success($t('buyVbucks.linkCopied', { account: account.displayName }));
    } catch (error) {
      handleError({ error, message: $t('buyVbucks.failedToCopyLink'), account });
    } finally {
      isGeneratingLink = false;
    }
  }
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('buyVbucks.page.description')}
  title={$t('buyVbucks.page.title')}
>
  <div class="flex w-full items-stretch gap-2">
    <Button
      class="min-w-0 flex-1"
      disabled={!$activeAccount || isGeneratingLink}
      onclick={openAllPacksInBrowser}
      variant="outline"
    >
      <ExternalLinkIcon class="size-4 shrink-0" />
      <span class="truncate">{$t('buyVbucks.openAll')}</span>
    </Button>

    <Button
      class="shrink-0"
      disabled={!$activeAccount || isGeneratingLink}
      onclick={copyAllPacksLink}
      size="icon"
      variant="outline"
    >
      {#if isGeneratingLink}
        <LoaderCircleIcon class="size-4 animate-spin" />
      {:else}
        <CopyIcon class="size-4" />
      {/if}
    </Button>
  </div>

  <div class="grid w-full grid-cols-1 items-stretch gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
    {#each VBUCKS_PACKS as pack (pack.id)}
      <article
        class="hud-panel flex h-full flex-col transition-colors hover:border-border/80"
        style="border-top: 2px solid {pack.accentColor}"
      >
        <div class="flex flex-1 flex-col items-center px-4 pt-5 pb-4">
          <div class="mb-3 flex h-5 w-full items-center justify-center">
            {#if 'bonusPercent' in pack && pack.bonusPercent}
              <span
                class="rounded-md border border-border bg-muted/50 px-1.5 py-0 text-[11px] font-medium text-muted-foreground"
              >
                {$t('buyVbucks.extraBonus', { percent: pack.bonusPercent })}
              </span>
            {/if}
          </div>

          <img
            class="size-12 shrink-0 sm:size-14"
            alt={$t('vbucks')}
            draggable="false"
            src="/resources/currency_mtxswap.png"
          />

          <p class="mt-3 text-center text-2xl leading-none font-semibold tabular-nums text-foreground">
            {pack.amount.toLocaleString($language)}
          </p>
          <p class="mt-0.5 text-xs font-medium text-muted-foreground uppercase">{$t('vbucks')}</p>

          <p class="mt-3 text-base font-semibold tabular-nums text-foreground">
            {formatPrice(pack.priceBrl)}
          </p>
          <p class="mt-0.5 text-center text-[11px] leading-snug text-muted-foreground">
            {$t('buyVbucks.availableOn')}
          </p>

          <div class="mt-auto flex w-full gap-2 pt-4">
            <Button
              class="h-8 min-w-0 flex-1 text-xs"
              disabled={!$activeAccount || isGeneratingLink}
              onclick={() => openPackInBrowser(pack)}
              size="sm"
              variant="outline"
            >
              <ExternalLinkIcon class="size-3 shrink-0" />
              <span class="truncate">{$t('buyVbucks.openOnStore')}</span>
            </Button>

            <Button
              class="size-8 shrink-0"
              disabled={!$activeAccount || isGeneratingLink}
              onclick={() => copyPackLink(pack)}
              size="icon-sm"
              variant="outline"
            >
              <CopyIcon class="size-3" />
            </Button>
          </div>
        </div>
      </article>
    {/each}
  </div>

  <p class="text-center text-xs text-muted-foreground/80">{$t('buyVbucks.epicRewards')}</p>
</PageContent>
