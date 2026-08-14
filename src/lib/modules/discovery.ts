import { openUrl } from '@tauri-apps/plugin-opener';
import { fortniteIslandUrl, normalizeIslandCode } from '$lib/modules/island-code';

export async function openIslandInBrowser(rawCode: string) {
  const code = normalizeIslandCode(rawCode);
  if (!code) throw new Error('invalid_island_code');
  await openUrl(fortniteIslandUrl(code));
  return code;
}

export { normalizeIslandCode, fortniteIslandUrl };
