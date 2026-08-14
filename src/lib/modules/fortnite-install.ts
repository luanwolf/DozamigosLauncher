import { getManifestByName } from '$lib/modules/manifest';

/**
 * Folder the launcher needs to start Fortnite, resolved from the Epic Games
 * Launcher manifest. Returns null when Fortnite isn't installed (or when the
 * manifest can't be read, e.g. outside Windows).
 */
export async function detectFortnitePath(): Promise<string | null> {
  const manifest = await getManifestByName('fortnite');
  if (!manifest?.installLocation) return null;

  return `${manifest.installLocation.replaceAll('\\', '/')}/FortniteGame/Binaries/Win64`;
}
