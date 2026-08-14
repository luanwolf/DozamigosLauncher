import heroes from '../../../src/lib/data/heroes.json';
import survivors from '../../../src/lib/data/survivors.json';
import survivorsMythicLeads from '../../../src/lib/data/survivors-mythic-leads.json';
import resources from '../../../src/lib/data/resources.json';
import ingredients from '../../../src/lib/data/ingredients.json';
import traps from '../../../src/lib/data/traps.json';
import { staticAsset } from '@/config/paths';
import {
  DefaultMissionZoneIcon,
  GroupZones,
  Rarities,
  RarityNamesPt,
  TheaterPowerLevels,
  Theaters,
  TheaterStormKingZones,
  ZoneCategoriesWithoutIcon,
  ZoneModifiers,
  type RarityType,
  type ZoneCategoryId
} from '@/stw/constants/world-info';
import { resolveZoneCategoryId } from '@/stw/mission-zone-name';

export type ParsedWorldMission = {
  theaterId: string;
  guid: string;
  generator: string;
  tileIndex: number;
  isGroup: boolean;
  modifiers: { id: string; imagePath: string }[] | null;
  rewards: { imagePath: string; itemId: string; quantity: number; isHard: boolean }[];
  zone: { theme: string; type: { id?: ZoneCategoryId; imagePath: string } };
  powerLevel: number;
  alert: {
    guid: string;
    rewards: { itemId: string; imagePath: string; quantity: number; rarity: RarityType }[];
  } | null;
};

export type ParsedWorldInfo = Map<string, Map<string, ParsedWorldMission>>;

type WorldInfoData = {
  theaters: {
    uniqueId: string;
    missionRewardNamedWeightsRowName: string;
    tiles: { zoneTheme: string }[];
    regions: {
      uniqueId: string;
      tileIndices: number[];
      missionData?: { difficultyWeights?: { difficultyInfo?: { rowName?: string } }[] };
    }[];
  }[];
  missions: {
    theaterId: string;
    availableMissions: {
      missionGuid: string;
      missionGenerator: string;
      tileIndex: number;
      missionRewards: { items: { itemType: string; quantity: number }[] };
    }[];
  }[];
  missionAlerts: {
    theaterId: string;
    availableMissionAlerts: {
      missionAlertGuid: string;
      tileIndex: number;
      missionAlertRewards: { items: { itemType: string; quantity: number }[] };
      missionAlertModifiers?: { items: { itemType: string; quantity: number }[] };
    }[];
  }[];
};

type RewardItem = { itemType: string; quantity: number };

function asset(rel: string) {
  return staticAsset(rel.replace(/^\//, ''));
}

function mergeItems(items: RewardItem[]): RewardItem[] {
  const map = new Map<string, RewardItem>();
  for (const item of items) {
    const existing = map.get(item.itemType);
    if (existing) existing.quantity += item.quantity;
    else map.set(item.itemType, { ...item });
  }
  return Array.from(map.values());
}

function parseRarity(key: string): { rarity: RarityType; name: string } {
  let rarity: RarityType = Rarities.Common;
  for (const r of Object.values(Rarities)) {
    if (key.includes(`_${r}`)) {
      rarity = r;
      break;
    }
  }
  return { rarity, name: RarityNamesPt[rarity] };
}

function parseResource(key: string, quantity: number) {
  const newKey = key
    .replace(/_((very)?low|medium|(very)?high|extreme)$/i, '')
    .replace('AccountResource:', '')
    .replace('CardPack:zcp_', '');

  const { rarity, name: rarityName } = parseRarity(newKey);
  const data = {
    key,
    quantity,
    imagePath: asset(`rarities/${rarity}.png`),
    itemType: key,
    name: rarityName,
    rarity,
    type: null as string | null
  };

  for (const [id, resource] of Object.entries(resources as Record<string, { name: string }>)) {
    if (!newKey.includes(id)) continue;
    const isEvent =
      (newKey !== 'eventcurrency_scaling' && newKey !== 'eventcurrency_founders' && newKey.startsWith('eventcurrency_')) ||
      newKey === 'campaign_event_currency';
    const isUnknown = id === 'campaign_event_currency' || id === 'eventcurrency_spring' || id === 'eventcurrency_summer';
    data.imagePath = asset(`${isEvent ? 'currency' : 'resources'}/${id}.${isUnknown ? 'gif' : 'png'}`);
    data.name = resource.name;
    data.type = 'resource';
    return data;
  }

  for (const [id, ingredient] of Object.entries(ingredients as Record<string, { name: string }>)) {
    if (!newKey.includes(id)) continue;
    data.imagePath = asset(`ingredients/${id}.png`);
    data.name = ingredient.name;
    data.type = 'ingredient';
    return data;
  }

  for (const id of Object.keys(survivorsMythicLeads as Record<string, unknown>)) {
    if (!newKey.includes(id)) continue;
    data.imagePath = asset(`survivors/unique-leads/${id}.png`);
    data.name = `${RarityNamesPt[Rarities.Mythic]} Lead`;
    data.type = 'worker';
    return data;
  }

  for (const [id, survivor] of Object.entries(survivors as Record<string, { name?: string }>)) {
    if (!newKey.includes(id)) continue;
    data.imagePath = asset(`survivors/${id}.png`);
    data.name = survivor.name || `${rarityName} Survivor`;
    data.type = 'worker';
    return data;
  }

  if (newKey.startsWith('Worker:')) {
    const isManager = newKey.includes('manager');
    const rarityMap: Partial<Record<RarityType, RarityType>> = {
      [Rarities.Common]: Rarities.Uncommon,
      [Rarities.Uncommon]: Rarities.Rare,
      [Rarities.Rare]: Rarities.Epic,
      [Rarities.Epic]: Rarities.Legendary
    };
    const nr = isManager ? (rarityMap[rarity] ?? rarity) : rarity;
    data.imagePath = asset(`resources/voucher_generic_${isManager ? 'manager' : 'worker'}_${nr}.png`);
    data.name = `${RarityNamesPt[nr]}${isManager ? ' Lead' : ''} Survivor`;
    data.rarity = nr;
    data.type = 'worker';
    return data;
  }

  if (newKey.startsWith('Hero:')) {
    data.imagePath = asset(`resources/voucher_generic_hero_${rarity}.png`);
    data.type = 'hero';
    return data;
  }

  if (newKey.startsWith('Defender:')) {
    data.imagePath = asset(`resources/voucher_generic_defender_${rarity}.png`);
    data.type = 'defender';
    return data;
  }

  for (const [id, trap] of Object.entries(traps as Record<string, { name: string }>)) {
    if (!newKey.includes(id)) continue;
    data.imagePath = asset(`traps/${id}.png`);
    data.type = 'trap';
    return data;
  }

  if (newKey.startsWith('Schematic:')) {
    data.imagePath = asset(`resources/voucher_generic_schematic_${rarity}.png`);
    return data;
  }

  return data;
}

function parseZone(generator: string) {
  const key = resolveZoneCategoryId(generator);
  const isGroup = generator.toLowerCase().includes('group');
  if (!key || ZoneCategoriesWithoutIcon.has(key)) {
    return { id: key, imagePath: asset(DefaultMissionZoneIcon) };
  }
  const file = isGroup && GroupZones.includes(key) ? `${key}-group` : key;
  return { id: key, imagePath: asset(`world/${file}.png`) };
}

function parseModifier(key: string) {
  const id = key.replace('GameplayModifier:', '');
  const mod = Object.values(ZoneModifiers).includes(id) ? id : null;
  return { id: key, imagePath: asset(mod ? `modifiers/${mod}.png` : 'world/question.png') };
}

function parseMission(
  theater: WorldInfoData['theaters'][number],
  mission: WorldInfoData['missions'][number]['availableMissions'][number],
  zone: string,
  alert?: WorldInfoData['missionAlerts'][number]['availableMissionAlerts'][number]
): ParsedWorldMission {
  const zoneInfo = parseZone(mission.missionGenerator);
  const isGroup =
    theater.uniqueId === Theaters.Stonewood && zoneInfo.id === 'ets'
      ? false
      : mission.missionGenerator.toLowerCase().includes('group');

  const plMap = TheaterPowerLevels[theater.uniqueId] ?? TheaterPowerLevels.Ventures;
  const powerLevel = plMap[zone] ?? -1;

  const missionRewards = mergeItems(mission.missionRewards.items).map((item) => {
    const parsed = parseResource(item.itemType, item.quantity);
    return {
      imagePath: parsed.imagePath,
      itemId: item.itemType,
      quantity: item.quantity ?? 1,
      isHard: false
    };
  });

  const alertRewards =
    alert &&
    mergeItems(alert.missionAlertRewards.items).map((item) => {
      const parsed = parseResource(item.itemType, item.quantity);
      return {
        imagePath: parsed.imagePath,
        itemId: item.itemType,
        quantity: item.quantity ?? 1,
        rarity: parsed.rarity
      };
    });

  const modifiers = alert?.missionAlertModifiers?.items.map((m) => parseModifier(m.itemType)) ?? null;

  return {
    theaterId: theater.uniqueId,
    guid: mission.missionGuid,
    generator: mission.missionGenerator,
    tileIndex: mission.tileIndex,
    rewards: missionRewards,
    modifiers,
    powerLevel,
    isGroup,
    zone: { theme: theater.tiles[mission.tileIndex]?.zoneTheme ?? '', type: zoneInfo },
    alert: alert && alertRewards?.length ? { guid: alert.missionAlertGuid, rewards: alertRewards } : null
  };
}

export function parseWorldInfo(data: WorldInfoData): ParsedWorldInfo {
  const worldInfo: ParsedWorldInfo = new Map();
  const validTheaters = [Theaters.Stonewood, Theaters.Plankerton, Theaters.CannyValley, Theaters.TwinePeaks];

  for (const theater of data.theaters) {
    const theaterId = theater.uniqueId;
    if (!validTheaters.includes(theaterId as (typeof validTheaters)[number]) && theater.missionRewardNamedWeightsRowName !== 'Theater.Phoenix') {
      continue;
    }

    const theaterMissions = data.missions.find((x) => x.theaterId === theaterId && x.availableMissions?.length);
    if (!theaterMissions) continue;

    const theaterAlerts = data.missionAlerts.find((x) => x.theaterId === theaterId && x.availableMissionAlerts?.length);
    const missions = new Map<string, ParsedWorldMission>();

    for (const mission of theaterMissions.availableMissions) {
      const region = theater.regions.find((r) => {
        if (r.uniqueId === 'mission' || r.uniqueId === 'outpost') return false;
        const raw = r.missionData?.difficultyWeights?.[0]?.difficultyInfo?.rowName;
        if (!raw) return false;
        return r.tileIndices.includes(mission.tileIndex);
      });
      if (!region) continue;

      let zone = region.missionData!.difficultyWeights![0]!.difficultyInfo!.rowName!.replace('Theater_', '').replace('_Group', '');
      if (zone === TheaterStormKingZones[Theaters.CannyValley as keyof typeof TheaterStormKingZones]) zone = 'Hard_Zone5';
      else if (zone === TheaterStormKingZones[Theaters.TwinePeaks as keyof typeof TheaterStormKingZones]) zone = 'Endgame_Zone5';

      const alert = theaterAlerts?.availableMissionAlerts.find((a) => a.tileIndex === mission.tileIndex);
      missions.set(mission.missionGuid, parseMission(theater, mission, zone, alert));
    }

    worldInfo.set(
      theaterId,
      new Map(
        Array.from(missions.entries()).sort(([, a], [, b]) => {
          return (
            b.powerLevel - a.powerLevel ||
            Number(b.generator.includes('group')) - Number(a.generator.includes('group')) ||
            Number(!!b.alert) - Number(!!a.alert)
          );
        })
      )
    );
  }

  return worldInfo;
}

export type { WorldInfoData };
