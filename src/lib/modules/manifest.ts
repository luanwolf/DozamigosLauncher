import { invoke } from '@tauri-apps/api/core';
import { platform } from '@tauri-apps/plugin-os';

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

export async function getFortniteManifest(): Promise<EpicManifest | null> {
  if (platform() !== 'windows') return null;
  const raw = await invoke<EpicManifestRaw | null>('get_fortnite_manifest');
  if (!raw) return null;
  return {
    displayName: raw.DisplayName,
    appVersionString: raw.AppVersionString?.trim() ?? '',
    namespace: raw.CatalogNamespace,
    launchCommand: raw.LaunchCommand?.trim() ?? '',
    installLocation: raw.InstallLocation,
    launchExecutable: raw.LaunchExecutable,
    executableLocation: raw.LaunchExecutable
  };
}
