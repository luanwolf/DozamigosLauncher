import * as path from '@tauri-apps/api/path';
import { mkdir, readDir, readTextFile, remove, rename, writeTextFile } from '@tauri-apps/plugin-fs';
import { getWorldInfo } from '$lib/modules/world-info';
import { isWorldInfoPayload } from '$lib/modules/world-info-validate';
import { getDataDirectory } from '$lib/storage/file-store';
import type { WorldInfoData } from '$types/game/stw/world-info';

export type WorldInfoSnapshot = {
  name: string;
  path: string;
};

export { isWorldInfoPayload };

async function vaultDir() {
  const dir = await path.join(await getDataDirectory(), 'world-info');
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function listWorldInfoSnapshots(): Promise<WorldInfoSnapshot[]> {
  const dir = await vaultDir();
  const entries = await readDir(dir);
  const snapshots: WorldInfoSnapshot[] = [];
  for (const entry of entries) {
    if (!entry.isFile || !entry.name?.endsWith('.json')) continue;
    snapshots.push({
      name: entry.name,
      path: await path.join(dir, entry.name)
    });
  }
  return snapshots.sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveCurrentWorldInfo(name?: string) {
  const data = await getWorldInfo();
  return saveWorldInfoSnapshot(data, name);
}

export async function saveWorldInfoSnapshot(data: WorldInfoData, name?: string) {
  if (!isWorldInfoPayload(data)) throw new Error('INVALID_WORLD_INFO');
  const dir = await vaultDir();
  const safe = (name?.trim() || `world-info-${new Date().toISOString().replace(/[:.]/g, '-')}`).replace(
    /[^\w.-]+/g,
    '_'
  );
  const filename = safe.endsWith('.json') ? safe : `${safe}.json`;
  const filePath = await path.join(dir, filename);
  await writeTextFile(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

export async function importWorldInfoJson(raw: string, name?: string) {
  const parsed = JSON.parse(raw) as unknown;
  if (!isWorldInfoPayload(parsed)) throw new Error('INVALID_WORLD_INFO');
  return saveWorldInfoSnapshot(parsed, name);
}

export async function readWorldInfoSnapshot(filePath: string) {
  return JSON.parse(await readTextFile(filePath)) as WorldInfoData;
}

export async function deleteWorldInfoSnapshot(filePath: string) {
  await remove(filePath);
}

export async function renameWorldInfoSnapshot(filePath: string, nextName: string) {
  const dir = await vaultDir();
  const safe = nextName.trim().replace(/[^\w.-]+/g, '_');
  const filename = safe.endsWith('.json') ? safe : `${safe}.json`;
  const target = await path.join(dir, filename);
  await rename(filePath, target);
  return target;
}
