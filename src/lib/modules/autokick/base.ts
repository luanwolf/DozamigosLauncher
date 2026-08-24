import { SvelteMap } from 'svelte/reactivity';
import { AutoKickManager } from '$lib/modules/autokick/manager';
import { accountStore, automationStore } from '$lib/storage';
import type { AccountData } from '$types/account';
import type { AutomationSetting } from '$types/settings';

export type AutomationAccount = {
  status: 'LOADING' | 'ACTIVE' | 'INVALID_CREDENTIALS' | 'DISCONNECTED';
  account: AccountData;
  settings: Partial<Omit<AutomationSetting, 'accountId'>>;
  manager?: AutoKickManager;
};

export const autoKickAccounts = new SvelteMap<string, AutomationAccount>();

export async function initAutoKick() {
  const accounts = automationStore.get();
  if (!accounts?.length) return;

  const userAccounts = accountStore.get().accounts;
  await Promise.allSettled(
    accounts.map(async (automationAccount) => {
      const account = userAccounts.find((a) => a.accountId === automationAccount.accountId);
      const isAnySettingEnabled = Object.entries(automationAccount)
        .filter(([key]) => key !== 'accountId')
        .some(([, value]) => value);

      if (!account || !isAnySettingEnabled) {
        automationStore.set((s) => s.filter((a) => a.accountId !== automationAccount.accountId));
        return;
      }

      await addAutoKickAccount(account, automationAccount);
    })
  );
}

export async function addAutoKickAccount(account: AccountData, settings: AutomationAccount['settings'] = {}) {
  if (autoKickAccounts.has(account.accountId)) return;

  const data: AutomationAccount = {
    status: 'LOADING',
    account,
    settings
  };

  autoKickAccounts.set(account.accountId, data);
  updateAutoKickSettings(account.accountId, settings);

  const manager = await AutoKickManager.new(account);
  autoKickAccounts.set(account.accountId, {
    ...autoKickAccounts.get(account.accountId)!,
    manager
  });
}

export function removeAutoKickAccount(accountId: string) {
  autoKickAccounts.get(accountId)?.manager?.destroy();
  autoKickAccounts.delete(accountId);
  saveSettings();
}

export function updateAutoKickSettings(accountId: string, settings: Partial<AutomationSetting>) {
  const account = autoKickAccounts.get(accountId);
  if (!account) return;

  autoKickAccounts.set(accountId, {
    ...account,
    settings: {
      ...account.settings,
      ...settings
    }
  });

  saveSettings();
}

export function updateAutoKickStatus(accountId: string, status: AutomationAccount['status']) {
  const account = autoKickAccounts.get(accountId);
  if (!account) return;

  autoKickAccounts.set(accountId, {
    ...account,
    status
  });
}

function saveSettings() {
  automationStore.set(() =>
    autoKickAccounts
      .values()
      .map((x) => ({
        accountId: x.account.accountId,
        ...x.settings
      }))
      .toArray()
  );
}
