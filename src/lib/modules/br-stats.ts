import { fortniteApiService } from '$lib/http';
import { isFortniteApiConfigured } from '$lib/env';
import { summarizeFromOverall, type BrStatsSummary } from '$lib/modules/br-stats-summary';

type FnApiStatsResponse = {
  status: number;
  data: {
    account: { id: string; name: string };
    stats: {
      all?: {
        overall?: {
          wins?: number;
          kills?: number;
          deaths?: number;
          matches?: number;
          kd?: number;
          winRate?: number;
        };
      };
    };
  };
};

export async function fetchBrStatsByAccountId(accountId: string): Promise<BrStatsSummary> {
  const response = await fortniteApiService
    .get<FnApiStatsResponse>(`v2/stats/br/v2/${encodeURIComponent(accountId)}`)
    .json();

  const overall = response.data.stats.all?.overall ?? {};
  return summarizeFromOverall({
    accountId: response.data.account.id,
    displayName: response.data.account.name,
    wins: overall.wins ?? 0,
    kills: overall.kills ?? 0,
    deaths: overall.deaths ?? 0,
    matches: overall.matches ?? 0,
    source: 'fortnite-api'
  });
}

export async function fetchBrStatsByName(name: string): Promise<BrStatsSummary> {
  const response = await fortniteApiService
    .get<FnApiStatsResponse>('v2/stats/br/v2', { searchParams: { name } })
    .json();

  const overall = response.data.stats.all?.overall ?? {};
  return summarizeFromOverall({
    accountId: response.data.account.id,
    displayName: response.data.account.name,
    wins: overall.wins ?? 0,
    kills: overall.kills ?? 0,
    deaths: overall.deaths ?? 0,
    matches: overall.matches ?? 0,
    source: 'fortnite-api'
  });
}

export { isFortniteApiConfigured };
