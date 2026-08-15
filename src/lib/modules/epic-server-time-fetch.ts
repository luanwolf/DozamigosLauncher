import { parseServerTimeMs } from '$lib/modules/epic-server-time';
import { queryProfile } from '$lib/modules/mcp';
import { logger } from '$lib/logger';
import type { AccountData } from '$types/account';

const CACHE_TTL_MS = 60_000;

let cached: { ms: number; expiresAt: number } | null = null;
let inFlight: Promise<number | null> | null = null;

/** Shared Epic server clock — one QueryProfile, reused by schedulers for ~60s. */
export async function fetchEpicServerTimeMs(accounts: AccountData[]): Promise<number | null> {
  if (cached && cached.expiresAt > Date.now()) return cached.ms;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    for (const account of accounts) {
      try {
        const profile = await queryProfile(account, 'common_core');
        const ms = parseServerTimeMs(profile.serverTime);
        if (ms != null) {
          cached = { ms, expiresAt: Date.now() + CACHE_TTL_MS };
          return ms;
        }
      } catch (error) {
        logger.debug('Failed to read Epic serverTime', { accountId: account.accountId, error });
      }
    }
    return null;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export function clearEpicServerTimeCache() {
  cached = null;
}
