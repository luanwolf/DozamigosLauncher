import { EpicAPIError } from '@/core/EpicAPIError';
import { baseGameService } from '@/core/http';
import { getAuthedKy } from '@/core/auth-session';
import type { AccountData } from '@/core/types';

export type MCPProfileId =
  | 'athena'
  | 'campaign'
  | 'common_core'
  | 'common_public'
  | 'creative'
  | 'collections'
  | 'outpost0'
  | 'metadata'
  | 'theater0'
  | 'theater1'
  | 'theater2'
  | 'profile0';

export type MCPOperation = string;
export type MCPRoute = 'client' | 'public';

export function composeMCP<T>(
  account: AccountData,
  operation: MCPOperation,
  profile: MCPProfileId,
  data: Record<string, unknown>,
  route?: MCPRoute
): Promise<T> {
  const r = route || (operation === 'QueryPublicProfile' ? 'public' : 'client');
  return getAuthedKy(account, baseGameService)
    .post<T>(`profile/${account.accountId}/${r}/${operation}?profileId=${profile}&rvn=-1`, { json: data })
    .json();
}

export function queryProfile<T = unknown>(account: AccountData, profile: MCPProfileId): Promise<T> {
  return composeMCP<T>(account, 'QueryProfile', profile, {});
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

function isPriceMismatchError(error: unknown): error is EpicAPIError {
  return (
    error instanceof EpicAPIError &&
    error.errorCode === 'errors.com.epicgames.modules.gamesubcatalog.catalog_out_of_date' &&
    error.errorMessage.toLowerCase().includes('did not match actual price') &&
    !Number.isNaN(Number.parseInt(error.messageVars[1]))
  );
}
