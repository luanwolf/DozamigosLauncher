import { HTTPError } from 'ky';
import type { AccountData } from '@/fortnite/clients';
import { authed } from '@/fortnite/auth';
import { baseGameService } from '@/fortnite/http';
import { sleep } from '@/utils/fs';

export type MCPProfileId = 'athena' | 'campaign' | 'common_core' | 'collections';
export type MCPRoute = 'client' | 'public';

export type ProfileItem = {
  templateId: string;
  attributes: Record<string, unknown>;
  quantity: number;
};

export type Profile = {
  items: Record<string, ProfileItem>;
  stats: { attributes: Record<string, unknown> };
};

export type QueryProfile<T extends MCPProfileId = MCPProfileId> = {
  profileRevision: number;
  profileChangesBaseRevision: number;
  profileChanges: { profile: Profile }[];
  profileId: T;
};

async function postMcp<T>(
  account: AccountData,
  operation: string,
  profile: MCPProfileId,
  data: Record<string, unknown>,
  route: MCPRoute = 'client',
  retried = false
): Promise<T> {
  try {
    return await authed(account, baseGameService)
      .post(`profile/${account.accountId}/${route}/${operation}`, {
        searchParams: { profileId: profile, rvn: -1 },
        json: data
      })
      .json<T>();
  } catch (error) {
    const is500 = error instanceof HTTPError && error.response.status === 500;
    if (!retried && is500) {
      await sleep(750);
      return postMcp<T>(account, operation, profile, data, route, true);
    }
    throw error;
  }
}

export function composeMCP<T>(
  account: AccountData,
  operation: string,
  profile: MCPProfileId,
  data: Record<string, unknown> = {},
  route?: MCPRoute
): Promise<T> {
  return postMcp<T>(account, operation, profile, data, route ?? 'client');
}

export function queryProfile<T extends MCPProfileId>(account: AccountData, profile: T): Promise<QueryProfile<T>> {
  return composeMCP<QueryProfile<T>>(account, 'QueryProfile', profile, {});
}

export function clientQuestLogin<T extends Extract<MCPProfileId, 'athena' | 'campaign'>>(
  account: AccountData,
  profile: T
): Promise<QueryProfile<T>> {
  return composeMCP<QueryProfile<T>>(account, 'ClientQuestLogin', profile, { streamingAppKey: '' });
}

export async function purchaseCatalogEntry(account: AccountData, offerId: string, price: number): Promise<void> {
  await composeMCP(account, 'PurchaseCatalogEntry', 'common_core', {
    offerId,
    purchaseQuantity: 1,
    currency: 'MtxCurrency',
    currencySubType: '',
    expectedTotalPrice: price,
    gameContext: 'GameContext: Frontend.CatabaScreen'
  });
}
