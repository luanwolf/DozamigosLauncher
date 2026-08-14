<script lang="ts">
  import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
  import { t } from '$lib/i18n';
  import * as Select from '$components/ui/select';

  type CosmeticType = { id: string; name: string };

  type Props = {
    types: CosmeticType[];
    selected?: string;
  };

  let { types, selected = $bindable('') }: Props = $props();

  const selectedLabel = $derived(types.find((type) => type.id === selected)?.name);
</script>

<Select.Root allowDeselect={true} type="single" bind:value={selected}>
  <Select.Trigger class="h-10 min-w-40 rounded-none">
    <LayoutGridIcon class="size-5 shrink-0" />
    <span class="truncate not-sm:hidden">
      {selectedLabel || $t('itemShop.allTypes')}
    </span>
  </Select.Trigger>

  <Select.Content>
    {#each types as type (type.id)}
      <Select.Item value={type.id}>
        {type.name}
      </Select.Item>
    {/each}
  </Select.Content>
</Select.Root>
