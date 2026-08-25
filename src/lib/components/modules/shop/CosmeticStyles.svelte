<script lang="ts">
  import { t } from '$lib/i18n';

  export type StyleOption = {
    name: string;
    image: string;
    /** Present only for styles that fortnite.gg renders a clip for. */
    video?: string;
  };

  type Props = {
    styles: StyleOption[];
    /** Style being previewed, or null for the default turntable. */
    selected: StyleOption | null;
  };

  let { styles, selected = $bindable() }: Props = $props();
</script>

{#if styles.length}
  <div class="space-y-2">
    <h3 class="text-sm font-semibold text-foreground">
      {$t('itemShop.itemInformation.stylesTitle')}
    </h3>
    <div class="max-h-44 overflow-y-auto overflow-x-hidden pr-1 sm:max-h-56">
      <div class="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {#each styles as style (style.image)}
          <button
            class="min-w-0 space-y-1 rounded-md border p-1 text-left transition-colors hover:border-primary
              {selected?.image === style.image ? 'border-primary bg-primary/10' : 'border-border/70'}"
            onclick={() => (selected = selected?.image === style.image ? null : style)}
            type="button"
          >
            <img
              class="aspect-square w-full rounded-sm bg-muted/30 object-cover"
              alt={style.name}
              loading="lazy"
              src={style.image}
            />
            <span class="block truncate text-center text-[10px] leading-tight text-muted-foreground" title={style.name}>
              {style.name}
            </span>
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}
