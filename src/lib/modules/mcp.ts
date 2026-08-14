import { EpicAPIError } from '$lib/exceptions/EpicAPIError';
import { baseGameService } from '$lib/http';
import { getAuthedKy } from '$lib/modules/auth-session';
import type { AccountData } from '$types/account';
import type { FullQueryProfile, MCPOperation, MCPProfileId, MCPRoute } from '$types/game/mcp';

export function composeMCP<T>(
  account: AccountData,
  operation: MCPOperation,
  profile: MCPProfileId,
  data: Record<string, any>,
  route?: MCPRoute
): Promise<T> {
  const r = route || (operation === 'QueryPublicProfile' ? 'public' : 'client');
  return getAuthedKy(account, baseGameService)
    .post<T>(`profile/${account.accountId}/${r}/${operation}?profileId=${profile}&rvn=-1`, { json: data })
    .json();
}

export function queryProfile<T extends MCPProfileId>(account: AccountData, profile: T): Promise<FullQueryProfile<T>> {
  return composeMCP<FullQueryProfile<T>>(account, 'QueryProfile', profile, {});
}

export function queryPublicProfile<T extends Extract<MCPProfileId, 'campaign' | 'common_public'>>(
  account: AccountData,
  targetAccountId: string,
  profile: T
): Promise<FullQueryProfile<T>> {
  return getAuthedKy(account, baseGameService)
    .post<FullQueryProfile<T>>(`profile/${targetAccountId}/public/QueryPublicProfile?profileId=${profile}&rvn=-1`, {
      json: {}
    })
    .json();
}

export function clientQuestLogin<T extends Extract<MCPProfileId, 'athena' | 'campaign'>>(
  account: AccountData,
  profile: T
): Promise<FullQueryProfile<T>> {
  return composeMCP<FullQueryProfile<T>>(account, 'ClientQuestLogin', profile, { streamingAppKey: '' });
}

export async function purchaseCatalogEntry(
  account: AccountData,
  offerId: string,
  price: number,
  isPriceRetry?: boolean
): Promise<{ vbucksSpent: number }> {
  try {
    await composeMCP(account, 'PurchaseCatalogEntry', 'common_core', {
      offerId,
      purchaseQuantity: 1,
      currency: 'MtxCurrency',
      currencySubType: '',
      expectedTotalPrice: price,
      gameContext: 'GameContext: Frontend.CatabaScreen'
    });

    return { vbucksSpent: price };
  } catch (error) {
    if (isPriceMismatchError(error) && !isPriceRetry) {
      const newPrice = Number.parseInt(error.messageVars[1]);
      if (newPrice > price) throw error;

      return purchaseCatalogEntry(account, offerId, newPrice, true);
    }

    throw error;
  }
}

export async function giftCatalogEntry(
  account: AccountData,
  offerId: string,
  receivers: string[],
  price: number,
  isPriceRetry?: boolean
): Promise<{ vbucksSpent: number }> {
  try {
    await composeMCP(account, 'GiftCatalogEntry', 'common_core', {
      offerId,
      currency: 'MtxCurrency',
      currencySubType: '',
      expectedTotalPrice: price,
      gameContext: 'Frontend.CatabaScreen',
      receiverAccountIds: receivers,
      giftWrapTemplateId: '',
      personalMessage: 'Hope you like my gift!'
    });

    return { vbucksSpent: price * receivers.length };
  } catch (error) {
    if (isPriceMismatchError(error) && !isPriceRetry) {
      const newPrice = Number.parseInt(error.messageVars[1]);
      if (newPrice > price) throw error;

      return giftCatalogEntry(account, offerId, receivers, newPrice, true);
    }

    throw error;
  }
}

function isPriceMismatchError(error: unknown): error is EpicAPIError {
  return (
    error instanceof EpicAPIError &&
    error.errorCode === 'errors.com.epicgames.modules.gamesubcatalog.catalog_out_of_date' &&
    error.errorMessage.toLowerCase().includes('did not match actual price') &&
    !Number.isNaN(Number.parseInt(error.messageVars[1]))
  );
}
