import { epicService, lightswitchService } from '@/core/http';
import { getAccessTokenUsingClientCredentials } from '@/core/authentication';

export type LightswitchData = {
  serviceInstanceId: string;
  status: string;
  message: string;
  maintenanceUri?: string;
  overrideCatalogIds?: string[];
  allowedActions?: string[];
  banned?: boolean;
};

export type ServerStatusSummary = {
  page: { name: string; url: string; updated_at: string };
  components: { id: string; name: string; status: string }[];
  incidents: { name: string; status: string; impact: string }[];
};

export async function getLightswitch(): Promise<LightswitchData> {
  const token = (await getAccessTokenUsingClientCredentials()).access_token;
  return lightswitchService
    .get<LightswitchData>('Fortnite/status', { headers: { Authorization: `Bearer ${token}` } })
    .json();
}

export async function getStatusPage(): Promise<ServerStatusSummary> {
  return epicService.get<ServerStatusSummary>('https://status.epicgames.com/api/v2/summary.json').json();
}

export async function getWaitingRoom(): Promise<{ totalPlayers: number; maxLobbySize: number } | null> {
  const response = await epicService.get(
    'https://fortnitewaitingroom-public-service-prod.ol.epicgames.com/waitingroom/api/waitingroom'
  );
  if (response.status === 204) return null;
  return response.json();
}
