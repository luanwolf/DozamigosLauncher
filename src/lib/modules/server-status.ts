import { epicService } from '$lib/http';
import type { FortniteBrStatus } from '$lib/modules/fortnite-api';
import type { ServerStatusSummaryData, WaitingRoomData } from '$types/game/server-status';

export type FortniteServiceStatus = 'UP' | 'DOWN' | 'MAJOR_OUTAGE' | 'PARTIAL_OUTAGE' | 'UNDER_MAINTENANCE';

export function statusFromFortniteApi(data: Pick<FortniteBrStatus, 'status' | 'message' | 'allowedActions'>): FortniteServiceStatus {
  if (data.status === 'UP') return 'UP';
  if (data.allowedActions?.includes('PLAY')) return 'PARTIAL_OUTAGE';
  return data.message?.toLowerCase().includes('maintenance') ? 'UNDER_MAINTENANCE' : 'MAJOR_OUTAGE';
}

export function statusFromStatusPage(indicator: string | undefined): FortniteServiceStatus {
  switch (indicator) {
    case 'none':
    case undefined:
      return 'UP';
    case 'maintenance':
      return 'UNDER_MAINTENANCE';
    case 'minor':
      return 'PARTIAL_OUTAGE';
    default:
      return 'MAJOR_OUTAGE';
  }
}

export async function getWaitingRoom(): Promise<WaitingRoomData | null> {
  try {
    const response = await epicService.get<WaitingRoomData>(
      'https://fortnitewaitingroom-public-service-prod.ol.epicgames.com/waitingroom/api/waitingroom'
    );
    if (response.status === 204) return null;
    return response.json();
  } catch {
    return null;
  }
}

export async function getStatusPage(): Promise<ServerStatusSummaryData> {
  // Statuspage sends ACAO *; browser fetch avoids Tauri http:allow for this host.
  const response = await fetch('https://status.epicgames.com/api/v2/summary.json');
  if (!response.ok) throw new Error(`status page ${response.status}`);
  return response.json();
}
