<script lang="ts">
  import { language } from '$lib/i18n';

  type Props = {
    name?: string;
    icon: string;
    amount?: number;
    /** When set, shown instead of the numeric amount (e.g. weekly supercharger type). */
    value?: string;
  };

  const { name, icon, amount = 0, value }: Props = $props();
</script>

<div class="hud-stat-cell">
  <img class="size-10 shrink-0 object-contain" alt={name} src={icon} />
  <div class="min-w-0">
    <p class="truncate text-sm font-semibold text-foreground tabular-nums">
      {value ?? amount.toLocaleString($language)}
    </p>
    {#if name}
      <p class="truncate text-xs text-muted-foreground not-xs:hidden">{name}</p>
    {/if}
  </div>
</div>
