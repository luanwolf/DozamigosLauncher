import missions from '../../../src/lib/data/missions.json';
import { ZoneCategories, type ZoneCategoryId } from '@/stw/constants/world-info';
import type { ParsedWorldMission } from '@/stw/world-info-parser';

const LOCALE = 'pt-br' as const;

type MissionEntry = { names: Record<string, string> };

function m(key: keyof typeof missions): string {
  return (missions as Record<string, MissionEntry>)[key]?.names[LOCALE] ?? key;
}

export const ZoneNamesPt: Record<string, string> = {
  atlas: m('fightTheStorm'),
  'atlas-c2': m('fightCategory2Storm'),
  'atlas-c3': m('fightCategory3Storm'),
  'atlas-c4': m('fightCategory4Storm'),
  dtb: m('deliverTheBomb'),
  dte: m('destroyTheEncampments'),
  eac: m('eliminateAndCollect'),
  ets: m('evacuateTheShelter'),
  htm: m('huntTheTitan'),
  htr: m('hitTheRoad'),
  ptp: m('protectThePresents'),
  radar: m('buildTheRadarGrid'),
  refuel: m('refuelTheHomebase'),
  rescue: m('rescueTheSurvivors'),
  resupply: m('resupply'),
  rocket: m('launchTheRocket'),
  rtd: m('retrieveTheData'),
  rtl: m('rideTheLightning'),
  rts: m('repairTheShelter'),
  stn: m('surviveTheStorm'),
  'storm-shield': m('homebaseStormShield'),
  tts: m('trapTheStorm'),
  'mini-boss': m('fightCategory4Storm'),
  'yarrr-island': m('yarrr!'),
  'walk-plank': m('walkThePlank'),
  'adventure-revenge': m('exploreTheMist'),
  horde: m('challengeTheHorde'),
  onboarding: m('onboardingFort'),
  hestia: m('deliverTheGoods'),
  quest: 'Missão'
};

const GENERATOR_MISSION_KEYS: ReadonlyArray<readonly [string, keyof typeof missions]> = [
  ['MissionGen_Yarrr_Island', 'yarrr!'],
  ['MissionGen_Yarrr_WalkthePlank', 'walkThePlank'],
  ['MissionGen_AdventureRevenge', 'exploreTheMist'],
  ['MissionGen_HordeV3', 'challengeTheHorde'],
  ['MissionGen_Onboarding_Fort', 'onboardingFort'],
  ['MissionGen_HestiaBeauty', 'deliverTheGoods']
];

export function resolveZoneCategoryId(generator: string): ZoneCategoryId | undefined {
  const nonQuest = Object.entries(ZoneCategories).filter(([key]) => key !== 'quest');
  const match = nonQuest.find(([, patterns]) => patterns.some((pattern) => generator.includes(pattern)));
  if (match) return match[0] as ZoneCategoryId;
  if (ZoneCategories.quest.some((pattern) => generator.includes(pattern))) return 'quest';
  return undefined;
}

function nameFromGenerator(generator: string): string | undefined {
  for (const [pattern, missionKey] of GENERATOR_MISSION_KEYS) {
    if (!generator.includes(pattern)) continue;
    return m(missionKey);
  }
  return undefined;
}

function humanizeGenerator(generator: string): string | undefined {
  const match = generator.match(/MissionGen_([A-Za-z0-9_]+)\./);
  if (!match) return undefined;
  return match[1].replace(/_Group.*$/i, '').replace(/_/g, ' ').trim() || undefined;
}

export function getMissionDisplayName(mission: ParsedWorldMission): string {
  const fromGenerator = nameFromGenerator(mission.generator);
  if (fromGenerator) return fromGenerator;

  const categoryId = mission.zone.type.id ?? resolveZoneCategoryId(mission.generator);
  if (categoryId && ZoneNamesPt[categoryId]) return ZoneNamesPt[categoryId];

  return humanizeGenerator(mission.generator) ?? ZoneNamesPt.quest;
}
