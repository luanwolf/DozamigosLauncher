import type { ShopItem } from '$types/shop';

/** Stable cosmetic / offer identity for wishlist (survives daily shop rotation). */
export function getShopItemWishlistKey(item: Pick<ShopItem, 'id' | 'offerId' | 'isBundle'>): string {
  if (item.isBundle) return `bundle:${item.offerId}`;
  return item.id.toLowerCase();
}

export function isLegacyWishlistOfferId(key: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
}
