import { resources } from '$lib/data';
import { m } from '$lib/paraglide/messages';

type MessageKey = keyof typeof m;

export const WeeklySuperchargerTypes = [
  'reagent_promotion_heroes',
  'reagent_promotion_survivors',
  'reagent_promotion_traps',
  'reagent_promotion_weapons'
] as const;

export type WeeklySuperchargerType = (typeof WeeklySuperchargerTypes)[number];

/** Wednesday 8:00 PM America/New_York — weekly supercharger quest reset. */
const RESET_HOUR_ET = 20;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type EasternParts = {
  weekday: string;
  hour: number;
  minute: number;
};

function getEasternParts(date: Date): EasternParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }

  return {
    weekday: map.weekday,
    hour: Number(map.hour),
    minute: Number(map.minute)
  };
}

/** Milliseconds since Unix epoch for the most recent weekly supercharger reset. */
export function getLastWeeklySuperchargerResetMs(now = Date.now()): number {
  for (let hoursAgo = 0; hoursAgo < 24 * 10; hoursAgo++) {
    const probe = now - hoursAgo * 3600000;
    const atHour = probe - (getEasternParts(new Date(probe)).minute * 60_000);
    const parts = getEasternParts(new Date(atHour));

    if (parts.weekday === 'Wed' && parts.hour === RESET_HOUR_ET && parts.minute === 0) {
      return atHour;
    }
  }

  return now - WEEK_MS;
}

export function getWeeklySuperchargerWeekIndex(now = Date.now()): number {
  const resetMs = getLastWeeklySuperchargerResetMs(now);
  return Math.floor((now - resetMs) / WEEK_MS);
}

export function getCurrentWeeklySuperchargerType(now = Date.now()): WeeklySuperchargerType {
  const index = getWeeklySuperchargerWeekIndex(now) % WeeklySuperchargerTypes.length;
  return WeeklySuperchargerTypes[index]!;
}

const SUPERCHARGER_I18N_KEYS: Record<WeeklySuperchargerType, MessageKey> = {
  reagent_promotion_heroes: 'stwMissionAlerts.overview.superchargerHero',
  reagent_promotion_survivors: 'stwMissionAlerts.overview.superchargerSurvivor',
  reagent_promotion_traps: 'stwMissionAlerts.overview.superchargerTrap',
  reagent_promotion_weapons: 'stwMissionAlerts.overview.superchargerWeapon'
};

export type WeeklySuperchargerInfo = {
  type: WeeklySuperchargerType;
  icon: string;
  /** Localized short label for the current week's supercharger. */
  label: string;
  /** English resource name from data (fallback). */
  resourceName: string;
};

export function getWeeklySuperchargerInfo(
  type: WeeklySuperchargerType,
  translate: (key: MessageKey) => string
): WeeklySuperchargerInfo {
  const dataKey = type as keyof typeof resources;

  return {
    type,
    icon: `/resources/${dataKey}.png`,
    label: translate(SUPERCHARGER_I18N_KEYS[type]),
    resourceName: resources[dataKey]?.name ?? type
  };
}
