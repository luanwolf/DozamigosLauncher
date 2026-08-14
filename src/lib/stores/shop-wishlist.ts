import { get, writable } from 'svelte/store';
import { isLegacyWishlistOfferId } from '$lib/modules/shop-item-key';
import type { ShopItem } from '$types/shop';

const STORAGE_KEY = 'shopWishlist';

function readWishlist(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    const keys = parsed.filter((key) => !isLegacyWishlistOfferId(key));
    return new Set(keys);
  } catch {
    return new Set();
  }
}

function persistWishlist(ids: Set<string>) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export const shopWishlistStore = writable(readWishlist());

export function getShopWishlist() {
  return get(shopWishlistStore);
}

export function isShopWishlisted(key: string) {
  return get(shopWishlistStore).has(key);
}

export function toggleShopWishlistKey(key: string) {
  shopWishlistStore.update((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    persistWishlist(next);
    return next;
  });
}

export function getWishlistedOffersInShop(offers: ShopItem[], wishlist: Set<string>) {
  return offers.filter((offer) => wishlist.has(offer.id.toLowerCase()) || wishlist.has(`bundle:${offer.offerId}`));
}
