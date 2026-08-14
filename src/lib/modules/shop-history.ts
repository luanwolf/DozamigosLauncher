import type { ShopItem } from '$types/shop';

export type ShopAppearanceStats = {
  appearances: number;
  firstSeen: string | null;
  lastSeen: string | null;
  daysSinceLastSeen: number | null;
};

export function getShopAppearanceStats(item: ShopItem, now = Date.now()): ShopAppearanceStats {
  const history = item.shopHistory.filter(Boolean);
  const firstSeen = history[0] ?? item.dates.releaseDate ?? null;
  const lastSeen = history.at(-1) ?? item.dates.lastSeen ?? null;

  return {
    appearances: history.length || (lastSeen ? 1 : 0),
    firstSeen,
    lastSeen,
    daysSinceLastSeen: lastSeen ? Math.floor((now - new Date(lastSeen).getTime()) / 86_400_000) : null
  };
}

export function isLeavingSoon(item: ShopItem, now = Date.now(), withinMs = 3 * 86_400_000): boolean {
  if (!item.dates.out) return false;
  const out = new Date(item.dates.out).getTime();
  return out > now && out - now <= withinMs;
}
