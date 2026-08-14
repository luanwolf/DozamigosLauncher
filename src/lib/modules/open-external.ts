import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';

/** Opens http(s) via opener; Epic launcher deep links via OS protocol handler (once). */
export async function openExternalUrl(url: string): Promise<void> {
  if (url.startsWith('com.epicgames.launcher://')) {
    // Prefer native handler only — plugin-opener can throw after already launching,
    // and falling through would open Epic twice and break the purchase sheet.
    try {
      await invoke('open_protocol_url', { url });
      return;
    } catch {
      await openUrl(url);
      return;
    }
  }

  await openUrl(url);
}
