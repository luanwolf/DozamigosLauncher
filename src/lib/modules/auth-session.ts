import { toast } from 'svelte-sonner';
import { get } from 'svelte/store';
import { isForceRetryError, type KyInstance } from 'ky';
import { AsyncLock } from '$lib/async-lock';
import { defaultClient, fortniteAndroidGameClient, type ClientCredentials } from '$lib/constants/clients';
import { isEpicAPIError } from '$lib/exceptions/EpicAPIError';
import { t } from '$lib/i18n';
import { getChildLogger } from '$lib/logger';
import {
  getAccessTokenUsingDeviceAuth,
  getAccessTokenUsingExchangeCode,
  getExchangeCodeUsingAccessToken
} from '$lib/modules/authentication';
import { accountStore } from '$lib/storage';
import type { AccountData } from '$types/account';

const logger = getChildLogger('AuthSession');

type AuthState = {
  accessToken: string;
  expiresAt: number;
  lock: AsyncLock;
  notifiedErrors: Map<string, number>;
};

// accountId -> clientId -> AuthState
const states = new Map<string, Map<string, AuthState>>();

function getOrInsertState(account: AccountData, client: ClientCredentials): AuthState {
  const clientMap = states.getOrInsert(account.accountId, new Map());
  return clientMap.getOrInsert(client.clientId, {
    accessToken: '',
    expiresAt: 0,
    lock: new AsyncLock(),
    notifiedErrors: new Map()
  });
}

export async function getCachedToken(
  account: AccountData,
  client: ClientCredentials = defaultClient,
  force = false
): Promise<string> {
  const state = getOrInsertState(account, client);
  if (force) {
    state.accessToken = '';
    state.expiresAt = 0;
  }

  if (isTokenValid(state)) return state.accessToken;

  return state.lock.withLock(async () => {
    if (isTokenValid(state)) return state.accessToken;
    await refreshToken(account, state, client);
    return state.accessToken;
  });
}

export function getAuthedKy(account: AccountData, baseKy: KyInstance, client: ClientCredentials = defaultClient) {
  const kyInstance = baseKy.extend({
    retry: {
      limit: 1,
      shouldRetry: ({ error }) => isForceRetryError(error)
    },
    hooks: {
      beforeRequest: [
        async ({ request }) => {
          const token = await getCachedToken(account, client);
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      ],
      afterResponse: [
        async ({ request, response, retryCount }) => {
          if (response.ok || retryCount > 0) return;

          const data = await response.clone().json().catch(() => null);
          if (!data || !isEpicAPIError(data) || !handleError(data, account)) return;

          const token = await getCachedToken(account, client, true);
          const headers = new Headers(request.headers);
          headers.set('Authorization', `Bearer ${token}`);

          return kyInstance.retry({ request: new Request(request, { headers }) });
        }
      ]
    }
  });
  return kyInstance;
}

function isTokenValid(state: AuthState): boolean {
  return !!state.accessToken && Date.now() < state.expiresAt;
}

async function refreshToken(account: AccountData, state: AuthState, client: ClientCredentials) {
  logger.debug('Refreshing access token', { accountId: account.accountId, clientId: client.clientId });

  try {
    let accessTokenData = await getAccessTokenUsingDeviceAuth(account);

    if (client.clientId !== fortniteAndroidGameClient.clientId) {
      const { code } = await getExchangeCodeUsingAccessToken(accessTokenData.access_token);
      accessTokenData = await getAccessTokenUsingExchangeCode(code, client);
    }

    state.accessToken = accessTokenData.access_token;
    state.expiresAt = Date.now() + accessTokenData.expires_in * 1000;
  } catch (error) {
    if (isEpicAPIError(error)) handleError(error, account);
    throw error;
  }
}

function handleError(error: unknown, account: AccountData): boolean {
  if (!isEpicAPIError(error)) return false;

  if (
    error.errorCode === 'errors.com.epicgames.common.authentication.token_verification_failed' ||
    error.errorCode === 'errors.com.epicgames.common.oauth.invalid_token'
  ) {
    return true;
  }

  const state = states.get(account.accountId)?.get(defaultClient.clientId);
  const translate = get(t);

  if (
    error.errorCode === 'errors.com.epicgames.account.invalid_account_credentials' &&
    shouldNotify(`${account.accountId}:${error.errorCode}`, state)
  ) {
    logger.warn('Removing account due to invalid credentials', { accountId: account.accountId });
    accountStore.remove(account.accountId);
    toast.error(translate('errors.loginExpired', { accountName: account.displayName }));
  }

  if (
    error.errorCode === 'errors.com.epicgames.oauth.corrective_action_required' &&
    shouldNotify(`${account.accountId}:${error.errorCode}`, state)
  ) {
    logger.warn('Account requires EULA acceptance', { accountId: account.accountId });
    toast.error(translate('errors.eulaRequired', { accountName: account.displayName }));
  }

  return false;
}

function shouldNotify(key: string, state: AuthState | undefined): boolean {
  if (!state) return false;

  const now = Date.now();
  const last = state.notifiedErrors.get(key);
  if (last && now - last < 10_000) return false;

  state.notifiedErrors.set(key, now);
  return true;
}
