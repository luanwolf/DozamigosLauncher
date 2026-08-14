<script lang="ts">
  import FriendCardSkeleton from '$components/modules/friends/skeletons/FriendCardSkeleton.svelte';
</script>

<div class="grid grid-cols-3 gap-2">
  <!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
  {#each Array(12) as _, index (index)}
    <FriendCardSkeleton />
  {/each}
</div>
