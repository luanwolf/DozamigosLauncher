import { Theaters, type RarityType } from '@/stw/constants/world-info';
import type { ParsedWorldInfo, ParsedWorldMission } from '@/stw/world-info-parser';

export type MissionAlertSections = {
  vbucks: ParsedWorldMission[];
  survivors: ParsedWorldMission[];
  twinePeaks160: ParsedWorldMission[];
  ventures140: ParsedWorldMission[];
  upgradeLlamaTokens: ParsedWorldMission[];
  perkUp: ParsedWorldMission[];
  totalVbucks: number;
  totalSurvivors: number;
  totalUpgradeLlamas: number;
  totalPerkUp: number;
};

function sortMissions(arr: ParsedWorldMission[]) {
  const order: Record<string, number> = {
    [Theaters.Stonewood]: 4,
    [Theaters.Plankerton]: 3,
    [Theaters.CannyValley]: 2,
    [Theaters.TwinePeaks]: 1,
    Ventures: 0
  };
  return arr.sort((a, b) => {
    const ta = order[a.theaterId] ?? 0;
    const tb = order[b.theaterId] ?? 0;
    return ta !== tb ? ta - tb : b.powerLevel - a.powerLevel;
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

function isLegendaryOrMythicSurvivor(itemId: string, rarity?: RarityType) {
  const isWorker = itemId.includes('workerbasic') || itemId.startsWith('Worker:manager');
  return isWorker && (rarity === 'sr' || rarity === 'ur');
}

function isVentureTheater(theaterId: string) {
  return (
    theaterId !== Theaters.Stonewood &&
    theaterId !== Theaters.Plankerton &&
    theaterId !== Theaters.CannyValley &&
    theaterId !== Theaters.TwinePeaks
  );
}

export function buildMissionAlertSections(cache: ParsedWorldInfo): MissionAlertSections {
  const vbucks: ParsedWorldMission[] = [];
  const survivors: ParsedWorldMission[] = [];
  const twinePeaks160: ParsedWorldMission[] = [];
  const ventures140: ParsedWorldMission[] = [];
  const upgradeLlamaTokens: ParsedWorldMission[] = [];
  const perkUp: ParsedWorldMission[] = [];

  let totalVbucks = 0;
  let totalSurvivors = 0;
  let totalUpgradeLlamas = 0;
  let totalPerkUp = 0;

  for (const [, worldMissions] of cache.entries()) {
    for (const mission of worldMissions.values()) {
      if (!mission.alert) continue;

      const alertRewards = mission.alert.rewards;

      const vb = alertRewards.find((x) => x.itemId.includes('currency_mtxswap'));
      if (vb) {
        totalVbucks += vb.quantity;
        addMission(vbucks, mission);
      }

      const surv = alertRewards.filter((x) => isLegendaryOrMythicSurvivor(x.itemId, x.rarity));
      if (surv.length) {
        totalSurvivors += surv.reduce((s, x) => s + x.quantity, 0);
        addMission(survivors, mission);
      }

      if (alertRewards.some((x) => x.itemId.includes('voucher_cardpack_bronze'))) {
        const q = alertRewards.find((x) => x.itemId.includes('voucher_cardpack_bronze'))!.quantity;
        totalUpgradeLlamas += q;
        addMission(upgradeLlamaTokens, mission);
      }

      if (alertRewards.some((x) => x.itemId.includes('alteration_upgrade_sr'))) {
        const q = alertRewards.filter((x) => x.itemId.includes('alteration_upgrade_sr')).reduce((s, x) => s + x.quantity, 0);
        totalPerkUp += q;
        addMission(perkUp, mission);
      }

      if (mission.theaterId === Theaters.TwinePeaks && mission.powerLevel === 160) {
        addMission(twinePeaks160, mission);
      }

      if (isVentureTheater(mission.theaterId) && mission.powerLevel === 140) {
        addMission(ventures140, mission);
      }
    }
  }

  return {
    vbucks: sortMissions(vbucks),
    survivors: sortMissions(survivors),
    twinePeaks160: sortMissions(twinePeaks160),
    ventures140: sortMissions(ventures140),
    upgradeLlamaTokens: sortMissions(upgradeLlamaTokens),
    perkUp: sortMissions(perkUp),
    totalVbucks,
    totalSurvivors,
    totalUpgradeLlamas,
    totalPerkUp
  };
}

export type AlertSection = { title: string; missions: ParsedWorldMission[] };

export function getOverviewSections(data: MissionAlertSections): AlertSection[] {
  return [
    { title: `V-Bucks • ${data.vbucks.length} missões`, missions: data.vbucks },
    { title: `Sobreviventes lendários/míticos • ${data.survivors.length} missões`, missions: data.survivors },
    { title: `Twine Peaks PL 160 • ${data.twinePeaks160.length} missões`, missions: data.twinePeaks160 },
    { title: `Ventures PL 140 • ${data.ventures140.length} missões`, missions: data.ventures140 },
    { title: `Tokens de Llama de evolução • ${data.upgradeLlamaTokens.length} missões`, missions: data.upgradeLlamaTokens },
    { title: `Perk-up • ${data.perkUp.length} missões`, missions: data.perkUp }
  ].filter((s) => s.missions.length > 0);
}
