import { ZoneCategories } from '$lib/constants/stw/world-info';
import { missions } from '$lib/data';
import type { Locale } from '$lib/paraglide/runtime';
import type { ParsedWorldMission } from '$types/game/stw/world-info';

type ZoneCategoryId = keyof typeof ZoneCategories;

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

function nameFromGenerator(generator: string, language: Locale): string | undefined {
  for (const [pattern, missionKey] of GENERATOR_MISSION_KEYS) {
    if (!generator.includes(pattern)) continue;

    const name = missions[missionKey]?.names[language];
    if (name) return name;
  }

  return undefined;
}

function humanizeGenerator(generator: string): string | undefined {
  const match = generator.match(/MissionGen_([A-Za-z0-9_]+)\./);
  if (!match) return undefined;

  const label = match[1]
    .replace(/_Group.*$/i, '')
    .replace(/_PVE\d+on$/i, '')
    .replace(/^T\d+_[A-Z0-9]+_/i, '')
    .replace(/_/g, ' ')
    .trim();

  return label || undefined;
}

export function getMissionDisplayName(
  mission: ParsedWorldMission,
  language: Locale,
  zoneNames: Record<string, string>,
  questLabel: string,
  unknownLabel: string
): string {
  const fromGenerator = nameFromGenerator(mission.generator, language);
  if (fromGenerator) return fromGenerator;

  const categoryId = mission.zone.type.id ?? resolveZoneCategoryId(mission.generator);
  if (categoryId && zoneNames[categoryId]) return zoneNames[categoryId];

  const humanized = humanizeGenerator(mission.generator);
  if (humanized) return humanized;

  if (categoryId === 'quest') return questLabel;

  return unknownLabel;
}
