import ky from 'ky';
import { config } from '@/shared/config';
import { defaultClient } from '@/fortnite/clients';
import { EpicAPIError, isEpicAPIError } from '@/fortnite/errors';

export const FN_UA = 'Fortnite/++Fortnite+Release-42.00-CL-56878558 Windows/10.0.26100.1.256.64bit';
export const BOT_UA = 'DozamigosDiscordBot/0.1.0';

export const http = ky.create({
  timeout: 30_000,
  retry: 0,
  hooks: {
    beforeRequest: [
      (request) => {
        if (!request.headers.has('User-Agent')) request.headers.set('User-Agent', FN_UA);
      }
    ],
    afterResponse: [
      async (_request, _options, response) => {
        if (response.ok) return response;
        const data = await response
          .clone()
          .json()
          .catch(() => null);
        if (isEpicAPIError(data)) throw new EpicAPIError(data);
        if (data && typeof data === 'object' && 'error' in data) {
          const err = data as { error: string; error_description?: string };
          throw new EpicAPIError({
            errorCode: err.error,
            errorMessage: err.error_description || err.error
          });
        }
        return response;
      }
    ]
  }
});

export const fortniteApi = http.extend({
  prefixUrl: 'https://fortnite-api.com',
  headers: {
    'User-Agent': BOT_UA,
    ...(config.fortniteApiKey ? { Authorization: config.fortniteApiKey } : {})
  }
});

export const oauthService = http.extend({
  prefixUrl: 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth',
  hooks: {
    beforeRequest: [
      (request) => {
        if (!request.headers.has('Authorization')) {
          request.headers.set('Authorization', `Basic ${defaultClient.base64}`);
        }
        request.headers.set('Content-Type', 'application/x-www-form-urlencoded');
      }
    ]
  }
});

export const publicAccountService = http.extend({
  prefixUrl: 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account'
});

export const baseGameService = http.extend({
  prefixUrl: 'https://fngw-mcp-gc-livefn.ol.epicgames.com/fortnite/api/game/v2'
});

export const storefrontService = http.extend({
  prefixUrl: 'https://fngw-mcp-gc-livefn.ol.epicgames.com/fortnite/api/storefront/v2'
});

export const calendarService = http.extend({
  prefixUrl: 'https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/calendar/v1'
});

export const lightswitchService = http.extend({
  prefixUrl: 'https://lightswitch-public-service-prod.ol.epicgames.com/lightswitch/api/service'
});

export const fulfillmentService = http.extend({
  prefixUrl: 'https://fulfillment-public-service-prod.ol.epicgames.com/fulfillment/api/public'
});

export const magpieService = http.extend({
  prefixUrl: 'https://fngw-svc-ds-livefn.ol.epicgames.com/api/magpie/v1'
});

export const eosInventoryService = http.extend({
  prefixUrl: 'https://fngw-svc-ds-livefn.ol.epicgames.com/api/inventory/v3'
});
