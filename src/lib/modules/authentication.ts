import {
  defaultClient,
  fortniteAndroidGameClient,
  fortniteNewSwitchGameClient,
  type ClientCredentials
} from '$lib/constants/clients';
import { oauthService } from '$lib/http';
import type {
  DeviceAuthData,
  EpicDeviceAuthLoginData,
  EpicExchangeCodeData,
  EpicExchangeCodeLoginData,
  EpicOAuthData,
  EpicTokenType
} from '$types/game/authorizations';

export function getAccessTokenUsingDeviceAuth(
  deviceAuthData: DeviceAuthData,
  tokenType: EpicTokenType = 'eg1'
): Promise<EpicDeviceAuthLoginData> {
  // PC client has no device_auth grant — Android is the refresh client, then we exchange to PC.
  return oauthService
    .post<EpicDeviceAuthLoginData>('token', {
      body: new URLSearchParams({
        grant_type: 'device_auth',
        account_id: deviceAuthData.accountId,
        device_id: deviceAuthData.deviceId,
        secret: deviceAuthData.secret,
        token_type: tokenType
      }).toString(),
      headers: {
        Authorization: `Basic ${fortniteAndroidGameClient.base64}`
      }
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
      headers: {
        Authorization: `Basic ${clientCredentials.base64}`
      }
    })
    .json();
}

export function getAccessTokenUsingDeviceCode(
  deviceCode: string,
  clientCredentials: ClientCredentials = defaultClient
): Promise<EpicOAuthData> {
  return oauthService
    .post<EpicOAuthData>('token', {
      body: new URLSearchParams({
        grant_type: 'device_code',
        device_code: deviceCode,
        token_type: 'eg1'
      }).toString(),
      headers: {
        Authorization: `Basic ${clientCredentials.base64}`
      }
    })
    .json();
}

export function getExchangeCodeUsingAccessToken(accessToken: string): Promise<EpicExchangeCodeData> {
  return oauthService
    .get<EpicExchangeCodeData>('exchange', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
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
      headers: {
        Authorization: `Basic ${clientCredentials.base64}`
      }
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
      headers: {
        Authorization: `Basic ${clientCredentials.base64}`
      }
    })
    .json();
}

const AUTH_CODE_CLIENT_CHAIN = [
  defaultClient,
  fortniteNewSwitchGameClient,
  fortniteAndroidGameClient
] as const;

/**
 * Logs in with a code from Epic's redirect page (authorization code) or a true exchange code.
 * The public redirect link returns an authorization code, not an exchange code.
 */
/** Extracts a 32-char Epic code from pasted text or redirect JSON. */
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
      if (token.client_id === defaultClient.clientId) {
        return token;
      }
      const exchange = await getExchangeCodeUsingAccessToken(token.access_token);
      return await getAccessTokenUsingExchangeCode(exchange.code);
    } catch {
      continue;
    }
  }

  return getAccessTokenUsingExchangeCode(normalized);
}
