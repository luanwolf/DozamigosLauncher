import { fortniteAndroidGameClient, fortnitePCGameClient } from '$lib/constants/clients';
import { publicAccountService } from '$lib/http';
import { getAuthedKy, getCachedToken } from '$lib/modules/auth-session';
import { exchangeAccessTokenToClient } from '$lib/modules/authentication';
import type { AccountData } from '$types/account';
import type { EpicDeviceAuthData } from '$types/game/authorizations';

async function androidAccessToken(
  account: AccountData | { accountId: string; accessToken: string }
): Promise<string> {
  if ('accessToken' in account) {
    const android = await exchangeAccessTokenToClient(account.accessToken, fortniteAndroidGameClient);
    return android.access_token;
  }
  return getCachedToken(account, fortniteAndroidGameClient);
}

export async function createDeviceAuth(
  account: AccountData | { accountId: string; accessToken: string }
): Promise<EpicDeviceAuthData> {
  const token = await androidAccessToken(account);
  return publicAccountService
    .post<EpicDeviceAuthData>(`${account.accountId}/deviceAuth`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .json();
}

export function getDeviceAuth(account: AccountData, deviceId: string): Promise<EpicDeviceAuthData> {
  return getAuthedKy(account, publicAccountService, fortnitePCGameClient)
    .get<EpicDeviceAuthData>(`${account.accountId}/deviceAuth/${deviceId}`)
    .json();
}

export function getAllDeviceAuths(account: AccountData): Promise<EpicDeviceAuthData[]> {
  return getAuthedKy(account, publicAccountService, fortnitePCGameClient)
    .get<EpicDeviceAuthData[]>(`${account.accountId}/deviceAuth`)
    .json();
}

export async function deleteDeviceAuth(account: AccountData, deviceId: string): Promise<void> {
  await getAuthedKy(account, publicAccountService).delete(`${account.accountId}/deviceAuth/${deviceId}`);
}
