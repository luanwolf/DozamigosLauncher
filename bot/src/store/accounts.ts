import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { AccountData } from '@/fortnite/clients';
import { DATA_DIR } from '@/paths';
import { decryptSecret, encryptSecret } from '@/store/crypto';

mkdirSync(DATA_DIR, { recursive: true });

const FILE = `${DATA_DIR}/accounts.json`;

type Row = {
  discordId: string;
  accountId: string;
  displayName: string;
  deviceId: string;
  secretEnc: string;
};

function load(): Row[] {
  if (!existsSync(FILE)) return [];
  try {
    return JSON.parse(readFileSync(FILE, 'utf8')) as Row[];
  } catch {
    return [];
  }
}

function save(rows: Row[]) {
  writeFileSync(FILE, JSON.stringify(rows, null, 2));
}

export function getLinkedAccount(discordId: string): AccountData | null {
  const row = load().find((r) => r.discordId === discordId);
  if (!row) return null;
  return {
    accountId: row.accountId,
    displayName: row.displayName,
    deviceId: row.deviceId,
    secret: decryptSecret(row.secretEnc)
  };
}

export function saveLinkedAccount(discordId: string, account: AccountData) {
  const rows = load().filter((r) => r.discordId !== discordId);
  rows.push({
    discordId,
    accountId: account.accountId,
    displayName: account.displayName,
    deviceId: account.deviceId,
    secretEnc: encryptSecret(account.secret)
  });
  save(rows);
}

export function deleteLinkedAccount(discordId: string) {
  save(load().filter((r) => r.discordId !== discordId));
}
