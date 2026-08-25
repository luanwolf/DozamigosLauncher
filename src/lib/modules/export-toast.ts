import { openPath } from '@tauri-apps/plugin-opener';
import { dismissAchievement, pushAchievement } from '$lib/stores/achievement-toasts';

const TOAST_ID = 'export-webp';

function percentFromLabel(message: string) {
  const match = message.match(/(\d+)\s*%/);
  return match ? Number(match[1]) : 0;
}

/** Non-blocking card in the existing popup stack; finish with Abrir imagem. */
export function beginExportToast() {
  return {
    progress(message: string) {
      pushAchievement({
        id: TOAST_ID,
        title: message,
        progress: percentFromLabel(message),
        sticky: true
      });
    },
    done(message: string, path: string, openLabel: string) {
      pushAchievement({
        id: TOAST_ID,
        title: message,
        progress: 100,
        actions: [
          {
            id: 'open',
            label: openLabel,
            primary: true,
            onClick: () => {
              void openPath(path);
              dismissAchievement(TOAST_ID);
            }
          }
        ]
      });
    },
    fail() {
      dismissAchievement(TOAST_ID);
    }
  };
}
