import { eulaService } from '$lib/http';
import { getAuthedKy } from '$lib/modules/auth-session';
import type { AccountData } from '$types/account';
import type { EULACheckData } from '$types/game/eula';

export async function checkEULA(account: AccountData): Promise<EULACheckData | null> {
  const response = await getAuthedKy(account, eulaService).get<EULACheckData>(`account/${account.accountId}`);

  if (response.status === 204) return null;
  return response.json();
}

export async function acceptEULA(account: AccountData, version: number): Promise<void> {
  await getAuthedKy(account, eulaService).post(`version/${version}/${account.accountId}/accept`);
}
