import { fulfillmentService } from '$lib/http';
import { getAuthedKy } from '$lib/modules/auth-session';
import type { AccountData } from '$types/account';
import type { RedeemedCodeData } from '$types/game/fulfillment';

export function redeemCode(account: AccountData, code: string): Promise<RedeemedCodeData> {
  code = encodeURIComponent(code.toUpperCase().replaceAll('-', '').replaceAll('_', '').trim());

  return getAuthedKy(account, fulfillmentService)
    .post<RedeemedCodeData>(`accounts/${account.accountId}/codes/${code}`, { json: {} })
    .json();
}
