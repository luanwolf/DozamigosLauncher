import type { WorldInfoData } from '$types/game/stw/world-info';

export function isWorldInfoPayload(value: unknown): value is WorldInfoData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return Array.isArray(data.theaters) || Array.isArray(data.missions) || Array.isArray(data.missionAlerts);
}
