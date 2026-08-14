<script lang="ts">
  import { untrack } from 'svelte';
  import { toast } from 'svelte-sonner';
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import UserPlusIcon from '@lucide/svelte/icons/user-plus';
  import { t } from '$lib/i18n';
  import { addFriend, getFriendsSummary } from '$lib/modules/friends';
  import { fetchUserByNameOrId } from '$lib/modules/lookup';
  import { XMPPManager } from '$lib/modules/xmpp';
  import { accountStore } from '$lib/storage';
  import { friendsCache } from '$lib/stores';
  import { handleError } from '$lib/utils';
  import FriendsList, { type ListType } from '$components/modules/friends/FriendsList.svelte';
  import FriendsListSkeleton from '$components/modules/friends/skeletons/FriendsListSkeleton.svelte';
  import { Button } from '$components/ui/button';
  import InputWithAutocomplete from '$components/ui/InputWithAutocomplete.svelte';
  import * as Tabs from '$components/ui/tabs';

  const activeAccount = accountStore.getActiveStore();

  type Tab = {
    id: ListType;
    name: string;
    count: number;
  };

  let isLoading = $state(false);
  let isSendingRequest = $state(false);
  let activeTab = $state<ListType>('friends');
  let searchQuery = $state<string>();

  const tabs = $derived([
    getTab('friends'),
    getTab('incoming'),
    getTab('outgoing'),
    getTab('blocklist')
  ] satisfies Tab[]);

  function getTab(listType: ListType): Tab {
    const list = friendsCache.get($activeAccount.accountId)?.[listType];

    return {
      id: listType,
      name: $t(`friendsManagement.lists.${listType}`),
      count: list?.size || 0
    };
  }

  async function refreshFriends() {
    isLoading = true;
    try {
      await getFriendsSummary($activeAccount);
    } finally {
      isLoading = false;
    }
  }

  async function searchAndAdd(event: SubmitEvent) {
    event.preventDefault();

    if (!searchQuery) return;

    isSendingRequest = true;

    try {
      const lookupData = await fetchUserByNameOrId($activeAccount, searchQuery);

      try {
        await addFriend($activeAccount, lookupData.accountId);
        searchQuery = '';
        toast.success($t('friendsManagement.sentFriendRequest'));
      } catch (error) {
        handleError({
          error,
          message: $t('friendsManagement.failedToAdd'),
          account: $activeAccount
        });
      }
    } catch (error) {
      handleError({ error, message: $t('lookupPlayers.notFound'), account: $activeAccount });
    } finally {
      isSendingRequest = false;
    }
  }

  $effect(() => {
    untrack(() => {
      if (!friendsCache.get($activeAccount.accountId)?.[activeTab]?.size) {
        isLoading = true;
      }
    });

    getFriendsSummary($activeAccount).finally(() => {
      isLoading = false;
    });

    XMPPManager.new($activeAccount, 'friends').then((xmpp) => {
      xmpp.connect();
    });
  });
</script>

<form class="flex w-full items-center gap-3" onsubmit={searchAndAdd}>
  <InputWithAutocomplete
    class="h-10 flex-1 rounded-none"
    disabled={isLoading}
    placeholder={$t('lookupPlayers.search')}
    type="search"
    bind:value={searchQuery}
  />

  <Button
    class="h-10 shrink-0"
    disabled={isLoading || isSendingRequest || !searchQuery || searchQuery.length < 3}
    title={$t('friendsManagement.sendFriendRequest')}
    type="submit"
  >
    {#if isSendingRequest}
      <LoaderCircleIcon class="size-5 animate-spin" />
    {:else}
      <UserPlusIcon class="size-5" />
    {/if}
  </Button>
</form>

<div class="flex flex-col gap-3">
  <div class="flex items-center gap-3">
    <Tabs.Root class="min-w-0 flex-1" bind:value={activeTab}>
      <Tabs.List class="h-auto w-full gap-1 bg-transparent p-0">
        {#each tabs as tab (tab.id)}
          <Tabs.Trigger class="h-9 flex-1 gap-1.5 rounded-none px-2 text-xs sm:text-sm" value={tab.id}>
            <span class="truncate">{tab.name}</span>
            {#if tab.count}
              <span
                class="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums"
              >
                {tab.count}
              </span>
            {/if}
          </Tabs.Trigger>
        {/each}
      </Tabs.List>
    </Tabs.Root>

    <Button
      disabled={isLoading}
      loading={isLoading}
      onclick={() => refreshFriends()}
      size="icon-sm"
      variant="ghost"
      aria-label={$t('freeGames.refresh')}
    >
      <RefreshCwIcon class="size-4" />
    </Button>
  </div>

  <!-- ponytail: 5-row cap assumes ~58px cards; a friend with a status line is taller, so it starts scrolling a row early -->
  <div class="max-h-[21rem] overflow-y-auto pr-1">
    {#if isLoading}
      <FriendsListSkeleton />
    {:else}
      <FriendsList listType={activeTab} bind:searchQuery />
    {/if}
  </div>
</div>
