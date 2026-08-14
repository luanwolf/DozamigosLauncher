import { launcherAppClient2 } from '$lib/constants/clients';
import { EpicAPIError } from '$lib/exceptions/EpicAPIError';
import { orderProcessorService } from '$lib/http';
import { getAuthedKy } from '$lib/modules/auth-session';
import {
  getAccessTokenUsingDeviceAuth,
  getAccessTokenUsingExchangeCode,
  getExchangeCodeUsingAccessToken
} from '$lib/modules/authentication';
import { acceptEULA, checkEULA } from '$lib/modules/eula';
import type { FreeGame } from '$lib/modules/free-games';
import { tryResolveClaimOffer, type ResolvedStoreOffer } from '$lib/modules/free-games-offers';
import type { AccountData } from '$types/account';

export type QuickPurchaseResponse = {
  orderId?: string;
  status?: string;
  namespace?: string;
  offerId?: string;
};

export type FreeGameClaimResult = {
  game: FreeGame;
  status: 'claimed' | 'already_owned' | 'browser_only' | 'error';
  error?: string;
};

/** Launcher store session + Fortnite EULA (required before quickPurchase). */
export async function ensureStoreClaimReady(account: AccountData): Promise<void> {
  const deviceToken = await getAccessTokenUsingDeviceAuth(account);
  const exchange = await getExchangeCodeUsingAccessToken(deviceToken.access_token);
  await getAccessTokenUsingExchangeCode(exchange.code, launcherAppClient2);

  const pendingEula = await checkEULA(account).catch(() => null);
  if (pendingEula) {
    await acceptEULA(account, pendingEula.version);
  }
}

export async function claimFreeGame(
  account: AccountData,
  namespace: string,
  offerId: string
): Promise<QuickPurchaseResponse> {
  return getAuthedKy(account, orderProcessorService, launcherAppClient2)
    .post<QuickPurchaseResponse>(`accounts/${account.accountId}/orders/quickPurchase`, {
      json: {
        salesChannel: 'Launcher-purchase-client',
        entitlementSource: 'Launcher-purchase-client',
        returnSplitPaymentItems: false,
        lineOffers: [{ offerId, quantity: 1, namespace }]
      }
    })
    .json();
}

function isQuickPurchaseSuccess(response: QuickPurchaseResponse): boolean {
  const status = (response.status ?? '').toLowerCase();
  if (status.includes('fail') || status.includes('error') || status.includes('checkout')) {
    return false;
  }
  // Require a real order id or an explicit success status — empty bodies are NOT success.
  if (response.orderId) return true;
  return ['completed', 'approved', 'success', 'true'].includes(status);
}

function isCodeRedemptionOnly(error: unknown): boolean {
  const text =
    error instanceof EpicAPIError
      ? `${error.errorCode} ${error.errorMessage}`.toLowerCase()
      : error instanceof Error
        ? error.message.toLowerCase()
        : String(error).toLowerCase();

  return text.includes('code redemption') || text.includes('coderedemption');
}

function isInvalidOfferError(error: unknown): boolean {
  if (!(error instanceof EpicAPIError)) return false;
  const code = error.errorCode.toLowerCase();
  return code.includes('invalid_offer') || code.includes('catalog');
}

type ClaimErrorKind = 'already_owned' | 'eula_required' | 'browser_only' | 'invalid_offer' | 'other';

function classifyClaimError(error: unknown): ClaimErrorKind {
  if (isCodeRedemptionOnly(error)) return 'browser_only';

  if (error instanceof EpicAPIError) {
    const code = error.errorCode.toLowerCase();
    if (code.includes('already') || code.includes('owned') || code.includes('entitled')) {
      return 'already_owned';
    }
    if (code.includes('eula') || code.includes('corrective_action')) {
      return 'eula_required';
    }
    if (isInvalidOfferError(error)) return 'invalid_offer';
  }

  return 'other';
}

function errorDetail(error: unknown, kind: ClaimErrorKind): string {
  if (kind === 'browser_only') {
    return 'Use “Claim on Epic” or copy the store link for this game.';
  }
  if (kind === 'eula_required' && error instanceof EpicAPIError && error.continuationUrl) {
    return error.continuationUrl;
  }
  if (kind === 'eula_required') {
    return 'EULA / Epic Store agreement required';
  }
  if (error instanceof EpicAPIError) {
    return error.errorMessage || error.errorCode;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

function offerAttempts(game: FreeGame, resolved: ResolvedStoreOffer | null): ResolvedStoreOffer[] {
  const primary = { offerId: game.id, namespace: game.namespace };
  if (!resolved || (resolved.offerId === primary.offerId && resolved.namespace === primary.namespace)) {
    return [primary];
  }
  return [primary, resolved];
}

async function claimGameWithOffers(
  account: AccountData,
  game: FreeGame,
  offers: ResolvedStoreOffer[]
): Promise<FreeGameClaimResult> {
  let lastError: unknown;

  for (let i = 0; i < offers.length; i++) {
    const { offerId, namespace } = offers[i];
    try {
      const response = await claimFreeGame(account, namespace, offerId);
      if (isQuickPurchaseSuccess(response)) {
        return { game, status: 'claimed' };
      }
      lastError = new Error(response.status ?? 'unknown');
    } catch (error) {
      lastError = error;
      const kind = classifyClaimError(error);
      if (kind === 'already_owned') return { game, status: 'already_owned' };
      if (kind === 'browser_only') {
        return { game, status: 'browser_only', error: errorDetail(error, kind) };
      }
      if (kind === 'eula_required') {
        return { game, status: 'error', error: errorDetail(error, kind) };
      }
      if (kind === 'invalid_offer' && i < offers.length - 1) continue;
    }
  }

  const kind = classifyClaimError(lastError);
  if (kind === 'already_owned') return { game, status: 'already_owned' };
  if (kind === 'browser_only') {
    return { game, status: 'browser_only', error: errorDetail(lastError, kind) };
  }

  return { game, status: 'error', error: errorDetail(lastError, kind) };
}

export async function claimFreeGamesForAccount(
  account: AccountData,
  games: FreeGame[]
): Promise<FreeGameClaimResult[]> {
  try {
    await ensureStoreClaimReady(account);
  } catch (error) {
    const kind = classifyClaimError(error);
    const detail = errorDetail(error, kind === 'other' ? 'eula_required' : kind);
    return games.map((game) => ({ game, status: 'error', error: detail }));
  }

  const results: FreeGameClaimResult[] = [];

  for (const game of games) {
    const resolved = await tryResolveClaimOffer(account, game);
    const result = await claimGameWithOffers(account, game, offerAttempts(game, resolved));
    results.push(result);
  }

  return results;
}
