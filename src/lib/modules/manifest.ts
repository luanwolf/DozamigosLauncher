import * as path from '@tauri-apps/api/path';
import { readDir, readTextFile } from '@tauri-apps/plugin-fs';
import { platform } from '@tauri-apps/plugin-os';
import { logger } from '$lib/logger';

export type EpicManifestRaw = {
  DisplayName: string;
  AppVersionString: string;
  CatalogNamespace: string;
  LaunchCommand: string;
  InstallLocation: string;
  LaunchExecutable: string;
  ExecutableLocation: string;
};

export type EpicManifest = {
  displayName: string;
  appVersionString: string;
  namespace: string;
  launchCommand: string;
  installLocation: string;
  launchExecutable: string;
  executableLocation: string;
};

const manifestsDir = 'C:/ProgramData/Epic/EpicGamesLauncher/Data/Manifests';
let fortniteManifestCache: EpicManifest | null = null;

export async function getFortniteManifest(): Promise<EpicManifest | null> {
  if (fortniteManifestCache) return fortniteManifestCache;

  fortniteManifestCache = await getManifestByName('fortnite');
  return fortniteManifestCache;
}

export async function getManifestByName(name: string): Promise<EpicManifest | null> {
  if (platform() !== 'windows') return null;

  const entries = await readDir(manifestsDir);
  for (const entry of entries) {
    if (!entry.name.endsWith('.item')) continue;

    try {
      const raw = JSON.parse(await readTextFile(await path.join(manifestsDir, entry.name))) as EpicManifestRaw;
      if (raw.DisplayName.toLowerCase() !== name.toLowerCase()) continue;

      return {
        displayName: raw.DisplayName,
        appVersionString: raw.AppVersionString?.trim() ?? '',
        namespace: raw.CatalogNamespace,
        launchCommand: raw.LaunchCommand?.trim() ?? '',
        installLocation: raw.InstallLocation,
        launchExecutable: raw.LaunchExecutable,
        executableLocation: raw.LaunchExecutable
      };
    } catch (error) {
      logger.warn('Failed to read manifest file', { entry: entry.name, error });
    }
  }

  return null;
}
