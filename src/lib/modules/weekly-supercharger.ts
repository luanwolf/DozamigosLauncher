import {
  getCurrentWeeklySuperchargerType,
  WeeklySuperchargerTypes,
  type WeeklySuperchargerType
} from '$lib/constants/stw/weekly-supercharger';
import type { FullQueryProfile } from '$types/game/mcp';

const PROMOTION_PATTERN = /reagent_promotion_(heroes|survivors|traps|weapons)/;

function typeFromMatch(match: RegExpMatchArray | null): WeeklySuperchargerType | null {
  if (!match?.[1]) return null;

  const type = `reagent_promotion_${match[1]}` as WeeklySuperchargerType;
  return WeeklySuperchargerTypes.includes(type) ? type : null;
}

/** Reads the active weekly supercharger quest reward from the campaign profile when available. */
export function getWeeklySuperchargerFromProfile(
  profile: FullQueryProfile<'campaign'>
): WeeklySuperchargerType | null {
  const items = profile.profileChanges[0]?.profile?.items;
  if (!items) return null;

  for (const item of Object.values(items)) {
    if (!item.templateId.startsWith('Quest:')) continue;

    const serialized = JSON.stringify(item.attributes ?? {});
    if (!serialized.includes('reagent_promotion')) continue;

    const isWeeklyMissionAlert =
      serialized.toLowerCase().includes('missionalert') ||
      serialized.toLowerCase().includes('mission_alert') ||
      item.templateId.toLowerCase().includes('missionalert');

    if (!isWeeklyMissionAlert && item.attributes?.quest_state !== 'Active') continue;

    const type = typeFromMatch(serialized.match(PROMOTION_PATTERN));
    if (type) return type;
  }

  for (const item of Object.values(items)) {
    if (!item.templateId.startsWith('Quest:')) continue;

    const type = typeFromMatch(JSON.stringify(item.attributes ?? {}).match(PROMOTION_PATTERN));
    if (type) return type;
  }

  return null;
}

export function resolveWeeklySuperchargerType(
  profile: FullQueryProfile<'campaign'> | null | undefined
): WeeklySuperchargerType {
  if (profile) {
    const fromProfile = getWeeklySuperchargerFromProfile(profile);
    if (fromProfile) return fromProfile;
  }

  return getCurrentWeeklySuperchargerType();
}
