<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { t } from '$lib/i18n';
  import { saveMatchmakingFile, stwNewsProfileUrl, trackPlayer } from '$lib/modules/matchmaking-track';
  import { accountStore } from '$lib/storage';
  import { handleError } from '$lib/utils';
  import PageContent from '$components/layout/PageContent.svelte';
  import { Button } from '$components/ui/button';
  import { Input } from '$components/ui/input';
  import { Label } from '$components/ui/label';

  const activeAccount = accountStore.getActiveStore(true);

  let query = $state('');
  let busy = $state(false);
  let result = $state<{
    accountId: string;
    displayName: string;
    sessions: Record<string, unknown>[];
    savedPath?: string;
  } | null>(null);

  async function search() {
    if (!$activeAccount || !query.trim()) return;
    busy = true;
    result = null;
    try {
      const tracked = await trackPlayer($activeAccount, query.trim());
      result = {
        accountId: tracked.user.accountId,
        displayName: tracked.user.displayName,
        sessions: tracked.sessions
      };
      if (!tracked.sessions.length) toast.info($t('matchmakingTrack.notInMission'));
    } catch (error) {
      handleError({ error, message: 'Matchmaking track failed', account: $activeAccount });
    } finally {
      busy = false;
    }
  }

  async function save() {
    if (!result?.sessions.length) return;
    try {
      const savedPath = await saveMatchmakingFile(
        result.sessions,
        `matchmaking-${result.accountId.slice(0, 8)}.json`
      );
      result = { ...result, savedPath };
      toast.success($t('matchmakingTrack.saved', { path: savedPath }));
    } catch (error) {
      handleError({ error, message: 'Failed to save matchmaking file', account: $activeAccount ?? undefined });
    }
  }
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('matchmakingTrack.page.description')}
  title={$t('matchmakingTrack.page.title')}
>
  <div class="space-y-2">
    <Label for="mm-player">{$t('matchmakingTrack.player')}</Label>
    <div class="flex flex-col gap-2 sm:flex-row">
      <Input id="mm-player" disabled={busy} placeholder={$t('matchmakingTrack.placeholder')} bind:value={query} />
      <Button disabled={!$activeAccount || busy || !query.trim()} loading={busy} onclick={search}>
        {$t('matchmakingTrack.search')}
      </Button>
    </div>
  </div>

  {#if result}
    <div class="space-y-2 rounded-none border border-border/70 bg-card p-4">
      <p class="font-medium">{result.displayName}</p>
      <p class="text-xs text-muted-foreground tabular-nums">{result.accountId}</p>
      <p class="text-sm">Sessions: {result.sessions.length}</p>
      <div class="flex flex-wrap gap-2">
        <Button disabled={!result.sessions.length} onclick={save} size="sm">{$t('matchmakingTrack.save')}</Button>
        <Button
          onclick={() => openUrl(stwNewsProfileUrl(result!.accountId))}
          size="sm"
          variant="outline"
        >
          {$t('matchmakingTrack.openStwNews')}
        </Button>
      </div>
      {#if result.savedPath}
        <p class="text-xs text-muted-foreground break-all">{result.savedPath}</p>
      {/if}
      {#if result.sessions.length}
        <pre class="max-h-64 overflow-auto rounded-none bg-muted/40 p-2 text-[10px]">{JSON.stringify(result.sessions, null, 2)}</pre>
      {/if}
    </div>
  {/if}
</PageContent>
