import { composeMCP, queryProfile } from '$lib/modules/mcp';
import type { AccountData } from '$types/account';
import type { CommonCoreProfileAttributes } from '$types/game/mcp';

export const MTX_PLATFORMS = [
  'EpicPC',
  'Epic',
  'EpicPCKorea',
  'PSN',
  'Live',
  'Nintendo',
  'IOSAppStore',
  'EpicAndroid',
  'Samsung',
  'Shared',
  'wegame'
] as const;

export type MtxPlatform = (typeof MTX_PLATFORMS)[number];

export async function fetchMtxPlatform(account: AccountData): Promise<string> {
  const profile = await queryProfile(account, 'common_core');
  return profile.profileChanges[0].profile.stats.attributes.current_mtx_platform ?? 'EpicPC';
}

export async function setMtxPlatform(account: AccountData, platform: MtxPlatform): Promise<void> {
  await composeMCP(account, 'SetMtxPlatform', 'common_core', { newPlatform: platform });
}

export function isMtxPlatform(value: string): value is MtxPlatform {
  return (MTX_PLATFORMS as readonly string[]).includes(value);
}

export type { CommonCoreProfileAttributes };
