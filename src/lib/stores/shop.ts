import { SvelteMap } from 'svelte/reactivity';
import { writable } from 'svelte/store';
import type { ShopData } from '$types/shop';

export type AccountDataCache = Partial<{
  vbucks: number;
  friends: { displayName: string; accountId: string }[];
  remainingGifts: number;
}>;

export const brShopCache = writable<ShopData>();
export const brShopCacheLocale = writable<string>('');
export const accountDataCache = new SvelteMap<string, AccountDataCache>();
