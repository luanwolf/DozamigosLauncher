import { SvelteMap } from 'svelte/reactivity';
import { ConnectionEvents, EpicEvents } from '$lib/constants/events';
import { getChildLogger } from '$lib/logger';
import { autoKickAccounts } from '$lib/modules/autokick/base';
import { acceptIncomingBulk, getIncoming } from '$lib/modules/friends';
import { acceptInvite, getInviterParty, getParty, leaveParty, patchSelf } from '$lib/modules/party';
import { XMPPManager } from '$lib/modules/xmpp';
import { FileStore } from '$lib/storage/file-store';
import { accountStore } from '$lib/storage';
import type { AccountData } from '$types/account';
import { z } from 'zod';

const logger = getChildLogger('TaxiService');

const taxiSettingsSchema = z.array(
  z.object({
    accountId: z.string(),
    autoAcceptFriends: z.boolean().optional()
  })
);

type TaxiSetting = z.infer<typeof taxiSettingsSchema>[number];

class TaxiStore extends FileStore<TaxiSetting[]> {
  constructor() {
    super('taxi-service', [], taxiSettingsSchema);
  }
}

export const taxiStore = new TaxiStore();

export type TaxiAccount = {
  account: AccountData;
  status: 'LOADING' | 'ACTIVE' | 'BUSY' | 'DISCONNECTED' | 'ERROR';
  autoAcceptFriends: boolean;
  manager?: TaxiManager;
};

export const taxiAccounts = new SvelteMap<string, TaxiAccount>();

export function isTaxiActive(accountId: string) {
  return taxiAccounts.has(accountId);
}

export async function addTaxiAccount(account: AccountData, autoAcceptFriends = true) {
  if (autoKickAccounts.has(account.accountId)) {
    throw new Error('AUTO_KICK_CONFLICT');
  }
  if (taxiAccounts.has(account.accountId)) return;

  const entry: TaxiAccount = {
    account,
    status: 'LOADING',
    autoAcceptFriends
  };
  taxiAccounts.set(account.accountId, entry);
  persistTaxi();

  const manager = await TaxiManager.new(account, autoAcceptFriends);
  taxiAccounts.set(account.accountId, {
    ...taxiAccounts.get(account.accountId)!,
    manager,
    status: 'ACTIVE'
  });
}

export function removeTaxiAccount(accountId: string) {
  taxiAccounts.get(accountId)?.manager?.destroy();
  taxiAccounts.delete(accountId);
  persistTaxi();
}

export function updateTaxiSettings(accountId: string, autoAcceptFriends: boolean) {
  const entry = taxiAccounts.get(accountId);
  if (!entry) return;
  entry.autoAcceptFriends = autoAcceptFriends;
  entry.manager?.setAutoAcceptFriends(autoAcceptFriends);
  taxiAccounts.set(accountId, { ...entry });
  persistTaxi();
}

function persistTaxi() {
  taxiStore.set(() =>
    [...taxiAccounts.values()].map((entry) => ({
      accountId: entry.account.accountId,
      autoAcceptFriends: entry.autoAcceptFriends
    }))
  );
}

export async function initTaxiService() {
  await taxiStore.init();
  const saved = taxiStore.get();
  if (!saved?.length) return;
  const accounts = accountStore.get().accounts;
  await Promise.allSettled(
    saved.map(async (setting) => {
      const account = accounts.find((entry) => entry.accountId === setting.accountId);
      if (!account || autoKickAccounts.has(account.accountId)) {
        taxiStore.set((list) => list.filter((row) => row.accountId !== setting.accountId));
        return;
      }
      await addTaxiAccount(account, setting.autoAcceptFriends ?? true);
    })
  );
}

class TaxiManager {
  private xmpp?: XMPPManager;
  private destroyed = false;
  private friendTimer?: ReturnType<typeof setInterval>;

  private constructor(
    private account: AccountData,
    private autoAcceptFriends: boolean
  ) {}

  static async new(account: AccountData, autoAcceptFriends: boolean) {
    const manager = new TaxiManager(account, autoAcceptFriends);
    await manager.start();
    return manager;
  }

  setAutoAcceptFriends(value: boolean) {
    this.autoAcceptFriends = value;
  }

  private async start() {
    this.xmpp = await XMPPManager.new(this.account, 'taxiService');
    await this.xmpp.connect();
    this.xmpp.setStatus('Taxi Service', 'dnd');

    this.xmpp.on(EpicEvents.PartyInvite, (event) => {
      void this.handleInvite(event.pinger_id);
    });

    this.xmpp.on(ConnectionEvents.Disconnected, () => {
      if (this.destroyed) return;
      const entry = taxiAccounts.get(this.account.accountId);
      if (entry) taxiAccounts.set(this.account.accountId, { ...entry, status: 'DISCONNECTED' });
    });

    this.friendTimer = setInterval(() => {
      if (this.autoAcceptFriends) void this.acceptFriends();
    }, 20_000);
  }

  private async handleInvite(senderId: string) {
    try {
      const parties = await getInviterParty(this.account, senderId);
      const party = parties[0];
      if (!party) return;

      await acceptInvite(this.account, party.id, senderId, this.xmpp!.connection!.jid!);
      const live = (await getParty(this.account)).current[0];
      if (!live) return;

      const self = live.members.find((member) => member.account_id === this.account.accountId);
      if (self) {
        await patchSelf(this.account, live.id, self.revision, {
          'Default:CampaignCommanderLoadoutRating_d': '130.000000'
        });
      }

      const entry = taxiAccounts.get(this.account.accountId);
      if (entry) taxiAccounts.set(this.account.accountId, { ...entry, status: 'BUSY' });
      this.xmpp?.setStatus('Taxi — in party', 'dnd');

      // Leave when party shrinks to solo or we become captain (carry done / wrong role).
      const watch = setInterval(async () => {
        if (this.destroyed) {
          clearInterval(watch);
          return;
        }
        try {
          const current = (await getParty(this.account)).current[0];
          if (!current) {
            clearInterval(watch);
            this.markActive();
            return;
          }
          const me = current.members.find((member) => member.account_id === this.account.accountId);
          const shouldLeave = current.members.length <= 1 || me?.role === 'CAPTAIN';
          if (!shouldLeave) return;
          clearInterval(watch);
          await leaveParty(this.account, current.id);
          this.markActive();
        } catch (error) {
          logger.warn('Taxi party watch failed', { accountId: this.account.accountId, error });
        }
      }, 5_000);
    } catch (error) {
      logger.error('Taxi invite handling failed', { accountId: this.account.accountId, error });
    }
  }

  private markActive() {
    const entry = taxiAccounts.get(this.account.accountId);
    if (entry) taxiAccounts.set(this.account.accountId, { ...entry, status: 'ACTIVE' });
    this.xmpp?.setStatus('Taxi Service', 'dnd');
  }

  private async acceptFriends() {
    try {
      const incoming = await getIncoming(this.account);
      if (!incoming.length) return;
      await acceptIncomingBulk(
        this.account,
        incoming.map((row) => row.accountId)
      );
    } catch (error) {
      logger.debug('Taxi friend accept failed', { accountId: this.account.accountId, error });
    }
  }

  destroy() {
    this.destroyed = true;
    if (this.friendTimer) clearInterval(this.friendTimer);
    this.xmpp?.removePurpose('taxiService');
  }
}
