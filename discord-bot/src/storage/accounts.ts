import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { accountDataSchema, type AccountData } from '@/core/types';

const DATA_DIR = join(import.meta.dir, '../../data');
const ACCOUNTS_FILE = join(DATA_DIR, 'accounts.json');

const userAccountsSchema = z.object({
  activeAccountId: z.string().optional(),
  accounts: z.array(accountDataSchema)
});

type UserAccounts = z.infer<typeof userAccountsSchema>;

const store = new Map<string, UserAccounts>();

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadStore() {
  ensureDataDir();
  if (!existsSync(ACCOUNTS_FILE)) return;
  try {
    const raw = JSON.parse(readFileSync(ACCOUNTS_FILE, 'utf-8')) as Record<string, unknown>;
    for (const [discordUserId, data] of Object.entries(raw)) {
      const parsed = userAccountsSchema.safeParse(data);
      if (parsed.success) store.set(discordUserId, parsed.data);
    }
  } catch {
    // ignore corrupt file
  }
}

function saveStore() {
  ensureDataDir();
  const obj: Record<string, UserAccounts> = {};
  for (const [k, v] of store.entries()) obj[k] = v;
  writeFileSync(ACCOUNTS_FILE, JSON.stringify(obj, null, 2));
}

loadStore();

export function getUserAccounts(discordUserId: string): UserAccounts {
  return store.get(discordUserId) ?? { accounts: [] };
}

export function getActiveAccount(discordUserId: string): AccountData | null {
  const user = getUserAccounts(discordUserId);
  if (!user.accounts.length) return null;
  const activeId = user.activeAccountId ?? user.accounts[0].accountId;
  return user.accounts.find((a) => a.accountId === activeId) ?? user.accounts[0];
}

export function addAccount(discordUserId: string, account: AccountData): void {
  const user = getUserAccounts(discordUserId);
  const existing = user.accounts.findIndex((a) => a.accountId === account.accountId);
  if (existing >= 0) user.accounts[existing] = account;
  else user.accounts.push(account);
  if (!user.activeAccountId) user.activeAccountId = account.accountId;
  store.set(discordUserId, user);
  saveStore();
}

export function removeAccount(discordUserId: string, accountId: string): boolean {
  const user = getUserAccounts(discordUserId);
  const before = user.accounts.length;
  user.accounts = user.accounts.filter((a) => a.accountId !== accountId);
  if (user.activeAccountId === accountId) {
    user.activeAccountId = user.accounts[0]?.accountId;
  }
  store.set(discordUserId, user);
  saveStore();
  return user.accounts.length < before;
}

export function setActiveAccount(discordUserId: string, accountId: string): boolean {
  const user = getUserAccounts(discordUserId);
  if (!user.accounts.some((a) => a.accountId === accountId)) return false;
  user.activeAccountId = accountId;
  store.set(discordUserId, user);
  saveStore();
  return true;
}

export function clearAccounts(discordUserId: string): void {
  store.delete(discordUserId);
  saveStore();
}
