import { derived, type Readable } from 'svelte/store';
import { getChildLogger } from '$lib/logger';
import { accountDataFileSchema } from '$lib/schemas/account';
import { FileStore } from '$lib/storage/file-store';
import type { AccountData, AccountDataFile } from '$types/account';

const logger = getChildLogger('AccountStore');

export class AccountStore extends FileStore<AccountDataFile> {
  constructor() {
    super('accounts', { accounts: [] }, accountDataFileSchema);
  }

  async init() {
    await super.init();

    const { accounts, activeAccountId } = this.get();
    if (activeAccountId && !accounts.some((x) => x.accountId === activeAccountId)) {
      this.set((state) => ({
        ...state,
        activeAccountId: accounts[0]?.accountId || undefined
      }));
    }
  }

  add(account: AccountData, setActive = true) {
    this.set((state) => ({
      ...state,
      accounts: [...state.accounts, account],
      activeAccountId: setActive ? account.accountId : state.activeAccountId
    }));
  }

  remove(id: string) {
    const account = this.getAccount(id);

    this.set((state) => {
      const nextAccounts = state.accounts.filter((x) => x.accountId !== id);
      return {
        ...state,
        accounts: nextAccounts,
        activeAccountId:
          state.activeAccountId === id ? nextAccounts[0]?.accountId || undefined : state.activeAccountId
      };
    });

    if (account) {
      void this.cleanupAccount(account);
    }
  }

  getAccount(id: string) {
    return this.get().accounts.find((x) => x.accountId === id) || null;
  }

  getActive() {
    const data = this.get();
    if (!data.activeAccountId) return null;
    return this.getAccount(data.activeAccountId);
  }

  // The nullable parameter is useful when the component is behind authentication
  getActiveStore(nullable?: false): Readable<AccountData>;

  getActiveStore(nullable: true): Readable<AccountData | null>;

  getActiveStore(nullable = false): Readable<AccountData | null> {
    return derived(this, ($state) => {
      const account = $state.accounts.find((x) => x.accountId === $state.activeAccountId) ?? null;
      if (!nullable && !account) {
        throw new Error('Active account is required');
      }

      return account;
    });
  }

  setActive(id: string) {
    this.set((state) => ({ ...state, activeAccountId: id }));
  }

  private async cleanupAccount(account: AccountData) {
    const [{ removeAutoKickAccount }, { XMPPManager }, { deleteDeviceAuth }, { getLegendaryAccount, logoutLegendary }] =
      await Promise.all([
        import('$lib/modules/autokick/base'),
        import('$lib/modules/xmpp'),
        import('$lib/modules/device-auth'),
        import('$lib/modules/legendary')
      ]);

    removeAutoKickAccount(account.accountId);
    XMPPManager.instances.get(account.accountId)?.disconnect();

    deleteDeviceAuth(account, account.deviceId).catch((error) => {
      logger.error('Failed to delete device auth', { error });
    });

    getLegendaryAccount().then((legAccount) => {
      if (legAccount === account.accountId) {
        logoutLegendary().catch((error) => {
          logger.error('Failed to logout from Legendary', { error });
        });
      }
    });
  }
}
