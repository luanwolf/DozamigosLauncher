<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    if (import.meta.env.DEV) {
      void goto('/settings?tab=integrations', { replaceState: true });
    } else {
      void goto('/settings', { replaceState: true });
    }
  });
</script>
