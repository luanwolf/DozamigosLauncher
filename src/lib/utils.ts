import { toast } from 'svelte-sonner';
import { get } from 'svelte/store';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { t } from '$lib/i18n';
import { logger } from '$lib/logger';
import { accountStore } from '$lib/storage';
import type { AccountData } from '$types/account';
import type { FullQueryProfile } from '$types/game/mcp';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extracts a short human-readable detail from an error.
 * Uses Epic's errorMessage when available, otherwise falls back to Error.message.
 */
export function getErrorDetail(error: unknown): string {
  if (error && typeof error === 'object') {
    // EpicAPIError exposes errorMessage directly
    if ('errorMessage' in error && typeof (error as any).errorMessage === 'string') {
      const msg = (error as any).errorMessage as string;
      return msg.length > 120 ? msg.slice(0, 117) + '…' : msg;
    }
    if (error instanceof Error) {
      const msg = error.message;
      // JSON parse errors caused by an HTML response (server returned a login/error page)
      if (
        msg.includes('<!DOCTYPE') ||
        msg.includes('is not valid JSON') ||
        msg.includes('ReadableStreamDefaultController') ||
        msg.includes("Unexpected token '<'")
      ) {
        return 'unexpected HTML response from server';
      }
      return msg.length > 120 ? msg.slice(0, 117) + '…' : msg;
    }
  }
  return String(error);
}

export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

/** V-Bucks currency buckets in common_core (purchased, earned, battle pass, STW, etc.). */
const MTX_BALANCE_PREFIX = 'Currency:Mtx';

function isMtxBalanceItem(templateId: string) {
  if (!templateId.startsWith(MTX_BALANCE_PREFIX)) return false;
  // Debt is tracked separately and must not reduce the spendable balance shown in-game.
  return !templateId.includes('Debt');
}

export function calculateVbucks(queryProfile: FullQueryProfile<'common_core'>) {
  const profile = queryProfile.profileChanges[0].profile;

  return Object.values(profile.items)
    .filter((item) => isMtxBalanceItem(item.templateId))
    .reduce((acc, item) => acc + Math.max(0, item.quantity ?? 0), 0);
}

export type VbucksBreakdown = {
  purchased: number;
  earned: number;
  other: number;
  total: number;
};

export function parseVbucksBreakdown(queryProfile: FullQueryProfile<'common_core'>): VbucksBreakdown {
  const profile = queryProfile.profileChanges[0].profile;
  let purchased = 0;
  let earned = 0;
  let other = 0;

  for (const item of Object.values(profile.items)) {
    if (!isMtxBalanceItem(item.templateId)) continue;

    const qty = Math.max(0, item.quantity ?? 0);
    if (item.templateId === 'Currency:MtxPurchased') purchased += qty;
    else if (item.templateId === 'Currency:MtxEarned') earned += qty;
    else other += qty;
  }

  return { purchased, earned, other, total: purchased + earned + other };
}

export function calculateGold(queryProfile: FullQueryProfile<'campaign'>) {
  return sumCampaignResource(queryProfile, 'eventcurrency_scaling');
}

export function calculateXrayTickets(queryProfile: FullQueryProfile<'campaign'>) {
  return sumCampaignResource(queryProfile, 'currency_xrayllama');
}

function sumCampaignResource(queryProfile: FullQueryProfile<'campaign'>, resourceId: string) {
  const profile = queryProfile.profileChanges[0].profile;

  return Object.values(profile.items)
    .filter((item) => item.templateId.includes(resourceId))
    .reduce((acc, item) => acc + (item.quantity ?? 0), 0);
}

type HandleErrorOptions = {
  error: unknown;
  message: string;
  // Optional toast identifier used to update an existing toast.
  // If `false`, no toast will be shown.
  // If omitted, a new toast will be created.
  toastId?: string | number | false;
  account?: AccountData | string;
};

export function handleError({ error, message, toastId, account } = {} as HandleErrorOptions) {
  const accountId = typeof account === 'string' ? account : account?.accountId;
  logger.error(message, { accountId, error });

  if (toastId !== false) {
    toast.error(message, { id: toastId });
  }
}

/** Next 00:00 UTC — BR item shop and STW mission alerts rotate on this schedule. */
export function getNextUtcMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

export function msUntilNextUtcMidnight(): number {
  return Math.max(0, getNextUtcMidnight().getTime() - Date.now());
}

export function formatRemainingDuration(ms: number) {
  const translate = get(t);
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  const parts = [];

  if (days) {
    const key = days === 1 ? 'one' : 'other';
    parts.push(translate(`times.days.${key}`, { count: days }));
  }

  if (hours) {
    const key = hours === 1 ? 'one' : 'other';
    parts.push(translate(`times.hours.${key}`, { count: hours }));
  }

  if (minutes) {
    const key = minutes === 1 ? 'one' : 'other';
    parts.push(translate(`times.minutes.${key}`, { count: minutes }));
  }

  if (seconds) {
    const key = seconds === 1 ? 'one' : 'other';
    parts.push(translate(`times.seconds.${key}`, { count: seconds }));
  }

  return parts.length ? parts.join(' ') : translate('times.seconds.other', { count: 0 });
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processChunks<T, R>(
  items: T[],
  chunkSize: number,
  fn: (chunk: T[]) => Promise<R[]>
): Promise<R[]> {
  const promises = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    promises.push(fn(chunk).catch(() => []));
  }

  const results = await Promise.allSettled(promises);
  const processedResults: R[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      processedResults.push(...result.value);
    }
  }

  return processedResults;
}

export function getAccountsFromSelection(selection: string[]): AccountData[] {
  const { accounts } = accountStore.get();
  return selection.map((id) => accounts.find((account) => account.accountId === id)).filter((x) => !!x);
}

export function bytesToSize(bytes: number, decimals = 2, unit = 1000) {
  if (bytes <= 0) return '0 B';

  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(unit));
  return `${(bytes / Math.pow(unit, i)).toFixed(decimals)} ${sizes[i]}`;
}
