import { friendService, fulfillmentService, publicAccountService, userSearchService } from '@/core/http';
import { getAuthedKy } from '@/core/auth-session';
import { EpicAPIError } from '@/core/EpicAPIError';
import type { AccountData } from '@/core/types';

export function getFriendsSummary(account: AccountData) {
  return getAuthedKy(account, friendService).get(`${account.accountId}/summary`).json<{
    friends: { accountId: string }[];
    incoming: { accountId: string }[];
    outgoing: { accountId: string }[];
    blocklist: { accountId: string }[];
  }>();
}

export async function addFriend(account: AccountData, friendId: string) {
  await getAuthedKy(account, friendService).post(`${account.accountId}/friends/${friendId}`);
}

export async function removeFriend(account: AccountData, friendId: string) {
  await getAuthedKy(account, friendService).delete(`${account.accountId}/friends/${friendId}`);
}

export async function acceptFriend(account: AccountData, friendId: string) {
  await getAuthedKy(account, friendService).post(`${account.accountId}/incoming/accept?targetIds=${friendId}`, {
    json: {}
  });
}

export function redeemCode(account: AccountData, code: string) {
  const normalized = encodeURIComponent(code.toUpperCase().replaceAll('-', '').replaceAll('_', '').trim());
  return getAuthedKy(account, fulfillmentService)
    .post(`accounts/${account.accountId}/codes/${normalized}`, { json: {} })
    .json<{ fulfillmentResults: { entitlementName: string }[] }>();
}

export function fetchUserByName(account: AccountData, displayName: string) {
  return getAuthedKy(account, publicAccountService)
    .get(`displayName/${displayName.trim()}`)
    .json<{ id: string; displayName: string }>();
}

export function searchUsersByName(account: AccountData, namePrefix: string) {
  return getAuthedKy(account, userSearchService)
    .get(`${account.accountId}?prefix=${namePrefix.trim()}&platform=epic`)
    .json<{ accountId: string; matches: { value: string }[] }[]>();
}

export async function fetchUserByNameOrId(
  account: AccountData,
  nameOrId: string
): Promise<{ accountId: string; displayName: string }> {
  if (nameOrId.length === 32) {
    const data = await getAuthedKy(account, publicAccountService)
      .get(nameOrId)
      .json<{ id: string; displayName: string }>();
    return { accountId: data.id, displayName: data.displayName };
  }

  const results = await searchUsersByName(account, nameOrId);
  const match = results[0];
  if (!match) {
    throw new EpicAPIError({
      errorCode: 'errors.com.epicgames.account.account_not_found',
      errorMessage: `Conta não encontrada: ${nameOrId}`,
      messageVars: [nameOrId],
      numericErrorCode: 18007
    });
  }

  return { accountId: match.accountId, displayName: match.matches[0].value };
}

export function createDeviceAuth(account: AccountData) {
  return getAuthedKy(account, publicAccountService)
    .post(`${account.accountId}/deviceAuth`)
    .json<{ deviceId: string; accountId: string; secret: string }>();
}

export function getAllDeviceAuths(account: AccountData) {
  return getAuthedKy(account, publicAccountService)
    .get(`${account.accountId}/deviceAuth`)
    .json<{ deviceId: string; created: { dateTime: string } }[]>();
}

export async function deleteDeviceAuth(account: AccountData, deviceId: string) {
  await getAuthedKy(account, publicAccountService).delete(`${account.accountId}/deviceAuth/${deviceId}`);
}
