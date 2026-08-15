import * as path from '@tauri-apps/api/path';
import { mkdir, writeTextFile } from '@tauri-apps/plugin-fs';
import { matchmakingService } from '$lib/http';
import { getAuthedKy } from '$lib/modules/auth-session';
import { fetchUserByNameOrId } from '$lib/modules/lookup';
import { getDataDirectory } from '$lib/storage/file-store';
import type { AccountData } from '$types/account';

export type MatchmakingSession = Record<string, unknown>;

export async function findPlayerSession(account: AccountData, targetAccountId: string) {
  const sessions = await getAuthedKy(account, matchmakingService)
    .get<MatchmakingSession[]>(`session/findPlayer/${targetAccountId}`)
    .json();
  return Array.isArray(sessions) ? sessions : [];
}

export async function trackPlayer(account: AccountData, nameOrId: string) {
  const user = await fetchUserByNameOrId(account, nameOrId);
  const sessions = await findPlayerSession(account, user.accountId);
  return { user, sessions };
}

export async function saveMatchmakingFile(sessions: MatchmakingSession[], filename = 'matchmaking.json') {
  const dir = await path.join(await getDataDirectory(), 'matchmaking');
  await mkdir(dir, { recursive: true });
  const filePath = await path.join(dir, filename);
  await writeTextFile(filePath, JSON.stringify(sessions, null, 2));
  return filePath;
}

export function stwNewsProfileUrl(accountId: string) {
  return `https://stw.news/${accountId}`;
}
