/** Normalized BR stats shared by fortnite-api and Epic Stats Proxy. */

export type BrModeStats = {
  wins: number;
  kills: number;
  matches: number;
  kd: number;
  winRate: number;
};

export type BrStatsSummary = {
  accountId: string;
  displayName: string;
  wins: number;
  kills: number;
  deaths: number;
  matches: number;
  kd: number;
  winRate: number;
  source: 'fortnite-api' | 'epic';
  minutesPlayed?: number;
  score?: number;
  top10?: number;
  playersOutlived?: number;
  lastModified?: string;
  battlePassLevel?: number;
  modes?: {
    solo?: BrModeStats;
    duo?: BrModeStats;
    squad?: BrModeStats;
  };
};

export function summarizeFromOverall(input: {
  accountId: string;
  displayName: string;
  wins: number;
  kills: number;
  deaths: number;
  matches: number;
  source: BrStatsSummary['source'];
}): BrStatsSummary {
  const matches = Math.max(0, input.matches);
  const deaths = Math.max(0, input.deaths);
  return {
    accountId: input.accountId,
    displayName: input.displayName,
    wins: input.wins,
    kills: input.kills,
    deaths,
    matches,
    kd: deaths > 0 ? input.kills / deaths : input.kills,
    winRate: matches > 0 ? (input.wins / matches) * 100 : 0,
    source: input.source
  };
}
