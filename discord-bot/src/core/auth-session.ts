import { isForceRetryError, type KyInstance } from 'ky';
import { defaultClient, type ClientCredentials } from '@/core/clients';
import { AsyncLock } from '@/core/async-lock';
import { isEpicAPIError } from '@/core/EpicAPIError';
import {
  getAccessTokenUsingDeviceAuth,
  getAccessTokenUsingExchangeCode,
  getExchangeCodeUsingAccessToken
} from '@/core/authentication';
import type { AccountData } from '@/core/types';

type AuthState = {
  accessToken: string;
  expiresAt: number;
  lock: AsyncLock;
};

const states = new Map<string, Map<string, AuthState>>();

function getOrInsertState(account: AccountData, client: ClientCredentials): AuthState {
  let clientMap = states.get(account.accountId);
  if (!clientMap) {
    clientMap = new Map();
    states.set(account.accountId, clientMap);
  }

  let state = clientMap.get(client.clientId);
  if (!state) {
    state = { accessToken: '', expiresAt: 0, lock: new AsyncLock() };
    clientMap.set(client.clientId, state);
  }
  return state;
}

function isTokenValid(state: AuthState): boolean {
  return !!state.accessToken && Date.now() < state.expiresAt;
}

async function refreshToken(account: AccountData, state: AuthState, client: ClientCredentials) {
  let accessTokenData = await getAccessTokenUsingDeviceAuth(account);

  if (client.clientId !== defaultClient.clientId) {
    const { code } = await getExchangeCodeUsingAccessToken(accessTokenData.access_token);
    accessTokenData = await getAccessTokenUsingExchangeCode(code, client);
  }

  state.accessToken = accessTokenData.access_token;
  state.expiresAt = Date.now() + accessTokenData.expires_in * 1000;
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
    retry: { limit: 1, shouldRetry: ({ error }) => isForceRetryError(error) },
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
          if (!data || !isEpicAPIError(data)) return;
          if (
            data.errorCode !== 'errors.com.epicgames.common.authentication.token_verification_failed' &&
            data.errorCode !== 'errors.com.epicgames.common.oauth.invalid_token'
          ) {
            return;
          }
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

export async function getAccessToken(account: AccountData): Promise<string> {
  return getCachedToken(account);
}

export async function getExchangeCode(account: AccountData): Promise<string> {
  const token = await getCachedToken(account);
  const data = await getExchangeCodeUsingAccessToken(token);
  return data.code;
}
