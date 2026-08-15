import { platform as tauriPlatform } from '@tauri-apps/plugin-os';

/** Safe sync platform probe — never throws if the Tauri OS bridge is not ready. */
export function safePlatform(): string {
  try {
    return tauriPlatform();
  } catch {
    return 'unknown';
  }
}

export function isWindowsPlatform() {
  return safePlatform() === 'windows';
}
