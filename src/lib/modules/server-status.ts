import { epicService, lightswitchService } from '$lib/http';
import { getAccessTokenUsingClientCredentials } from '$lib/modules/authentication';
import type { LightswitchData, ServerStatusSummaryData, WaitingRoomData } from '$types/game/server-status';

export async function getLightswitch(): Promise<LightswitchData> {
  const token = (await getAccessTokenUsingClientCredentials()).access_token;
  return lightswitchService
    .get<LightswitchData>('Fortnite/status', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .json();
}

export async function getWaitingRoom(): Promise<WaitingRoomData | null> {
  const response = await epicService.get<WaitingRoomData>(
    'https://fortnitewaitingroom-public-service-prod.ol.epicgames.com/waitingroom/api/waitingroom'
  );

  if (response.status === 204) return null;
  return response.json();
}

export function getStatusPage(): Promise<ServerStatusSummaryData> {
  return epicService.get<ServerStatusSummaryData>('https://status.epicgames.com/api/v2/summary.json').json();
}
