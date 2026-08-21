import type { KyInstance } from 'ky';
import {
  defaultClient,
  fortniteAndroidGameClient,
  fortniteNewSwitchGameClient,
  type AccountData,
  type ClientCredentials
} from '@/fortnite/clients';
import { oauthService, publicAccountService } from '@/fortnite/http';
import { sleep } from '@/utils/fs';

export type EpicOAuthData = {
  access_token: string;
  expires_in: number;
  account_id: string;
  client_id: string;
  displayName: string;
};

export type DeviceCodeLoginData = {
  user_code: string;
  device_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
};

export type DeviceAuthCreated = {
  deviceId: string;
  accountId: string;
  secret: string;
};

type AuthState = {
  accessToken: string;
  expiresAt: number;
  lock: Promise<void> | null;
};

const states = new Map<string, AuthState>();

export async function getAccessTokenUsingClientCredentials(
  client: ClientCredentials = defaultClient
): Promise<EpicOAuthData> {
  return oauthService
    .post('token', {
      body: new URLSearchParams({ grant_type: 'client_credentials', token_type: 'eg1' }).toString(),
      headers: { Authorization: `Basic ${client.base64}` }
    })
    .json<EpicOAuthData>();
}

export async function createDeviceCode(): Promise<DeviceCodeLoginData> {
  const token = await getAccessTokenUsingClientCredentials(fortniteNewSwitchGameClient);
  return oauthService
    .post('deviceAuthorization', {
      body: new URLSearchParams({ prompt: 'login' }).toString(),
      headers: { Authorization: `Bearer ${token.access_token}` }
    })
    .json<DeviceCodeLoginData>();
}

export async function getAccessTokenUsingDeviceCode(
  deviceCode: string,
  client: ClientCredentials = fortniteNewSwitchGameClient
): Promise<EpicOAuthData> {
  return oauthService
    .post('token', {
      body: new URLSearchParams({
        grant_type: 'device_code',
        device_code: deviceCode,
        token_type: 'eg1'
      }).toString(),
      headers: { Authorization: `Basic ${client.base64}` }
    })
    .json<EpicOAuthData>();
}

export async function getExchangeCode(accessToken: string): Promise<string> {
  const data = await oauthService
    .get('exchange', { headers: { Authorization: `Bearer ${accessToken}` } })
    .json<{ code: string }>();
  return data.code;
}

export async function getAccessTokenUsingExchangeCode(
  exchangeCode: string,
  client: ClientCredentials = defaultClient
): Promise<EpicOAuthData> {
  return oauthService
    .post('token', {
      body: new URLSearchParams({
        grant_type: 'exchange_code',
        exchange_code: exchangeCode,
        token_type: 'eg1'
      }).toString(),
      headers: { Authorization: `Basic ${client.base64}` }
    })
    .json<EpicOAuthData>();
}

export async function getAccessTokenUsingDeviceAuth(account: AccountData): Promise<EpicOAuthData> {
  // PC client has no device_auth grant — Android is the refresh client, then we exchange to PC.
  return oauthService
    .post('token', {
      body: new URLSearchParams({
        grant_type: 'device_auth',
        account_id: account.accountId,
        device_id: account.deviceId,
        secret: account.secret,
        token_type: 'eg1'
      }).toString(),
      headers: { Authorization: `Basic ${fortniteAndroidGameClient.base64}` }
    })
    .json<EpicOAuthData>();
}

export async function createDeviceAuth(accountId: string, accessToken: string): Promise<DeviceAuthCreated> {
  return publicAccountService
    .post(`${accountId}/deviceAuth`, { headers: { Authorization: `Bearer ${accessToken}` } })
    .json<DeviceAuthCreated>();
}

export async function deleteDeviceAuth(account: AccountData): Promise<void> {
  const token = await getCachedToken(account);
  await publicAccountService.delete(`${account.accountId}/deviceAuth/${account.deviceId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function completeDeviceLogin(deviceCode: string): Promise<AccountData> {
  const switchToken = await getAccessTokenUsingDeviceCode(deviceCode, fortniteNewSwitchGameClient);
  const exchange = await getExchangeCode(switchToken.access_token);
  const pc = await getAccessTokenUsingExchangeCode(exchange, defaultClient);
  const device = await createDeviceAuth(pc.account_id, pc.access_token);
  return {
    displayName: pc.displayName,
    accountId: pc.account_id,
    deviceId: device.deviceId,
    secret: device.secret
  };
}

export async function getCachedToken(account: AccountData, force = false): Promise<string> {
  let state = states.get(account.accountId);
  if (!state) {
    state = { accessToken: '', expiresAt: 0, lock: null };
    states.set(account.accountId, state);
  }
  if (force) {
    state.accessToken = '';
    state.expiresAt = 0;
  }
  if (state.accessToken && Date.now() < state.expiresAt) return state.accessToken;

  while (state.lock) await state.lock;
  if (state.accessToken && Date.now() < state.expiresAt) return state.accessToken;

  let release: () => void = () => {};
  state.lock = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    const android = await getAccessTokenUsingDeviceAuth(account);
    const data =
      android.client_id === defaultClient.clientId
        ? android
        : await getAccessTokenUsingExchangeCode(await getExchangeCode(android.access_token), defaultClient);
    state.accessToken = data.access_token;
    state.expiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return state.accessToken;
  } finally {
    state.lock = null;
    release();
  }
}

export function authed(account: AccountData, base: KyInstance): KyInstance {
  return base.extend({
    hooks: {
      beforeRequest: [
        async (request) => {
          const token = await getCachedToken(account);
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      ]
    }
  });
}

/** Poll device_code until the user confirms or `until` ms elapse. */
export async function pollDeviceLogin(deviceCode: string, intervalMs: number, untilMs: number): Promise<AccountData> {
  const deadline = Date.now() + untilMs;
  while (Date.now() < deadline) {
    try {
      return await completeDeviceLogin(deviceCode);
    } catch (error) {
      const code = typeof error === 'object' && error && 'errorCode' in error ? String(error.errorCode) : '';
      const pending =
        code.includes('authorization_pending') ||
        code.includes('slow_down') ||
        (error instanceof Error && /authorization_pending|slow_down/i.test(error.message));
      if (!pending) throw error;
      await sleep(intervalMs);
    }
  }
  throw new Error('LOGIN_TIMEOUT');
}
