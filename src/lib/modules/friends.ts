import { SvelteMap } from 'svelte/reactivity';
import { EpicAPIError } from '$lib/exceptions/EpicAPIError';
import { friendService } from '$lib/http';
import { getChildLogger } from '$lib/logger';
import { getAuthedKy } from '$lib/modules/auth-session';
import { fetchAvatars } from '$lib/modules/avatar';
import { fetchUserById, fetchUsersByIds } from '$lib/modules/lookup';
import { avatarCache, displayNameCache, friendsCache, type AccountFriends } from '$lib/stores';
import { processChunks } from '$lib/utils';
import type { AccountData } from '$types/account';
import type {
  BlockedAccountData,
  FriendData,
  FriendsSummary,
  IncomingFriendRequestData,
  OutgoingFriendRequestData
} from '$types/game/friends';

const logger = getChildLogger('FriendsManager');

export async function getFriend(account: AccountData, friendId: string): Promise<FriendData> {
  try {
    const friendData = await getAuthedKy(account, friendService)
      .get<FriendData>(`${account.accountId}/friends/${friendId}`)
      .json();

    setCollectionItem(account.accountId, 'friends', friendId, friendData);
    cacheNameAndAvatar(account, friendId);

    return friendData;
  } catch (error) {
    if (error instanceof EpicAPIError && error.errorCode === 'errors.com.epicgames.friends.friendship_not_found') {
      deleteCollectionItem(account.accountId, 'friends', friendId);
    }

    throw error;
  }
}

export async function addFriend(account: AccountData, friendId: string): Promise<void> {
  try {
    await getAuthedKy(account, friendService).post(`${account.accountId}/friends/${friendId}`);

    const incomingRequest = friendsCache.get(account.accountId)?.incoming.get(friendId);
    if (incomingRequest) {
      deleteCollectionItem(account.accountId, 'incoming', friendId);
      setCollectionItem(account.accountId, 'friends', friendId, {
        accountId: friendId,
        alias: '',
        note: '',
        favorite: false,
        created: new Date().toISOString(),
        mutual: 0
      });
    } else {
      setCollectionItem(account.accountId, 'outgoing', friendId, {
        accountId: friendId,
        mutual: 0,
        favorite: false,
        created: new Date().toISOString()
      });
    }

    cacheNameAndAvatar(account, friendId);
  } catch (error) {
    if (error instanceof EpicAPIError) {
      if (error.errorCode === 'errors.com.epicgames.friends.duplicate_friendship') {
        const friend = friendsCache.get(account.accountId)?.friends.get(friendId);
        if (!friend) {
          setCollectionItem(account.accountId, 'friends', friendId, {
            accountId: friendId,
            alias: '',
            note: '',
            favorite: false,
            created: new Date().toISOString(),
            mutual: 0
          });
        }
      }

      if (error.errorCode === 'errors.com.epicgames.friends.friend_request_already_sent') {
        const outgoing = friendsCache.get(account.accountId)?.outgoing.get(friendId);
        if (!outgoing) {
          setCollectionItem(account.accountId, 'outgoing', friendId, {
            accountId: friendId,
            mutual: 0,
            favorite: false,
            created: new Date().toISOString()
          });
        }
      }
    }

    throw error;
  }
}

export async function removeFriend(account: AccountData, friendId: string): Promise<void> {
  try {
    await getAuthedKy(account, friendService).delete(`${account.accountId}/friends/${friendId}`);

    deleteCollectionItem(account.accountId, 'friends', friendId);
    deleteCollectionItem(account.accountId, 'incoming', friendId);
    deleteCollectionItem(account.accountId, 'outgoing', friendId);

    cacheNameAndAvatar(account, friendId);
  } catch (error) {
    if (error instanceof EpicAPIError && error.errorCode === 'errors.com.epicgames.friends.friendship_not_found') {
      deleteCollectionItem(account.accountId, 'friends', friendId);
      deleteCollectionItem(account.accountId, 'incoming', friendId);
      deleteCollectionItem(account.accountId, 'outgoing', friendId);
    }

    throw error;
  }
}

export async function removeAllFriends(account: AccountData): Promise<void> {
  await getAuthedKy(account, friendService).delete(`${account.accountId}/friends`);
  getOrInsertEntry(account.accountId).friends.clear();
}

export async function getFriendsSummary(account: AccountData): Promise<FriendsSummary> {
  const data = await getAuthedKy(account, friendService).get<FriendsSummary>(`${account.accountId}/summary`).json();

  const allAccountIds = [
    ...data.friends.map((x) => x.accountId),
    ...data.incoming.map((x) => x.accountId),
    ...data.outgoing.map((x) => x.accountId),
    ...data.blocklist.map((x) => x.accountId)
  ];

  await Promise.allSettled([fetchUsersByIds(account, allAccountIds), fetchAvatars(account, allAccountIds)]);

  friendsCache.set(account.accountId, {
    friends: new SvelteMap(data.friends.map((x) => [x.accountId, x])),
    incoming: new SvelteMap(data.incoming.map((x) => [x.accountId, x])),
    outgoing: new SvelteMap(data.outgoing.map((x) => [x.accountId, x])),
    blocklist: new SvelteMap(data.blocklist.map((x) => [x.accountId, x]))
  });

  return data;
}

export async function getFriends(account: AccountData): Promise<FriendData[]> {
  const data = await getAuthedKy(account, friendService).get<FriendData[]>(`${account.accountId}/friends`).json();
  replaceCollection(account.accountId, 'friends', data);
  return data;
}

export async function getIncoming(account: AccountData): Promise<IncomingFriendRequestData[]> {
  const data = await getAuthedKy(account, friendService)
    .get<IncomingFriendRequestData[]>(`${account.accountId}/incoming`)
    .json();

  replaceCollection(account.accountId, 'incoming', data);
  return data;
}

export async function getOutgoing(account: AccountData): Promise<OutgoingFriendRequestData[]> {
  const data = await getAuthedKy(account, friendService)
    .get<OutgoingFriendRequestData[]>(`${account.accountId}/outgoing`)
    .json();

  replaceCollection(account.accountId, 'outgoing', data);
  return data;
}

export async function getBlocklist(account: AccountData): Promise<BlockedAccountData[]> {
  const data = await getAuthedKy(account, friendService)
    .get<BlockedAccountData[]>(`${account.accountId}/blocklist`)
    .json();

  replaceCollection(account.accountId, 'blocklist', data);
  return data;
}

export async function block(account: AccountData, friendId: string): Promise<void> {
  await getAuthedKy(account, friendService).post(`${account.accountId}/blocklist/${friendId}`);

  deleteCollectionItem(account.accountId, 'incoming', friendId);
  deleteCollectionItem(account.accountId, 'outgoing', friendId);
  deleteCollectionItem(account.accountId, 'friends', friendId);
  setCollectionItem(account.accountId, 'blocklist', friendId, {
    accountId: friendId,
    created: new Date().toISOString()
  });

  cacheNameAndAvatar(account, friendId);
}

export async function unblock(account: AccountData, friendId: string): Promise<void> {
  await getAuthedKy(account, friendService).delete(`${account.accountId}/blocklist/${friendId}`);

  deleteCollectionItem(account.accountId, 'blocklist', friendId);
  cacheNameAndAvatar(account, friendId);
}

export async function changeNickname(account: AccountData, friendId: string, nickname: string): Promise<void> {
  await getAuthedKy(account, friendService).put(`${account.accountId}/friends/${friendId}/alias`, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain' },
    body: nickname
  });

  const friend = friendsCache.get(account.accountId)?.friends.get(friendId) ?? {
    accountId: friendId,
    alias: '',
    note: '',
    favorite: false,
    created: new Date().toISOString(),
    mutual: 0
  };

  setCollectionItem(account.accountId, 'friends', friendId, {
    ...friend,
    alias: nickname
  });

  cacheNameAndAvatar(account, friendId);
}

export async function acceptIncomingBulk(account: AccountData, ids: string[]): Promise<string[]> {
  const MAX_IDS_PER_REQUEST = 100;
  const session = getAuthedKy(account, friendService);

  const accepted = await processChunks(ids, MAX_IDS_PER_REQUEST, async (ids) =>
    session.post<string[]>(`${account.accountId}/incoming/accept?targetIds=${ids.join(',')}`, { json: {} }).json()
  );

  for (const friendId of accepted) {
    deleteCollectionItem(account.accountId, 'incoming', friendId);
    setCollectionItem(account.accountId, 'friends', friendId, {
      accountId: friendId,
      alias: '',
      note: '',
      favorite: false,
      created: new Date().toISOString(),
      mutual: 0
    });
  }

  return accepted;
}

export function cacheNameAndAvatar(account: AccountData, accountId: string) {
  if (!displayNameCache.get(accountId)) {
    fetchUserById(account, accountId).catch((error) => {
      logger.error('Failed to fetch account display name for caching', { accountId, error });
    });
  }

  if (!avatarCache.get(accountId)) {
    fetchAvatars(account, [accountId]).catch((error) => {
      logger.error('Failed to fetch account avatar for caching', { accountId, error });
    });
  }
}

type FriendsCollectionKey = keyof AccountFriends;

// TODO: Use SvelteMap.getOrInsert when implemented https://github.com/sveltejs/svelte/issues/18014
// and remove the export
export function getOrInsertEntry(accountId: string) {
  let entry = friendsCache.get(accountId);
  if (!entry) {
    entry = {
      friends: new SvelteMap(),
      incoming: new SvelteMap(),
      outgoing: new SvelteMap(),
      blocklist: new SvelteMap()
    };

    friendsCache.set(accountId, entry);
  }

  return entry;
}

function replaceCollection<K extends FriendsCollectionKey, T extends { accountId: string }>(
  accountId: string,
  key: K,
  data: T[]
) {
  const entry = getOrInsertEntry(accountId);
  const map = entry[key];

  map.clear();
  for (const item of data) {
    // @ts-expect-error - this is fine
    map.set(item.accountId, item);
  }
}

function setCollectionItem<K extends FriendsCollectionKey>(
  accountId: string,
  collection: K,
  friendId: string,
  data: AccountFriends[K] extends SvelteMap<string, infer V> ? V : never
) {
  const entry = getOrInsertEntry(accountId);
  const map = entry[collection] as SvelteMap<string, unknown>;
  map.set(friendId, data);
}

export function deleteCollectionItem(accountId: string, collection: FriendsCollectionKey, friendId: string) {
  const entry = getOrInsertEntry(accountId);
  entry[collection].delete(friendId);
}
