import { TheaterPowerLevels, Theaters } from '$lib/constants/stw/world-info';
import type { RarityType } from '$types/game/stw/resources';
import type { ParsedWorldInfo, ParsedWorldMission } from '$types/game/stw/world-info';

export type MissionAlertsBuckets = {
  vbucks: ParsedWorldMission[];
  survivors: ParsedWorldMission[];
  survivorWorkers: ParsedWorldMission[];
  leadSurvivors: ParsedWorldMission[];
  upgradeLlamaTokens: ParsedWorldMission[];
  perkUp: ParsedWorldMission[];
  twinePeaks160: ParsedWorldMission[];
  ventures140: ParsedWorldMission[];
  totalVbucks: number;
  totalSurvivors: number;
  totalSurvivorWorkers: number;
  totalLeadSurvivors: number;
};

export type MissionAlertsOverview = {
  totalVbucks: number;
  totalSurvivors: number;
  totalUpgradeLlamas: number;
  totalPerkUp: number;
};

function isLegendaryOrMythicSurvivor(itemId: string, rarity?: RarityType) {
  const isWorker = itemId.includes('workerbasic') || itemId.startsWith('Worker:manager');
  return isWorker && (rarity === 'sr' || rarity === 'ur');
}

function isLegendaryOrMythicWorker(itemId: string, rarity?: RarityType) {
  return itemId.includes('workerbasic') && (rarity === 'sr' || rarity === 'ur');
}

function isLegendaryOrMythicLead(itemId: string, rarity?: RarityType) {
  return itemId.startsWith('Worker:manager') && (rarity === 'sr' || rarity === 'ur');
}

function isVentureTheater(theaterId: string) {
  return (
    theaterId !== Theaters.Stonewood &&
    theaterId !== Theaters.Plankerton &&
    theaterId !== Theaters.CannyValley &&
    theaterId !== Theaters.TwinePeaks
  );
}

function sortMissions(arr: ParsedWorldMission[]) {
  const order: Record<string, number> = {
    [Theaters.Stonewood]: 4,
    [Theaters.Plankerton]: 3,
    [Theaters.CannyValley]: 2,
    [Theaters.TwinePeaks]: 1,
    Ventures: 0
  };

  return arr.sort((a, b) => {
    const theaterA = order[a.theaterId] || order.Ventures;
    const theaterB = order[b.theaterId] || order.Ventures;
    return theaterA !== theaterB ? theaterA - theaterB : b.powerLevel - a.powerLevel;
  });
}

function addMission(list: ParsedWorldMission[], mission: ParsedWorldMission) {
  const guid = mission.alert?.guid;
  if (guid) {
    if (!list.some((m) => m.alert?.guid === guid)) list.push(mission);
    return;
  }
  if (!list.some((m) => m === mission)) list.push(mission);
}

export function aggregateMissionAlerts(cache: ParsedWorldInfo | undefined | null): MissionAlertsBuckets | null {
  if (!cache?.size) return null;

  const vbucks: ParsedWorldMission[] = [];
  const survivors: ParsedWorldMission[] = [];
  const survivorWorkers: ParsedWorldMission[] = [];
  const leadSurvivors: ParsedWorldMission[] = [];
  const upgradeLlamaTokens: ParsedWorldMission[] = [];
  const perkUp: ParsedWorldMission[] = [];
  const twinePeaks160: ParsedWorldMission[] = [];
  const ventures140: ParsedWorldMission[] = [];

  let totalVbucks = 0;
  let totalSurvivors = 0;
  let totalSurvivorWorkers = 0;
  let totalLeadSurvivors = 0;

  for (const [, worldMissions] of cache.entries()) {
    for (const mission of worldMissions.values()) {
      const alertRewards = mission.alert?.rewards ?? [];

      const vbuckMatch = alertRewards.find((x) => x.itemId.includes('currency_mtxswap'));
      if (vbuckMatch) {
        totalVbucks += vbuckMatch.quantity;
        addMission(vbucks, mission);
      }

      const llamaMatch = alertRewards.find((x) => x.itemId.includes('voucher_cardpack_bronze'));
      if (llamaMatch) addMission(upgradeLlamaTokens, mission);

      const perkMatch = alertRewards.find((x) => x.itemId.includes('alteration_upgrade_sr'));
      if (perkMatch) addMission(perkUp, mission);

      const survivorMatches = alertRewards.filter((x) => isLegendaryOrMythicSurvivor(x.itemId, x.rarity));
      if (survivorMatches.length) {
        totalSurvivors += survivorMatches.reduce((sum, x) => sum + x.quantity, 0);
        addMission(survivors, mission);
      }

      const workerMatches = alertRewards.filter((x) => isLegendaryOrMythicWorker(x.itemId, x.rarity));
      if (workerMatches.length) {
        totalSurvivorWorkers += workerMatches.reduce((sum, x) => sum + x.quantity, 0);
        addMission(survivorWorkers, mission);
      }

      const leadMatches = alertRewards.filter((x) => isLegendaryOrMythicLead(x.itemId, x.rarity));
      if (leadMatches.length) {
        totalLeadSurvivors += leadMatches.reduce((sum, x) => sum + x.quantity, 0);
        addMission(leadSurvivors, mission);
      }

      if (
        mission.theaterId === Theaters.TwinePeaks &&
        mission.powerLevel === TheaterPowerLevels[Theaters.TwinePeaks].Endgame_Zone6
      ) {
        addMission(twinePeaks160, mission);
      }

      if (
        isVentureTheater(mission.theaterId) &&
        mission.powerLevel === TheaterPowerLevels.Ventures.Phoenix_Zone25
      ) {
        addMission(ventures140, mission);
      }
    }
  }

  return {
    vbucks: sortMissions(vbucks),
    survivors: sortMissions(survivors),
    survivorWorkers: sortMissions(survivorWorkers),
    leadSurvivors: sortMissions(leadSurvivors),
    upgradeLlamaTokens: sortMissions(upgradeLlamaTokens),
    perkUp: sortMissions(perkUp),
    twinePeaks160: sortMissions(twinePeaks160),
    ventures140: sortMissions(ventures140),
    totalVbucks,
    totalSurvivors,
    totalSurvivorWorkers,
    totalLeadSurvivors
  };
}

export function aggregateMissionAlertsOverview(
  cache: ParsedWorldInfo | undefined | null
): MissionAlertsOverview | null {
  if (!cache?.size) return null;

  let totalVbucks = 0;
  let totalSurvivors = 0;
  let totalUpgradeLlamas = 0;
  let totalPerkUp = 0;

  for (const [, worldMissions] of cache.entries()) {
    for (const mission of worldMissions.values()) {
      const alertRewards = mission.alert?.rewards ?? [];

      const vbuckMatch = alertRewards.find((x) => x.itemId.includes('currency_mtxswap'));
      if (vbuckMatch) totalVbucks += vbuckMatch.quantity;

      const llamaMatch = alertRewards.find((x) => x.itemId.includes('voucher_cardpack_bronze'));
      if (llamaMatch) totalUpgradeLlamas += llamaMatch.quantity;

      const perkMatch = alertRewards.find((x) => x.itemId.includes('alteration_upgrade_sr'));
      if (perkMatch) totalPerkUp += perkMatch.quantity;

      const survivorMatches = alertRewards.filter((x) => isLegendaryOrMythicSurvivor(x.itemId, x.rarity));
      totalSurvivors += survivorMatches.reduce((sum, x) => sum + x.quantity, 0);
    }
  }

  return {
    totalVbucks,
    totalSurvivors,
    totalUpgradeLlamas,
    totalPerkUp
  };
}
