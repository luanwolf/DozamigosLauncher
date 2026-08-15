<script lang="ts" module>
  import type { BulkState } from '$types/account';

  type PartyActionState = BulkState<{ message: string; ok: boolean }>;

  let selectedAccounts = $state<string[]>([]);
  let inviteTarget = $state('');
  let busy = $state(false);
  let results = $state<PartyActionState[]>([]);
</script>

<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { HUD_PAGE_WIDTH } from '$lib/constants/page-layout';
  import { t } from '$lib/i18n';
  import { claimRewards } from '$lib/modules/autokick/claim-rewards';
  import { addFriend, getFriends } from '$lib/modules/friends';
  import { fetchUserByNameOrId } from '$lib/modules/lookup';
  import { getParty, invite, kickMember, leaveParty, promote } from '$lib/modules/party';
  import { getAccountLabel, getAccountsFromSelection, handleError } from '$lib/utils';
  import PageContent from '$components/layout/PageContent.svelte';
  import AccountCombobox from '$components/ui/AccountCombobox.svelte';
  import AccountResultCard from '$components/ui/AccountResultCard.svelte';
  import { Button } from '$components/ui/button';
  import { Input } from '$components/ui/input';
  import { Label } from '$components/ui/label';
  import type { AccountData } from '$types/account';

  async function runForAccounts(action: (account: AccountData) => Promise<string>) {
    busy = true;
    results = [];
    const accounts = getAccountsFromSelection(selectedAccounts);
    const next: PartyActionState[] = [];

    await Promise.allSettled(
      accounts.map(async (account) => {
        try {
          const message = await action(account);
          next.push({ accountId: account.accountId, displayName: getAccountLabel(account), data: { message, ok: true } });
        } catch (error) {
          handleError({ error, message: 'Party action failed', account, toastId: false });
          next.push({
            accountId: account.accountId,
            displayName: getAccountLabel(account),
            data: { message: error instanceof Error ? error.message : String(error), ok: false }
          });
        }
      })
    );

    results = next;
    busy = false;
  }

  async function kickAll(account: AccountData) {
    const party = (await getParty(account)).current[0];
    if (!party) return $t('stwParty.noParty');
    const captain = party.members.find((m) => m.role === 'CAPTAIN');
    if (captain?.account_id !== account.accountId) throw new Error($t('stwParty.notCaptain'));

    let kicked = 0;
    for (const member of party.members) {
      if (member.account_id === account.accountId) continue;
      await kickMember(account, party.id, member.account_id);
      kicked++;
    }
    return $t('stwParty.kicked', { count: kicked });
  }

  async function leave(account: AccountData) {
    const party = (await getParty(account)).current[0];
    if (!party) return $t('stwParty.noParty');
    await leaveParty(account, party.id);
    return $t('stwParty.left');
  }

  async function claim(account: AccountData) {
    await claimRewards(account, true);
    return $t('stwParty.claimed');
  }

  async function inviteFriend(account: AccountData) {
    const target = inviteTarget.trim();
    if (!target) throw new Error($t('stwParty.inviteRequired'));

    const user = await fetchUserByNameOrId(account, target);
    const friends = await getFriends(account);
    if (!friends.some((f) => f.accountId === user.accountId)) {
      await addFriend(account, user.accountId);
    }

    const party = (await getParty(account)).current[0];
    if (!party) throw new Error($t('stwParty.noParty'));
    await invite(account, party.id, user.accountId);
    return $t('stwParty.invited', { name: user.displayName });
  }

  async function promoteSelf(account: AccountData) {
    toast.info($t('stwParty.promoteHint'));
    const party = (await getParty(account)).current[0];
    if (!party) return $t('stwParty.noParty');
    const other = party.members.find((m) => m.account_id !== account.accountId);
    if (!other) return $t('stwParty.noMembers');
    // Promote first other member only when we are captain — useful before leaving.
    const captain = party.members.find((m) => m.role === 'CAPTAIN');
    if (captain?.account_id !== account.accountId) throw new Error($t('stwParty.notCaptain'));
    await promote(account, party.id, other.account_id);
    return $t('stwParty.promoted', { name: other.meta?.['urn:epic:member:dn_s'] || other.account_id });
  }
</script>

<PageContent
  center
  centerClass={HUD_PAGE_WIDTH}
  description={$t('stwParty.page.description')}
  title={$t('stwParty.page.title')}
>
  <AccountCombobox disabled={busy} type="multiple" bind:value={selectedAccounts} />

  <div class="flex flex-wrap gap-2">
    <Button disabled={!selectedAccounts.length || busy} loading={busy} onclick={() => runForAccounts(kickAll)}>
      {$t('stwParty.actions.kickAll')}
    </Button>
    <Button disabled={!selectedAccounts.length || busy} loading={busy} onclick={() => runForAccounts(leave)} variant="secondary">
      {$t('stwParty.actions.leave')}
    </Button>
    <Button disabled={!selectedAccounts.length || busy} loading={busy} onclick={() => runForAccounts(claim)} variant="outline">
      {$t('stwParty.actions.claim')}
    </Button>
    <Button disabled={!selectedAccounts.length || busy} loading={busy} onclick={() => runForAccounts(promoteSelf)} variant="outline">
      {$t('stwParty.actions.promote')}
    </Button>
  </div>

  <div class="space-y-2">
    <Label for="party-invite">{$t('stwParty.inviteLabel')}</Label>
    <div class="flex flex-col gap-2 sm:flex-row">
      <Input id="party-invite" disabled={busy} placeholder={$t('stwParty.invitePlaceholder')} bind:value={inviteTarget} />
      <Button disabled={!selectedAccounts.length || busy || !inviteTarget.trim()} loading={busy} onclick={() => runForAccounts(inviteFriend)}>
        {$t('stwParty.actions.invite')}
      </Button>
    </div>
  </div>

  {#if results.length}
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {#each results as state (state.accountId)}
        <AccountResultCard accountId={state.accountId} displayName={state.displayName}>
          <p class={state.data.ok ? 'text-sm text-emerald-500' : 'text-sm text-destructive'}>{state.data.message}</p>
        </AccountResultCard>
      {/each}
    </div>
  {/if}
</PageContent>
