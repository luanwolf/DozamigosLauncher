import { EpicAPIError } from '$lib/exceptions/EpicAPIError';
import { accountPublicServiceProd03, publicAccountService, userSearchService } from '$lib/http';
import { getAuthedKy } from '$lib/modules/auth-session';
import { displayNameCache } from '$lib/stores';
import { processChunks } from '$lib/utils';
import type { AccountData } from '$types/account';
import type {
  EpicAccountById,
  EpicAccountByName,
  EpicAccountSearch,
  EpicExternalAuth
} from '$types/game/lookup';

const accountPublicServices = [accountPublicServiceProd03, publicAccountService];

function externalAuthsListToRecord(auths: EpicExternalAuth[]): EpicAccountById['externalAuths'] {
  const record: EpicAccountById['externalAuths'] = {};

  for (const auth of auths) {
    record[auth.type] = {
      accountId: auth.accountId,
      type: auth.type,
      externalAuthId: auth.externalAuthId,
      externalAuthIdType: auth.externalAuthIdType ?? '',
      externalDisplayName: auth.externalDisplayName,
      authIds: auth.authIds ?? []
    };
  }

  return record;
}

export function mergeExternalAuths(
  embedded: EpicAccountById['externalAuths'] | undefined,
  list: EpicExternalAuth[]
): EpicAccountById['externalAuths'] {
  const fromList = externalAuthsListToRecord(list);
  if (Object.keys(fromList).length) return fromList;
  return embedded ?? {};
}

export async function fetchUserById(account: AccountData, accountId: string): Promise<EpicAccountById> {
  const data = await getAuthedKy(account, publicAccountService).get<EpicAccountById>(accountId).json();
  displayNameCache.set(data.id, data.displayName);
  return data;
}

export async function fetchOwnAccountById(account: AccountData): Promise<EpicAccountById> {
  for (const service of accountPublicServices) {
    try {
      const data = await getAuthedKy(account, service).get<EpicAccountById>(account.accountId).json();
      displayNameCache.set(data.id, data.displayName);
      return data;
    } catch {
      continue;
    }
  }

  return fetchUserById(account, account.accountId);
}

export async function fetchExternalAuths(
  account: AccountData,
  accountId: string
): Promise<EpicExternalAuth[]> {
  for (const service of accountPublicServices) {
    try {
      return await getAuthedKy(account, service).get<EpicExternalAuth[]>(`${accountId}/externalAuths`).json();
    } catch {
      continue;
    }
  }

  return [];
}

export async function fetchAccountProfile(account: AccountData, accountId: string): Promise<EpicAccountById> {
  const isOwnAccount = accountId === account.accountId;

  const [accountInfo, externalAuths] = await Promise.all([
    isOwnAccount ? fetchOwnAccountById(account) : fetchUserById(account, accountId),
    fetchExternalAuths(account, accountId).catch(() => [] as EpicExternalAuth[])
  ]);

  return {
    ...accountInfo,
    externalAuths: mergeExternalAuths(accountInfo.externalAuths, externalAuths)
  };
}

export async function fetchUsersByIds(account: AccountData, accountIds: string[]): Promise<EpicAccountById[]> {
  const MAX_IDS_PER_REQUEST = 100;
  const session = getAuthedKy(account, publicAccountService);

  const accounts = await processChunks(accountIds, MAX_IDS_PER_REQUEST, async (ids) => {
    return session.get<EpicAccountById[]>(`?${ids.map((x) => `accountId=${x}`).join('&')}`).json();
  });

  for (const account of accounts) {
    const name = account.displayName || Object.values(account.externalAuths).map((x) => x.externalDisplayName)?.[0];
    if (!name) continue;

    displayNameCache.set(account.id, name);
  }

  return accounts;
}

export async function fetchUserByName(account: AccountData, displayName: string): Promise<EpicAccountByName> {
  const data = await getAuthedKy(account, publicAccountService)
    .get<EpicAccountByName>(`displayName/${displayName.trim()}`)
    .json();

  displayNameCache.set(data.id, data.displayName);
  return data;
}

export async function searchUsersByName(account: AccountData, namePrefix: string): Promise<EpicAccountSearch[]> {
  const data = await getAuthedKy(account, userSearchService)
    .get<EpicAccountSearch[]>(`${account.accountId}?prefix=${namePrefix.trim()}&platform=epic`)
    .json();

  for (const account of data) {
    const name = account.matches[0]?.value;
    if (!name) continue;

    displayNameCache.set(account.accountId, name);
  }

  return data;
}

export async function fetchUserByNameOrId(
  account: AccountData,
  nameOrId: string
): Promise<{ accountId: string; displayName: string }> {
  const isAccountId = nameOrId.length === 32;
  if (isAccountId) {
    const data = await fetchUserById(account, nameOrId);
    return {
      accountId: data.id,
      displayName: data.displayName
    };
  } else {
    const data = (await searchUsersByName(account, nameOrId))?.[0];
    if (!data) {
      throw new EpicAPIError({
        errorCode: 'errors.com.epicgames.account.account_not_found',
        errorMessage: `Sorry, we couldn't find an account for ${nameOrId}`,
        messageVars: [nameOrId],
        numericErrorCode: 18007
      });
    }

    return {
      accountId: data.accountId,
      displayName: data.matches[0].value
    };
  }
}
