<script lang="ts">
  import { RarityColors } from '$lib/constants/stw/resources';
  import { language, t } from '$lib/i18n';
  import type { GrantedItem } from '$lib/utils/mcp-loot';
  import { resolveStwTemplateDisplay } from '$lib/utils/stw-template-display';
  import { buttonVariants } from '$components/ui/button';
  import * as Dialog from '$components/ui/dialog';

  type Props = {
    items: GrantedItem[];
    open: boolean;
    onClose: () => void;
  };

  let { items, open = $bindable(false), onClose }: Props = $props();

  const merged = $derived(
    [
      ...items
        .reduce(
          (totals, item) => totals.set(item.templateId, (totals.get(item.templateId) ?? 0) + item.quantity),
          new Map<string, number>()
        )
        .entries()
    ].map(([templateId, quantity]) => ({
      templateId,
      quantity,
      display: resolveStwTemplateDisplay(templateId, $language)
    }))
  );
</script>

<Dialog.Root onOpenChangeComplete={(isOpen) => !isOpen && onClose()} bind:open>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title>{$t('stwStore.received.title')}</Dialog.Title>
      <Dialog.Description>{$t('stwStore.received.description', { count: merged.length })}</Dialog.Description>
    </Dialog.Header>

    <div class="grid max-h-[50vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
      {#each merged as item (item.templateId)}
        {@const rarityColor = RarityColors[item.display.rarity] ?? RarityColors.c}
        <div class="flex flex-col border border-border/70 bg-card" title={item.display.name}>
          <div style="background-color: {rarityColor}12" class="relative flex h-16 items-center justify-center p-1.5">
            <img class="max-h-full max-w-full object-contain" alt="" loading="lazy" src={item.display.imageUrl} />
            {#if item.quantity > 1}
              <span class="absolute right-1 bottom-1 bg-background/80 px-1 text-[10px] font-bold tabular-nums">
                ×{item.quantity.toLocaleString($language)}
              </span>
            {/if}
          </div>
          <p class="line-clamp-2 border-t border-border/60 px-1.5 py-1 text-[10px] leading-snug">
            {item.display.name}
          </p>
        </div>
      {/each}
    </div>

    <Dialog.Footer>
      <Dialog.Close class={buttonVariants({ variant: 'default' })}>
        {$t('stwStore.received.close')}
      </Dialog.Close>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
