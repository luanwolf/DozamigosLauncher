<script lang="ts">
  import FilterIcon from '@lucide/svelte/icons/filter';
  import { t } from '$lib/i18n';
  import * as Select from '$components/ui/select';
  import type { ShopFilter } from '$types/shop';

  const filters: { label: string; value: ShopFilter }[] = $derived([
    { label: $t('itemShop.filters.new'), value: 'new' },
    { label: $t('itemShop.filters.leavingSoon'), value: 'leavingSoon' },
    { label: $t('itemShop.filters.longestWait'), value: 'longestWait' },
    { label: $t('itemShop.filters.wishlist'), value: 'wishlist' },
    { label: $t('itemShop.filters.affordable'), value: 'affordable' }
  ]);

  type Props = {
    value?: ShopFilter[];
  };

  let { value = $bindable() }: Props = $props();
</script>

<Select.Root allowDeselect={true} type="multiple" bind:value>
  <Select.Trigger class="h-10 min-w-40 rounded-none">
    <FilterIcon class="size-5" />
    <span class="not-sm:hidden">
      {filters.find((x) => x.value === value?.at(-1))?.label || $t('itemShop.selectFilter')}
    </span>
  </Select.Trigger>

  <Select.Content>
    {#each filters as filter (filter.value)}
      <Select.Item value={filter.value}>
        {filter.label}
      </Select.Item>
    {/each}
  </Select.Content>
</Select.Root>
