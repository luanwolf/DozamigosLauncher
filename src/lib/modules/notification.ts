import { invoke } from '@tauri-apps/api/core';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { platform } from '@tauri-apps/plugin-os';

export const NOTIFICATION_APP_TITLE = 'Dozamigos Launcher';

export async function requestNotificationPermission(): Promise<boolean> {
  if (await isPermissionGranted()) return true;

  const permission = await requestPermission();
  return permission === 'granted';
}

export async function sendNotificationMessage(
  message: string,
  title = NOTIFICATION_APP_TITLE
): Promise<boolean> {
  const permissionGranted = await requestNotificationPermission();
  if (!permissionGranted) return false;

  try {
    if (platform() === 'windows') {
      await invoke('send_native_notification', { title, body: message });
      return true;
    }

    await sendNotification({ title, body: message });
    return true;
  } catch {
    return false;
  }
}
