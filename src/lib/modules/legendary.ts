import { get, writable } from 'svelte/store';
import { dev } from '$app/environment';
import { path } from '@tauri-apps/api';
import { exists, readTextFile, remove } from '@tauri-apps/plugin-fs';
import { LegendaryError } from '$lib/exceptions/LegendaryError';
import { legendaryService } from '$lib/http';
import { getChildLogger } from '$lib/logger';
import { getCachedToken } from '$lib/modules/auth-session';
import { getExchangeCodeUsingAccessToken } from '$lib/modules/authentication';
import { dataDirectory } from '$lib/storage/file-store';
import { ownedAppsCache } from '$lib/stores';
import { runLegendary, launchApp as tauriLaunchApp } from '$lib/tauri';
import type { AccountData } from '$types/account';
import type { EpicOAuthData } from '$types/game/authorizations';
import type {
  LegendaryAppInfo,
  LegendaryInstalledList,
  LegendaryLaunchData,
  LegendaryList,
  LegendarySDLResponse,
  LegendaryStatus
} from '$types/legendary';

const logger = getChildLogger('Legendary');
export const configPath = await path.join(dataDirectory, dev ? 'legendary-dev' : 'legendary');
let legendaryAccountId: string | undefined;

type ExecuteResult<T = any> = {
  code: number | null;
  signal: number | null;
  stdout: T;
  stderr: string;
};

async function executeLegendary<T>(args: string[]): Promise<ExecuteResult<T>> {
  try {
    const result = await runLegendary({ configPath, args });

    logger.debug('Command executed', {
      args,
      code: result.code,
      signal: result.signal,
      stderr: result.stderr?.slice(-512)
    });

    let stdout = result.stdout as T;
    if (args.includes('--json')) {
      stdout = JSON.parse(result.stdout) as T;
    }

    if (result.code !== 0) {
      throw new Error(result.stderr);
    }

    return {
      code: result.code,
      signal: result.signal,
      stdout,
      stderr: result.stderr
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new LegendaryError(message);
  }
}

export async function loginLegendary(account: AccountData): Promise<void> {
  const accessToken = await getCachedToken(account);
  const { code: exchange } = await getExchangeCodeUsingAccessToken(accessToken);

  await executeLegendary(['auth', '--token', exchange]);
  legendaryAccountId = account.accountId;
}

export async function logoutLegendary(): Promise<void> {
  await executeLegendary(['auth', '--delete']).catch(() => {});
  await clearCatalogCache();
  legendaryAccountId = undefined;
  libraryLoadedId = null;
  libraryStatus.set({ accountId: null, loading: false, loaded: false, error: null });
  ownedAppsCache.set([]);
}

/**
 * Removes legendary's cached catalog/metadata so stale games from a previous
 * account don't show up after switching accounts.
 */
export async function clearCatalogCache(): Promise<void> {
  const targets = ['assets.json', 'user.json', 'metadata', 'tmp'];

  await Promise.all(
    targets.map(async (name) => {
      const target = await path.join(configPath, name);
      try {
        if (await exists(target)) {
          await remove(target, { recursive: true });
        }
      } catch (error) {
        logger.warn('Failed to remove legendary cache entry', { target, error });
      }
    })
  );
}

export function getOwnedApps(forceRefresh = false): Promise<ExecuteResult<LegendaryList>> {
  const args: string[] = ['list', '--json'];
  if (forceRefresh) args.push('--force-refresh');
  return executeLegendary<LegendaryList>(args);
}

export async function getLegendaryStatus(): Promise<LegendaryStatus> {
  const { stdout } = await executeLegendary<LegendaryStatus>(['status', '--json']);
  if (stdout.account === '<not logged in>') {
    stdout.account = null;
  }

  return stdout;
}

export async function getLegendaryAccount(): Promise<string | null> {
  if (legendaryAccountId) {
    return legendaryAccountId;
  }

  try {
    const userConfig = await path.join(configPath, 'user.json');
    const file = await readTextFile(userConfig);
    const data: EpicOAuthData = JSON.parse(file);
    if (!data.account_id) return null;

    legendaryAccountId = data.account_id;
    return data.account_id;
  } catch {
    return null;
  }
}

export function getAppInfo(appId: string): Promise<ExecuteResult<LegendaryAppInfo>> {
  return executeLegendary<LegendaryAppInfo>(['info', appId, '--json']);
}

export function getInstalledApps(): Promise<ExecuteResult<LegendaryInstalledList>> {
  return executeLegendary<LegendaryInstalledList>(['list-installed', '--json']);
}

export async function syncWithEGL(): Promise<void> {
  await executeLegendary(['egl-sync', '-y', '--enable-sync']);
}

export async function launchApp(appId: string): Promise<number> {
  const { stdout: launchData } = await executeLegendary<LegendaryLaunchData>(['launch', appId, '--dry-run', '--json']);

  return tauriLaunchApp({
    launchData: {
      ...launchData,
      game_id: appId
    }
  });
}

export async function verifyApp(appId: string): Promise<{ requiresRepair: boolean }> {
  const { stderr } = await executeLegendary<string>(['verify', appId, '-y', '--skip-sdl']);
  const requiresRepair = stderr.includes('repair your game installation');
  const requiredRepair = get(ownedAppsCache).find((app) => app.id === appId)?.requiresRepair || false;

  if (requiresRepair !== requiredRepair) {
    ownedAppsCache.update((current) => {
      return current.map((app) => (app.id === appId ? { ...app, requiresRepair } : app));
    });
  }

  return { requiresRepair };
}

export async function uninstallLegendaryApp(appId: string): Promise<void> {
  await executeLegendary(['uninstall', appId, '-y']);

  ownedAppsCache.update((current) => {
    return current.map((app) => (app.id === appId ? { ...app, installed: false } : app));
  });
}

export async function cacheApps(forceRefresh = false): Promise<void> {
  const list = await getOwnedApps(forceRefresh);
  await syncWithEGL();
  const installedList = await getInstalledApps();

  ownedAppsCache.set(
    list.stdout
      .filter((app) => app.metadata.entitlementType === 'EXECUTABLE')
      .map((app) => {
        const images = app.metadata.keyImages.reduce<Record<string, string>>((acc, image) => {
          acc[image.type] = image.url;
          return acc;
        }, {});

        const installed = installedList.stdout.find((installed) => installed.app_name === app.app_name);

        return {
          id: app.app_name,
          title: app.app_title,
          images: {
            tall: images.DieselGameBoxTall || app.metadata.keyImages[0]?.url,
            wide: images.DieselGameBox || images.Featured || app.metadata.keyImages[0]?.url
          },
          requiresRepair: installed && installed.needs_verification,
          hasUpdate: installed ? installed.version !== app.asset_infos.Windows.build_version : false,
          installSize: installed?.install_size || 0,
          installed: !!installed,
          canRunOffline: installed?.can_run_offline || false
        };
      })
  );
}

export type LibraryStatus = {
  accountId: string | null;
  loading: boolean;
  loaded: boolean;
  error: unknown;
};

export const libraryStatus = writable<LibraryStatus>({
  accountId: null,
  loading: false,
  loaded: false,
  error: null
});

let libraryLoadedId: string | null = null;
let libraryInflight: { accountId: string; promise: Promise<void> } | null = null;

async function loadLibrary(account: AccountData, force: boolean): Promise<void> {
  libraryStatus.set({ accountId: account.accountId, loading: true, loaded: false, error: null });

  try {
    const loggedInId = await getLegendaryAccount();
    const needsLogin = force || !loggedInId || loggedInId !== account.accountId;

    if (needsLogin) {
      // Clear the previous account's cached catalog before logging in
      await logoutLegendary();
      await loginLegendary(account);
    }

    await cacheApps(needsLogin);
    libraryLoadedId = account.accountId;
    libraryStatus.set({ accountId: account.accountId, loading: false, loaded: true, error: null });
  } catch (error) {
    libraryLoadedId = null;
    libraryStatus.set({ accountId: account.accountId, loading: false, loaded: false, error });
    throw error;
  }
}

/**
 * Signs Legendary into `account` (only when it isn't already) and fills
 * `ownedAppsCache`. Repeat calls for the account already loaded are a no-op, so
 * the library page can call it on every visit without re-running the login.
 */
export function ensureLibrary(account: AccountData, { force = false } = {}): Promise<void> {
  if (!force) {
    if (libraryInflight?.accountId === account.accountId) return libraryInflight.promise;
    if (libraryLoadedId === account.accountId) return Promise.resolve();
  }

  const promise = loadLibrary(account, force).finally(() => {
    if (libraryInflight?.promise === promise) libraryInflight = null;
  });

  libraryInflight = { accountId: account.accountId, promise };
  return promise;
}

export async function getSDL(appName: string): Promise<LegendarySDLResponse> {
  const response = await legendaryService.get(`v1/sdl/${appName}.json`);
  if (!response.headers.get('Content-Type')?.includes('application/json')) {
    throw new LegendaryError('App not found');
  }

  return await response.json<LegendarySDLResponse>();
}
