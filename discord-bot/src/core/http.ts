import ky, { isHTTPError, type KyInstance } from 'ky';
import { defaultClient, type ClientCredentials } from '@/core/clients';
import { EpicAPIError, isEpicAPIError } from '@/core/EpicAPIError';

const defaultUserAgent = 'Fortnite/++Fortnite+Release-36.10-CL-59001174 Windows/10.0.26100.1.256.64bit';

export const epicService = ky.create({
  timeout: 30_000,
  retry: 0,
  hooks: {
    beforeRequest: [
      async ({ request }) => {
        if (!request.headers.has('User-Agent')) {
          request.headers.set('User-Agent', defaultUserAgent);
        }
      }
    ],
    beforeError: [
      async ({ error }) => {
        if (!isHTTPError(error) || !isEpicAPIError(error.data)) return error;
        return new EpicAPIError(error.data);
      }
    ]
  }
});

export const baseGameService = epicService.extend({
  prefix: 'https://fngw-mcp-gc-livefn.ol.epicgames.com/fortnite/api/game/v2'
});

export const storefrontService = epicService.extend({
  prefix: 'https://fngw-mcp-gc-livefn.ol.epicgames.com/fortnite/api/storefront/v2'
});

export const friendService = epicService.extend({
  prefix: 'https://friends-public-service-prod.ol.epicgames.com/friends/api/v1'
});

export const fulfillmentService = epicService.extend({
  prefix: 'https://fulfillment-public-service-prod.ol.epicgames.com/fulfillment/api/public'
});

export const lightswitchService = epicService.extend({
  prefix: 'https://lightswitch-public-service-prod.ol.epicgames.com/lightswitch/api/service'
});

export const oauthService = epicService.extend({
  prefix: 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth',
  hooks: {
    beforeRequest: [
      async ({ request }) => {
        if (!request.headers.has('Authorization')) {
          request.headers.set('Authorization', `Basic ${defaultClient.base64}`);
        }
        request.headers.set('Content-Type', 'application/x-www-form-urlencoded');
      }
    ]
  }
});

export const partyService = epicService.extend({
  prefix: 'https://party-service-prod.ol.epicgames.com/party/api/v1/Fortnite'
});

export const publicAccountService = epicService.extend({
  prefix: 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account'
});

export const userSearchService = epicService.extend({
  prefix: 'https://user-search-service-prod.ol.epicgames.com/api/v1/search'
});

export const fortniteApiService = ky.create({
  prefix: 'https://fortnite-api.com',
  timeout: 30_000,
  headers: { 'User-Agent': 'DozamigosDiscordBot/1.9.0' }
});

export { type KyInstance };
