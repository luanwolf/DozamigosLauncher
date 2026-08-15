<script lang="ts">
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { open } from '@tauri-apps/plugin-dialog';
  import { readTextFile } from '@tauri-apps/plugin-fs';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { t } from '$lib/i18n';
  import {
    deleteWorldInfoSnapshot,
    importWorldInfoJson,
    listWorldInfoSnapshots,
    saveCurrentWorldInfo,
    type WorldInfoSnapshot
  } from '$lib/modules/world-info-files';
  import { handleError } from '$lib/utils';
  import PageContent from '$components/layout/PageContent.svelte';
  import { Button } from '$components/ui/button';

  let busy = $state(false);
  let snapshots = $state<WorldInfoSnapshot[]>([]);

  async function refresh() {
    snapshots = await listWorldInfoSnapshots();
  }

  async function saveCurrent() {
    busy = true;
    try {
      await saveCurrentWorldInfo();
      await refresh();
      toast.success($t('worldInfoVault.saved'));
    } catch (error) {
      handleError({ error, message: 'Failed to save world info' });
    } finally {
      busy = false;
    }
  }

  async function importFile() {
    busy = true;
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      });
      if (!selected || Array.isArray(selected)) return;
      const raw = await readTextFile(selected);
      await importWorldInfoJson(raw);
      await refresh();
      toast.success($t('worldInfoVault.saved'));
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_WORLD_INFO') {
        toast.error($t('worldInfoVault.invalid'));
      } else {
        handleError({ error, message: 'Failed to import world info' });
      }
    } finally {
      busy = false;
    }
  }

  async function remove(snapshot: WorldInfoSnapshot) {
    await deleteWorldInfoSnapshot(snapshot.path);
    await refresh();
    toast.success($t('worldInfoVault.deleted'));
  }

  onMount(() => {
    void refresh();
  });
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('worldInfoVault.page.description')}
  title={$t('worldInfoVault.page.title')}
>
  <div class="flex flex-wrap gap-2">
    <Button disabled={busy} loading={busy} onclick={saveCurrent}>{$t('worldInfoVault.saveCurrent')}</Button>
    <Button disabled={busy} loading={busy} onclick={importFile} variant="secondary">
      {$t('worldInfoVault.import')}
    </Button>
  </div>

  {#if !snapshots.length}
    <p class="text-sm text-muted-foreground">{$t('worldInfoVault.empty')}</p>
  {:else}
    <ul class="space-y-2">
      {#each snapshots as snapshot (snapshot.path)}
        <li class="flex items-center justify-between gap-3 rounded-none border border-border/70 px-3 py-2">
          <span class="truncate text-sm">{snapshot.name}</span>
          <Button onclick={() => remove(snapshot)} size="sm" variant="outline">{$t('worldInfoVault.delete')}</Button>
        </li>
      {/each}
    </ul>
  {/if}
</PageContent>
