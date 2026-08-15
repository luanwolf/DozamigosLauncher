import ky, { isHTTPError } from 'ky';
import { getVersion } from '@tauri-apps/api/app';
import { fetch } from '@tauri-apps/plugin-http';
import { arch } from '@tauri-apps/plugin-os';
import { safePlatform } from '$lib/modules/safe-platform';
import { defaultClient } from '$lib/constants/clients';
import { getApiFortniteKey, getFnbrApiKey, getFortniteApiKey } from '$lib/env';
import { EpicAPIError, isEpicAPIError } from '$lib/exceptions/EpicAPIError';

// Used to avoid CORS issues
export const tauriKy = ky.create({
  timeout: 30_000,
  retry: 0,
  fetch: async (input, init = {}) => {
    const headers = new Headers(init.headers);
    if (input instanceof Request) {
      for (const [key, value] of input.headers.entries()) {
        if (!headers.has(key)) {
          headers.set(key, value);
        }
      }
    }

    // The browser drops the User-Agent header
    // As a workaround we pass it as X-User-Agent and put it back in Tauri's own fetch implementation
    const uaOverride = headers.get('X-User-Agent');
    if (uaOverride) {
      headers.set('User-Agent', uaOverride);
      headers.delete('X-User-Agent');
    }

    init.headers = headers;
    return fetch(input, init);
  }
});

// Sync default — no top-level await (that caused SvelteKit "component" TDZ on boot).
const defaultUserAgent =
  'Fortnite/++Fortnite+Release-36.10-CL-59001174 Windows/10.0.26100.1.256.64bit';

let userAgent = defaultUserAgent;

setTimeout(() => {
  void (async () => {
    try {
      const [{ getFortniteManifest }, { getVersion }, { settingsStore }] = await Promise.all([
        import('$lib/modules/manifest'),
        import('@tauri-apps/api/app'),
        import('$lib/storage')
      ]);
      const manifest = await getFortniteManifest().catch(() => null);
      if (manifest?.appVersionString) {
        userAgent = `Fortnite/${manifest.appVersionString.replace('-Windows', '')} Windows/10.0.26100.1.256.64bit`;
      }
      void getVersion; // kept available if we later stamp launcher UA
      settingsStore.subscribe((settings) => {
        userAgent = settings.app?.userAgent || userAgent || defaultUserAgent;
      });
    } catch {
      // Boot may outrun storage/Tauri; keep default UA.
    }
  })();
}, 0);

export const epicService = tauriKy.extend({
  hooks: {
    beforeRequest: [
      async ({ request }) => {
        if (!request.headers.has('X-User-Agent')) {
          request.headers.set('X-User-Agent', userAgent);
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

export const matchmakingService = epicService.extend({
  prefix: 'https://fngw-mcp-gc-livefn.ol.epicgames.com/fortnite/api/matchmaking'
});

export const calendarService = epicService.extend({
  prefix: 'https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/calendar/v1'
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

/** Alternate host used by Epic launcher clients for owner account details (email, etc.). */
export const accountPublicServiceProd03 = epicService.extend({
  prefix: 'https://account-public-service-prod03.ol.epicgames.com/account/api/public/account'
});

export const eulaService = epicService.extend({
  prefix: 'https://eulatracking-public-service-prod.ol.epicgames.com/eulatracking/api/public/agreements/fn'
});

export const userSearchService = epicService.extend({
  prefix: 'https://user-search-service-prod.ol.epicgames.com/api/v1/search'
});

export const avatarService = epicService.extend({
  prefix: 'https://avatar-service-prod.identity.live.on.epicgames.com/v1/avatar/fortnite'
});

// Sync default — getVersion() must not be top-level awaited (SvelteKit component TDZ).
let launcherUA = `DozamigosLauncher/dev (${safePlatform()}; unknown)`;
void getVersion()
  .then((version) => {
    let cpuArch = 'unknown';
    try {
      cpuArch = arch();
    } catch {
      /* browser / early boot */
    }
    launcherUA = `DozamigosLauncher/${version} (${safePlatform()}; ${cpuArch})`;
  })
  .catch(() => {
    /* keep dev UA */
  });

const fortniteApiKey = getFortniteApiKey();
const fnbrApiKey = getFnbrApiKey();
const apiFortniteKey = getApiFortniteKey();

const launcherUaHook = {
  beforeRequest: [
    async ({ request }: { request: Request }) => {
      request.headers.set('X-User-Agent', launcherUA);
    }
  ]
};

export const fortniteApiService = tauriKy.extend({
  prefix: 'https://fortnite-api.com',
  hooks: launcherUaHook,
  headers: {
    ...(fortniteApiKey ? { Authorization: fortniteApiKey } : {})
  }
});

export const fnbrApiService = tauriKy.extend({
  prefix: 'https://fnbr.co/api',
  hooks: launcherUaHook,
  headers: {
    ...(fnbrApiKey ? { 'x-api-key': fnbrApiKey } : {})
  }
});

export const apiFortniteService = tauriKy.extend({
  prefix: 'https://prod.api-fortnite.com/api',
  hooks: launcherUaHook,
  headers: {
    ...(apiFortniteKey ? { 'x-api-key': apiFortniteKey } : {})
  }
});

export const legendaryService = tauriKy.extend({
  prefix: 'https://api.legendary.gl',
  hooks: launcherUaHook
});

export const egsStoreService = epicService.extend({
  prefix: 'https://store-site-backend-static-ipv4.ak.epicgames.com'
});

export const egsGraphqlService = epicService.extend({
  prefix: 'https://store.epicgames.com/graphql'
});

export const orderProcessorService = epicService.extend({
  prefix: 'https://orderprocessor-public-service-ecomprod01.ol.epicgames.com/orderprocessor/api/shared'
});

export const statsProxyService = epicService.extend({
  prefix: 'https://statsproxy-public-service-live.ol.epicgames.com/statsproxy/api'
});
