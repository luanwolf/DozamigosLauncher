import { join } from 'node:path';

/** Pasta static/ do launcher (ícones STW, recursos, heróis, etc.) */
export const STATIC_ROOT = join(import.meta.dir, '../../../static');

/** JSON de dados STW do launcher */
export const LAUNCHER_DATA = join(import.meta.dir, '../../../src/lib/data');

export function staticAsset(relativePath: string): string {
  return join(STATIC_ROOT, relativePath.replace(/^\//, ''));
}

export const ASSETS = {
  vbucks: staticAsset('resources/currency_mtxswap.png'),
  gold: staticAsset('resources/eventcurrency_scaling.png'),
  brXp: staticAsset('misc/battle-royale-xp.png')
} as const;
