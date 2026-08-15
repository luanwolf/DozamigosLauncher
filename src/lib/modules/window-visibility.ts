import { getCurrentWindow } from '@tauri-apps/api/window';

/** Prefer Tauri window visibility; fall back to document when the API is unavailable. */
export async function isAppWindowVisible(): Promise<boolean> {
  try {
    if (typeof document !== 'undefined' && document.hidden) return false;
    return await getCurrentWindow().isVisible();
  } catch {
    return typeof document === 'undefined' ? true : !document.hidden;
  }
}
