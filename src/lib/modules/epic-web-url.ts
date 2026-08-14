import { defaultClient, launcherAppClient2, type ClientCredentials } from '$lib/constants/clients';
import { getCachedToken } from '$lib/modules/auth-session';
import { getExchangeCodeUsingAccessToken } from '$lib/modules/authentication';
import type { AccountData } from '$types/account';

/** Epic Games Store web OAuth client (dieselWebsite). */
export const EPIC_STORE_WEB_CLIENT_ID = '875a3b57d3a640a6b7f9b4e883463ab4';

const EPIC_EXCHANGE_URL = 'https://www.epicgames.com/id/exchange';
const EPIC_STORE_PURCHASE_URL = 'https://www.epicgames.com/store/purchase';

export type StoreOfferRef = {
  namespace: string;
  id: string;
};

/**
 * Checkout URL used by Epic's own tooling (epicgames-freegames-node).
 * Must stay on www.epicgames.com — store.epicgames.com/purchase breaks exchange redirects.
 */
export function buildStorePurchaseUrl(offers: StoreOfferRef[]): string {
  if (!offers.length) {
    return 'https://www.epicgames.com/en-US/free-games';
  }

  const offerParams = offers.map((o) => `offers=1-${o.namespace}-${o.id}`).join('&');
  return `${EPIC_STORE_PURCHASE_URL}?highlightColor=0078f2&${offerParams}&orderId&purchaseToken&showNavigation=true`;
}

/** Store login page that redirects after sign-in (manual login fallback). */
export function buildStoreLoginRedirectUrl(redirectUrl: string): string {
  const url = new URL('https://www.epicgames.com/id/login');
  url.searchParams.set('noHostRedirect', 'true');
  url.searchParams.set('redirectUrl', redirectUrl);
  url.searchParams.set('client_id', EPIC_STORE_WEB_CLIENT_ID);
  return url.toString();
}

/**
 * Returns an Epic login URL for the given account. When `redirectUrl` is set,
 * the browser lands there already signed in as that account (one-time link).
 */
export async function generateEpicExchangeUrl(
  account: AccountData,
  redirectUrl?: string,
  client: ClientCredentials = launcherAppClient2
): Promise<string> {
  const accessToken = await getCachedToken(account, client, true);
  const { code } = await getExchangeCodeUsingAccessToken(accessToken);

  const url = new URL(EPIC_EXCHANGE_URL);
  url.searchParams.set('exchangeCode', code);
  if (redirectUrl) {
    url.searchParams.set('redirectUrl', redirectUrl);
  }

  return url.toString();
}

/** Exchange login, then open the store checkout (browser fallback). */
export async function generateAuthenticatedStoreClaimUrl(
  account: AccountData,
  offers: StoreOfferRef[]
): Promise<string> {
  const purchaseUrl = buildStorePurchaseUrl(offers);
  try {
    return await generateEpicExchangeUrl(account, purchaseUrl, launcherAppClient2);
  } catch {
    return await generateEpicExchangeUrl(account, purchaseUrl, defaultClient);
  }
}

/** Exchange login, then open the public game page (user taps Get on the store). */
export async function generateAuthenticatedGamePageUrl(
  account: AccountData,
  storePageUrl: string
): Promise<string> {
  try {
    return await generateEpicExchangeUrl(account, storePageUrl, launcherAppClient2);
  } catch {
    return await generateEpicExchangeUrl(account, storePageUrl, defaultClient);
  }
}

/** Deep-link into the installed Epic Games Launcher checkout for an offer. */
export function buildEpicLauncherPurchaseUrl(namespace: string, offerId: string) {
  return `com.epicgames.launcher://store/purchase?offers=1-${namespace}-${offerId}`;
}

/** Deep-link into Epic Games Launcher for a store page URL when possible. */
export function buildEpicLauncherStoreUrl(storePageUrl: string) {
  try {
    const url = new URL(storePageUrl);
    if (url.hostname.includes('epicgames.com')) {
      return `com.epicgames.launcher://store${url.pathname}${url.search}`;
    }
  } catch {
    // ignore invalid urls
  }
  return 'com.epicgames.launcher://store/free-games';
}
