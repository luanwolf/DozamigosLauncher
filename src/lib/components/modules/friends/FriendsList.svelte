<script lang="ts" module>
  export type Friend = {
    accountId: string;
    displayName: string;
    nickname?: string;
    avatarUrl: string;
    createdAt: Date;
  };

  export type ListType = 'friends' | 'incoming' | 'outgoing' | 'blocklist';
</script>

<script lang="ts">
  import BanIcon from '@lucide/svelte/icons/ban';
  import { t } from '$lib/i18n';
  import { accountStore } from '$lib/storage';
  import { avatarCache, displayNameCache, friendsCache } from '$lib/stores';
  import FriendCard from '$components/modules/friends/FriendCard.svelte';
  import type {
    BlockedAccountData,
    FriendData,
    IncomingFriendRequestData,
    OutgoingFriendRequestData
  } from '$types/game/friends';

  type Props = {
    listType: ListType;
    searchQuery?: string;
  };

  const { listType, searchQuery = $bindable() }: Props = $props();

  const list = $derived<Friend[]>(
    friendsCache
      .get($accountStore.activeAccountId!)
      ?.[listType]?.values()
      ?.map((data: FriendData | IncomingFriendRequestData | OutgoingFriendRequestData | BlockedAccountData) => ({
        accountId: data.accountId,
        displayName: displayNameCache.get(data.accountId) || data.accountId,
        nickname: 'alias' in data ? data.alias : undefined,
        avatarUrl: avatarCache.get(data.accountId) || '/misc/default-outfit-icon.png',
        createdAt: new Date(data.created)
      }))
      .toArray()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .filter((friend) => {
        if (!searchQuery) return true;

        const search = searchQuery.toLowerCase();
        return friend.displayName.toLowerCase().includes(search) || friend.accountId.toLowerCase().includes(search);
      }) || []
  );
</script>

{#if list?.length}
  <div class="grid grid-cols-3 gap-2">
    {#each list as friend (friend.accountId)}
      <FriendCard {friend} {listType} />
    {/each}
  </div>
{:else}
  <div class="flex flex-col items-center justify-center gap-2 py-10 text-center">
    <BanIcon class="size-8 text-muted-foreground/70" />

    <p class="text-sm font-medium text-muted-foreground">
      {#if listType === 'friends'}
        {$t('friendsManagement.noFriends')}
      {:else if listType === 'incoming'}
        {$t('friendsManagement.noIncomingRequests')}
      {:else if listType === 'outgoing'}
        {$t('friendsManagement.noOutgoingRequests')}
      {:else if listType === 'blocklist'}
        {$t('friendsManagement.noBlockedUsers')}
      {/if}
    </p>
  </div>
{/if}
