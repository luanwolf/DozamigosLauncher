import { fortniteApiService } from '$lib/http';
import { isFortniteApiConfigured } from '$lib/env';
import { summarizeFromOverall, type BrModeStats, type BrStatsSummary } from '$lib/modules/br-stats-summary';

type FnApiOverall = {
  wins?: number;
  kills?: number;
  deaths?: number;
  matches?: number;
  kd?: number;
  winRate?: number;
  minutesPlayed?: number;
  score?: number;
  top10?: number;
  playersOutlived?: number;
  lastModified?: string;
};

type FnApiStatsResponse = {
  status: number;
  data: {
    account: { id: string; name: string };
    battlePass?: { level?: number; progress?: number };
    stats: {
      all?: {
        overall?: FnApiOverall;
        solo?: FnApiOverall;
        duo?: FnApiOverall;
        squad?: FnApiOverall;
      };
    };
  };
};

function modeStats(row: FnApiOverall | undefined): BrModeStats | undefined {
  if (!row) return undefined;
  const matches = row.matches ?? 0;
  const kills = row.kills ?? 0;
  const deaths = row.deaths ?? 0;
  return {
    wins: row.wins ?? 0,
    kills,
    matches,
    kd: row.kd ?? (deaths > 0 ? kills / deaths : kills),
    winRate: row.winRate ?? (matches > 0 ? ((row.wins ?? 0) / matches) * 100 : 0)
  };
}

function mapStats(response: FnApiStatsResponse): BrStatsSummary {
  const overall = response.data.stats.all?.overall ?? {};
  const base = summarizeFromOverall({
    accountId: response.data.account.id,
    displayName: response.data.account.name,
    wins: overall.wins ?? 0,
    kills: overall.kills ?? 0,
    deaths: overall.deaths ?? 0,
    matches: overall.matches ?? 0,
    source: 'fortnite-api'
  });
  const all = response.data.stats.all;
  return {
    ...base,
    minutesPlayed: overall.minutesPlayed,
    score: overall.score,
    top10: overall.top10,
    playersOutlived: overall.playersOutlived,
    lastModified: overall.lastModified,
    battlePassLevel: response.data.battlePass?.level,
    modes: {
      solo: modeStats(all?.solo),
      duo: modeStats(all?.duo),
      squad: modeStats(all?.squad)
    }
  };
}

export async function fetchBrStatsByAccountId(accountId: string): Promise<BrStatsSummary> {
  const response = await fortniteApiService
    .get<FnApiStatsResponse>(`v2/stats/br/v2/${encodeURIComponent(accountId)}`)
    .json();
  return mapStats(response);
}

export async function fetchBrStatsByName(name: string): Promise<BrStatsSummary> {
  const response = await fortniteApiService
    .get<FnApiStatsResponse>('v2/stats/br/v2', { searchParams: { name } })
    .json();
  return mapStats(response);
}

export { isFortniteApiConfigured };
