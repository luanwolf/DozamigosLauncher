import type { AccountData } from '@/fortnite/clients';
import { fortniteApi } from '@/fortnite/http';

export type BrStats = {
  displayName: string;
  wins: number;
  kills: number;
  kd: number;
  matches: number;
  winRate: number;
};

export async function fetchBrStats(account: AccountData): Promise<BrStats> {
  const response = await fortniteApi.get(`v2/stats/br/v2/${encodeURIComponent(account.accountId)}`).json<{
    data: {
      account: { name: string };
      stats: { all?: { overall?: { wins?: number; kills?: number; kd?: number; matches?: number; winRate?: number } } };
    };
  }>();
  const overall = response.data.stats.all?.overall ?? {};
  return {
    displayName: response.data.account.name,
    wins: overall.wins ?? 0,
    kills: overall.kills ?? 0,
    kd: overall.kd ?? 0,
    matches: overall.matches ?? 0,
    winRate: overall.winRate ?? 0
  };
}
