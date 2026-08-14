import { baseGameService } from '@/core/http';
import { getAccessTokenUsingClientCredentials } from '@/core/authentication';
import { parseWorldInfo, type ParsedWorldInfo, type WorldInfoData } from '@/stw/world-info-parser';

export type { ParsedWorldMission, ParsedWorldInfo } from '@/stw/world-info-parser';

export async function getWorldInfo(): Promise<WorldInfoData> {
  const token = (await getAccessTokenUsingClientCredentials()).access_token;
  return baseGameService
    .get<WorldInfoData>('world/info', { headers: { Authorization: `Bearer ${token}` } })
    .json();
}

export async function fetchParsedWorldInfo(): Promise<ParsedWorldInfo> {
  return parseWorldInfo(await getWorldInfo());
}
