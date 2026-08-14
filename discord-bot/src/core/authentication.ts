import {
  defaultClient,
  epicLoginAuthorizationCodeUrl,
  fortniteNewSwitchGameClient,
  fortnitePCGameClient,
  type ClientCredentials
} from '@/core/clients';
import { oauthService, publicAccountService } from '@/core/http';
import type {
  AccountData,
  DeviceAuthData,
  EpicDeviceAuthLoginData,
  EpicExchangeCodeData,
  EpicExchangeCodeLoginData,
  EpicOAuthData,
  EpicTokenType
} from '@/core/types';

export { epicLoginAuthorizationCodeUrl };

export function getAccessTokenUsingDeviceAuth(
  deviceAuthData: DeviceAuthData,
  tokenType: EpicTokenType = 'eg1'
): Promise<EpicDeviceAuthLoginData> {
  return oauthService
    .post<EpicDeviceAuthLoginData>('token', {
      body: new URLSearchParams({
        grant_type: 'device_auth',
        account_id: deviceAuthData.accountId,
        device_id: deviceAuthData.deviceId,
        secret: deviceAuthData.secret,
        token_type: tokenType
      }).toString()
    })
    .json();
}

export function getAccessTokenUsingClientCredentials(
  clientCredentials: ClientCredentials = defaultClient
): Promise<EpicOAuthData> {
  return oauthService
    .post<EpicOAuthData>('token', {
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        token_type: 'eg1'
      }).toString(),
      headers: { Authorization: `Basic ${clientCredentials.base64}` }
    })
    .json();
}

export function getExchangeCodeUsingAccessToken(accessToken: string): Promise<EpicExchangeCodeData> {
  return oauthService
    .get<EpicExchangeCodeData>('exchange', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    .json();
}

export function getAccessTokenUsingExchangeCode(
  exchangeCode: string,
  clientCredentials: ClientCredentials = defaultClient,
  tokenType: EpicTokenType = 'eg1'
): Promise<EpicExchangeCodeLoginData> {
  return oauthService
    .post<EpicExchangeCodeLoginData>('token', {
      body: new URLSearchParams({
        grant_type: 'exchange_code',
        exchange_code: exchangeCode.replace(/[|`'"]/g, ''),
        token_type: tokenType
      }).toString(),
      headers: { Authorization: `Basic ${clientCredentials.base64}` }
    })
    .json();
}

export function getAccessTokenUsingAuthorizationCode(
  authorizationCode: string,
  clientCredentials: ClientCredentials = defaultClient,
  tokenType: EpicTokenType = 'eg1'
): Promise<EpicExchangeCodeLoginData> {
  return oauthService
    .post<EpicExchangeCodeLoginData>('token', {
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: authorizationCode.replace(/[|`'"]/g, ''),
        token_type: tokenType
      }).toString(),
      headers: { Authorization: `Basic ${clientCredentials.base64}` }
    })
    .json();
}

const AUTH_CODE_CLIENT_CHAIN = [defaultClient, fortniteNewSwitchGameClient, fortnitePCGameClient] as const;

export function parseEpicLoginCodeInput(raw: string): string {
  const trimmed = raw.trim();
  try {
    const json = JSON.parse(trimmed) as {
      authorizationCode?: string;
      exchangeCode?: string;
      code?: string;
    };
    const fromJson = json.authorizationCode || json.exchangeCode || json.code;
    if (fromJson) return fromJson.replace(/[|`'"]/g, '').trim();
  } catch {
    // not JSON
  }

  const authMatch = trimmed.match(/authorizationCode["'\s:]+([a-f0-9]{32})/i);
  if (authMatch?.[1]) return authMatch[1];

  const exchangeMatch = trimmed.match(/exchangeCode["'\s:]+([a-f0-9]{32})/i);
  if (exchangeMatch?.[1]) return exchangeMatch[1];

  return trimmed.replace(/[|`'"]/g, '').trim();
}

export async function getAccessTokenFromEpicLoginCode(code: string): Promise<EpicExchangeCodeLoginData> {
  const normalized = parseEpicLoginCodeInput(code);

  for (const client of AUTH_CODE_CLIENT_CHAIN) {
    try {
      const token = await getAccessTokenUsingAuthorizationCode(normalized, client);
      if (token.client_id === defaultClient.clientId) return token;
      const exchange = await getExchangeCodeUsingAccessToken(token.access_token);
      return await getAccessTokenUsingExchangeCode(exchange.code);
    } catch {
      continue;
    }
  }

  return getAccessTokenUsingExchangeCode(normalized);
}

export async function loginWithEpicCode(code: string): Promise<AccountData> {
  const token = await getAccessTokenFromEpicLoginCode(code);
  const deviceAuth = await createDeviceAuthWithToken(token.account_id, token.access_token);
  return {
    displayName: token.displayName,
    accountId: token.account_id,
    deviceId: deviceAuth.deviceId,
    secret: deviceAuth.secret
  };
}

export async function loginWithDeviceAuth(data: DeviceAuthData, displayName?: string): Promise<AccountData> {
  const token = await getAccessTokenUsingDeviceAuth(data);
  return {
    displayName: displayName || token.displayName,
    accountId: data.accountId,
    deviceId: data.deviceId,
    secret: data.secret
  };
}

async function createDeviceAuthWithToken(accountId: string, accessToken: string) {
  return publicAccountService
    .post<{ deviceId: string; secret: string }>(`${accountId}/deviceAuth`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    .json();
}
