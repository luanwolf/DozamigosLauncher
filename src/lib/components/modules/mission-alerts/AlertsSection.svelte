<script lang="ts">
  import { t } from '$lib/i18n';
  import MissionRow from '$components/modules/mission-alerts/MissionRow.svelte';
  import HudPanel from '$components/ui/hud/HudPanel.svelte';
  import type { ParsedWorldMission } from '$types/game/stw/world-info';

  type Props = {
    title: string;
    missions: ParsedWorldMission[];
    /** When true, the section is not rendered if there are no missions. */
    hideWhenEmpty?: boolean;
  };

  const { title, missions, hideWhenEmpty = false }: Props = $props();

  let visible = $state(false);
  let div = $state<HTMLDivElement>();

  $effect(() => {
    const node = div;
    if (!node) return;

    const reveal = () => {
      visible = true;
    };

    const canRender = () => {
      const { width, height } = node.getBoundingClientRect();
      return width > 0 && height > 0;
    };

    const intersection = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) reveal();
      },
      { rootMargin: '300px' }
    );

    intersection.observe(node);

    const checkLayout = () => {
      if (canRender()) reveal();
    };

    checkLayout();

    const mutation = new MutationObserver(checkLayout);
    let parent: HTMLElement | null = node;
    while (parent) {
      mutation.observe(parent, {
        attributes: true,
        attributeFilter: ['hidden', 'data-state', 'style', 'class']
      });
      parent = parent.parentElement;
    }

    return () => {
      intersection.disconnect();
      mutation.disconnect();
    };
  });
</script>

{#if hideWhenEmpty && !missions.length}
  <!-- hidden -->
{:else}
  <HudPanel flush bodyClass="p-0" title={title}>
    <div bind:this={div} class="hud-list">
      {#if !missions.length}
        <div class="px-4 py-6 text-center text-xs text-muted-foreground">
          {$t('stwMissionAlerts.noMissions')}
        </div>
      {:else if !visible}
        <div style="height: {missions.length * 36}px" class="bg-muted/40"></div>
      {:else}
        {#each missions as mission (mission.guid)}
          <MissionRow {mission} />
        {/each}
      {/if}
    </div>
  </HudPanel>
{/if}
