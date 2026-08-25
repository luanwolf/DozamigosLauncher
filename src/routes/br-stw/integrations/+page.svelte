<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    void goto(import.meta.env.DEV ? '/settings?tab=integrations' : '/settings', { replaceState: true });
  });
</script>
