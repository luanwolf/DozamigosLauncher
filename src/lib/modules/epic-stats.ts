import { statsProxyService } from '$lib/http';
import { getAuthedKy } from '$lib/modules/auth-session';
import { summarizeFromOverall, type BrStatsSummary } from '$lib/modules/br-stats-summary';
import type { AccountData } from '$types/account';

type EpicStatsV2 = {
  startTime?: number;
  endTime?: number;
  stats?: Record<string, number>;
  accountId?: string;
};

function pick(stats: Record<string, number>, keys: string[]): number {
  for (const key of keys) {
    const value = stats[key];
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
  }
  return 0;
}

export async function fetchEpicBrStats(
  account: AccountData,
  accountId = account.accountId
): Promise<BrStatsSummary> {
  const data = await getAuthedKy(account, statsProxyService)
    .get<EpicStatsV2>(`statsv2/account/${encodeURIComponent(accountId)}`)
    .json();

  const stats = data.stats ?? {};
  // Epic keys vary by season/window; take common lifetime-style aggregates when present.
  const wins = pick(stats, [
    'br_placetop1_keyboardmouse_m0_playlist_defaultsolo',
    'br_placetop1_gamepad_m0_playlist_defaultsolo'
  ]);
  // Fallback: sum placetop1_* if specific keys missing
  let winsTotal = wins;
  if (!winsTotal) {
    winsTotal = Object.entries(stats)
      .filter(([k]) => k.includes('placetop1'))
      .reduce((sum, [, v]) => sum + (typeof v === 'number' ? v : 0), 0);
  }

  const kills = Object.entries(stats)
    .filter(([k]) => k.includes('_kills_') || k.endsWith('_kills'))
    .reduce((sum, [, v]) => sum + (typeof v === 'number' ? v : 0), 0);

  const matches = Object.entries(stats)
    .filter(([k]) => k.includes('matchesplayed') || k.includes('matches_played'))
    .reduce((sum, [, v]) => sum + (typeof v === 'number' ? v : 0), 0);

  return summarizeFromOverall({
    accountId: data.accountId || accountId,
    displayName: account.displayName,
    wins: winsTotal,
    kills,
    deaths: Math.max(0, matches - winsTotal),
    matches,
    source: 'epic'
  });
}
