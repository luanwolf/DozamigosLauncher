<script lang="ts">
  import MissionRowSkeleton from '$components/modules/mission-alerts/skeletons/MissionRowSkeleton.svelte';

  type Props = {
    rows?: number;
  };

  const { rows = 5 }: Props = $props();
</script>

<div class="hud-panel overflow-hidden">
  <div class="hud-panel-header">
    <div class="skeleton-loader h-4 w-40 rounded"></div>
  </div>

  <div class="hud-list">
    <MissionRowSkeleton count={rows} />
  </div>
</div>
