import defaultPartyMemberMeta from '$lib/data/default-party-member-meta.json';
import defaultPartyMeta from '$lib/data/default-party-meta.json';
import { EpicAPIError } from '$lib/exceptions/EpicAPIError';
import { partyService } from '$lib/http';
import { getAuthedKy } from '$lib/modules/auth-session';
import { avatarCache, displayNameCache, partyCache } from '$lib/stores';
import type { AccountData } from '$types/account';
import type { FetchPartyResponse, InviterPartyResponse } from '$types/game/party';

export async function getParty(account: AccountData): Promise<FetchPartyResponse> {
  const data = await getAuthedKy(account, partyService).get<FetchPartyResponse>(`user/${account.accountId}`).json();

  const partyData = data.current[0];
  if (partyData) {
    partyCache.set(account.accountId, partyData);

    for (const member of partyData.members) {
      const name = member.meta['urn:epic:member:dn_s'] || member.connections?.[0]?.meta?.['account_pl_dn'];
      if (name) {
        displayNameCache.set(member.account_id, name);
      }

      const loadoutJ = member.meta['Default:AthenaCosmeticLoadout_j'];
      if (loadoutJ) {
        const loadout = JSON.parse(loadoutJ).AthenaCosmeticLoadout;
        const equippedCharacterId = loadout?.characterPrimaryAssetId?.split(':')[1];
        if (equippedCharacterId) {
          avatarCache.set(
            member.account_id,
            `https://fortnite-api.com/images/cosmetics/br/${equippedCharacterId}/smallicon.png`
          );
        }
      }
    }
  }

  return data;
}

export async function kickMember(account: AccountData, partyId: string, memberId: string): Promise<void> {
  await getAuthedKy(account, partyService).delete(`parties/${partyId}/members/${memberId}`);
}

export async function leaveParty(account: AccountData, partyId: string): Promise<void> {
  await kickMember(account, partyId, account.accountId);
}

export async function promote(account: AccountData, partyId: string, accountToPromote: string): Promise<void> {
  await getAuthedKy(account, partyService).post(`parties/${partyId}/members/${accountToPromote}/promote`);
}

export async function patchParty(
  account: AccountData,
  partyId: string,
  revision: number,
  update: Record<string, string>
): Promise<void> {
  const body = {
    revision,
    meta: {
      deleted: [],
      update: { ...defaultPartyMeta, ...update }
    }
  };

  await patchWithRetry(account, `parties/${partyId}`, body);
}

export async function patchSelf(
  account: AccountData,
  partyId: string,
  revision: number,
  update: Record<string, string>
): Promise<void> {
  const body = {
    revision,
    deleted: [],
    update: { ...defaultPartyMemberMeta, ...update }
  };

  await patchWithRetry(account, `parties/${partyId}/members/${account.accountId}/meta`, body);
}

async function patchWithRetry(account: AccountData, url: string, body: Record<string, any>): Promise<void> {
  try {
    await getAuthedKy(account, partyService).patch(url, { json: body });
  } catch (error) {
    if (error instanceof EpicAPIError && error.errorCode === 'errors.com.epicgames.social.party.stale_revision') {
      const newRevision = Number.parseInt(error.messageVars[1]);
      if (!Number.isNaN(newRevision)) {
        await getAuthedKy(account, partyService).patch(url, { json: { ...body, revision: newRevision } });
      }
    }

    throw error;
  }
}

export async function invite(account: AccountData, partyId: string, friendToInvite: string): Promise<void> {
  await getAuthedKy(account, partyService).post(`parties/${partyId}/invites/${friendToInvite}?sendPing=true`, {
    json: {
      'urn:epic:invite:platformdata_s': ''
    }
  });
}

export function getInviterParty(account: AccountData, senderId: string): Promise<InviterPartyResponse[]> {
  return getAuthedKy(account, partyService)
    .get<InviterPartyResponse[]>(`user/${account.accountId}/pings/${senderId}/parties`)
    .json();
}

export async function acceptInvite(
  account: AccountData,
  partyId: string,
  senderId: string,
  jid: string,
  meta: Record<string, string> = {}
): Promise<void> {
  await getAuthedKy(account, partyService)
    .post(`parties/${partyId}/members/${account.accountId}/join`, {
      json: {
        connection: {
          id: jid,
          meta: {
            'urn:epic:conn:platform_s': 'WIN',
            'urn:epic:conn:type_s': 'game'
          },
          yield_leadership: false
        },
        meta: {
          ...defaultPartyMemberMeta,
          ...meta,
          'urn:epic:member:dn_s': account.displayName,
          'urn:epic:member:joinrequestusers_j': JSON.stringify({
            users: [
              {
                id: account.accountId,
                dn: account.displayName,
                plat: 'WIN',
                data: JSON.stringify({
                  CrossplayPreference: '1',
                  SubGame_u: '1'
                })
              }
            ]
          })
        }
      }
    })
    .json();

  await getAuthedKy(account, partyService).delete(`user/${account.accountId}/pings/${senderId}`);
}
