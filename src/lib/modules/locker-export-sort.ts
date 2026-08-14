import type { LockerOwnedItem } from '$lib/modules/locker-parse';

/** Series / collabs first, then mythic → legendary → epic → rare → uncommon → common. */
const RARITY_RANK: Record<string, number> = {
  dcuseries: 0,
  dc: 1,
  starwarsseries: 2,
  starwars: 3,
  marvelseries: 4,
  marvel: 5,
  gaminglegendsseries: 6,
  gaminglegends: 7,
  creatorcollabseries: 8,
  platformseries: 9,
  lavaseries: 10,
  lava: 11,
  frozenseries: 12,
  frozen: 13,
  cubeseries: 14,
  cube: 15,
  shadowseries: 16,
  shadow: 17,
  slurpseries: 18,
  slurp: 19,
  columbusseries: 20,
  icon: 21,
  iconseries: 22,
  mythic: 100,
  exotic: 101,
  legendary: 102,
  epic: 103,
  rare: 104,
  uncommon: 105,
  common: 106
};

function rarityKey(rarity: string) {
  return rarity.toLowerCase().replace(/\s+/g, '');
}

/** Sort key: series/collab first, then mythic → … → common. */
export function lockerSortRank(item: Pick<LockerOwnedItem, 'rarity' | 'series'>): number {
  const seriesKey = item.series ? rarityKey(item.series) : '';
  if (seriesKey && seriesKey in RARITY_RANK) return RARITY_RANK[seriesKey];
  if (seriesKey) return 50;

  const key = rarityKey(item.rarity);
  if (key in RARITY_RANK) return RARITY_RANK[key];
  if (key.includes('series') || key.includes('collab')) return 50;
  return 200;
}

export function sortLockerItemsForExport(items: LockerOwnedItem[]): LockerOwnedItem[] {
  return [...items].sort((a, b) => {
    const rank = lockerSortRank(a) - lockerSortRank(b);
    if (rank !== 0) return rank;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}
