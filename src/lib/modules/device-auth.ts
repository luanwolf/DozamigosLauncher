import { fortnitePCGameClient } from '$lib/constants/clients';
import { publicAccountService } from '$lib/http';
import { getAuthedKy } from '$lib/modules/auth-session';
import type { AccountData } from '$types/account';
import type { EpicDeviceAuthData } from '$types/game/authorizations';

export function createDeviceAuth(
  account: AccountData | { accountId: string; accessToken: string }
): Promise<EpicDeviceAuthData> {
  const token = 'accessToken' in account ? account.accessToken : null;
  const service = 'accessToken' in account ? publicAccountService : getAuthedKy(account, publicAccountService);

  return service
    .post<EpicDeviceAuthData>(
      `${account.accountId}/deviceAuth`,
      token ? { headers: { Authorization: `Bearer ${token}` } } : {}
    )
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
