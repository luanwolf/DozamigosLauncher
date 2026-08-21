import type { FullQueryProfile, ProfileItem } from '$types/game/mcp';

/** Subset of fortnite-api CosmeticMeta — kept local to avoid pulling HTTP deps into selfchecks. */
export type LockerCosmeticMeta = {
  id: string;
  name: string;
  description: string;
  rarity: string;
  series?: string;
  smallIcon: string;
  icon: string;
  styles?: { name: string; image: string }[];
};

export const LOCKER_CATEGORIES = [
  'outfits',
  'backpacks',
  'pickaxes',
  'gliders',
  'emotes',
  'wraps',
  'auras',
  'pets',
  'shoes'
] as const;

export type LockerCategory = (typeof LOCKER_CATEGORIES)[number];

export const CATEGORY_META: Record<LockerCategory, { prefix: string; slotCategory: string; slotCount: number }> = {
  outfits: { prefix: 'AthenaCharacter:', slotCategory: 'Character', slotCount: 1 },
  backpacks: { prefix: 'AthenaBackpack:', slotCategory: 'Backpack', slotCount: 1 },
  pickaxes: { prefix: 'AthenaPickaxe:', slotCategory: 'Pickaxe', slotCount: 1 },
  gliders: { prefix: 'AthenaGlider:', slotCategory: 'Glider', slotCount: 1 },
  emotes: { prefix: 'AthenaDance:', slotCategory: 'Dance', slotCount: 6 },
  wraps: { prefix: 'AthenaItemWrap:', slotCategory: 'ItemWrap', slotCount: 7 },
  auras: { prefix: 'SparksAura:', slotCategory: 'SparksAura', slotCount: 1 },
  pets: { prefix: 'CosmeticCompanion:', slotCategory: 'CosmeticCompanion', slotCount: 1 },
  shoes: { prefix: 'CosmeticShoes:', slotCategory: 'Shoes', slotCount: 1 }
};

export type LockerOwnedItem = {
  itemId: string;
  templateId: string;
  cosmeticId: string;
  name: string;
  description: string;
  rarity: string;
  /** Series backend id when present (Marvel, DC, Star Wars…). */
  series?: string;
  /** Alternate looks (Epic's "styles") shipped with the cosmetic. */
  styles: { name: string; image: string }[];
  imageUrl: string;
  favorite: boolean;
  equippedSlots: number[];
};

export type LockerLoadout = {
  lockerItemId: string;
  lockerName: string;
  equippedByCategory: Record<LockerCategory, string[]>;
};

export type LockerData = {
  loadout: LockerLoadout | null;
  itemsByCategory: Record<LockerCategory, LockerOwnedItem[]>;
};

function cosmeticIdFromTemplate(templateId: string) {
  const idx = templateId.indexOf(':');
  return (idx >= 0 ? templateId.slice(idx + 1) : templateId).toLowerCase();
}

function findActiveLocker(
  items: Record<string, ProfileItem>,
  attributes: { loadouts?: string[]; last_applied_loadout?: string }
) {
  const preferred = attributes.last_applied_loadout || attributes.loadouts?.[0];
  if (preferred && items[preferred]?.templateId.startsWith('CosmeticLocker:')) {
    return { id: preferred, item: items[preferred]! };
  }

  for (const [id, item] of Object.entries(items)) {
    if (item.templateId.startsWith('CosmeticLocker:')) return { id, item };
  }

  return null;
}

/** Epic may store full templateId or the owned-item GUID in locker slots. */
function resolveEquippedTemplate(raw: string | null | undefined, items: Record<string, ProfileItem>): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.includes(':')) return trimmed.toLowerCase();

  const direct = items[trimmed];
  if (direct?.templateId) return direct.templateId.toLowerCase();

  const lower = trimmed.toLowerCase();
  for (const [id, item] of Object.entries(items)) {
    if (id.toLowerCase() === lower && item.templateId) {
      return item.templateId.toLowerCase();
    }
  }

  return lower;
}

function cosmeticKey(templateOrId: string) {
  const lower = templateOrId.toLowerCase();
  const idx = lower.indexOf(':');
  return idx >= 0 ? lower.slice(idx + 1) : lower;
}

function templatesMatch(equipped: string, templateId: string) {
  if (!equipped) return false;
  const a = equipped.toLowerCase();
  const b = templateId.toLowerCase();
  return a === b || cosmeticKey(a) === cosmeticKey(b);
}

function readEquippedSlots(
  locker: ProfileItem | null,
  items: Record<string, ProfileItem>
): Record<LockerCategory, string[]> {
  const empty = Object.fromEntries(LOCKER_CATEGORIES.map((c) => [c, [] as string[]])) as Record<
    LockerCategory,
    string[]
  >;
  if (!locker) return empty;

  const slots = locker.attributes?.locker_slots_data?.slots as Record<string, { items?: unknown[] }> | undefined;
  if (!slots) return empty;

  const slotKeys = Object.fromEntries(Object.entries(slots).map(([key, value]) => [key.toLowerCase(), value]));

  for (const category of LOCKER_CATEGORIES) {
    const key = CATEGORY_META[category].slotCategory.toLowerCase();
    const slotItems = slotKeys[key]?.items ?? [];
    empty[category] = slotItems
      .map((entry) => {
        if (typeof entry === 'string') return resolveEquippedTemplate(entry, items);
        if (entry && typeof entry === 'object' && 'item' in entry) {
          return resolveEquippedTemplate(String((entry as { item?: unknown }).item ?? ''), items);
        }
        return '';
      })
      .filter(Boolean);
  }

  return empty;
}

export function parseLockerData(
  athena: FullQueryProfile<'athena'>,
  cosmetics: Map<string, LockerCosmeticMeta>
): LockerData {
  const profile = athena.profileChanges[0].profile;
  const attrs = profile.stats.attributes as {
    loadouts?: string[];
    last_applied_loadout?: string;
  };
  const locker = findActiveLocker(profile.items, attrs);
  const equippedByCategory = readEquippedSlots(locker?.item ?? null, profile.items);

  const itemsByCategory = Object.fromEntries(LOCKER_CATEGORIES.map((c) => [c, [] as LockerOwnedItem[]])) as Record<
    LockerCategory,
    LockerOwnedItem[]
  >;

  for (const [itemId, item] of Object.entries(profile.items)) {
    for (const category of LOCKER_CATEGORIES) {
      const { prefix } = CATEGORY_META[category];
      if (!item.templateId.toLowerCase().startsWith(prefix.toLowerCase())) continue;

      const cosmeticId = cosmeticIdFromTemplate(item.templateId);
      const meta = cosmetics.get(cosmeticId);
      const equippedSlots = equippedByCategory[category]
        .map((t, index) => (templatesMatch(t, item.templateId) || t === itemId.toLowerCase() ? index : -1))
        .filter((index) => index >= 0);

      itemsByCategory[category].push({
        itemId,
        templateId: item.templateId,
        // The catalog id keeps its original casing — fortnite.gg previews 404 on
        // the lowercased template id.
        cosmeticId: meta?.id || cosmeticId,
        name: meta?.name || cosmeticId,
        description: meta?.description || '',
        rarity: meta?.rarity || 'common',
        series: meta?.series,
        styles: meta?.styles ?? [],
        imageUrl: meta?.icon || meta?.smallIcon || '',
        favorite: !!item.attributes?.favorite,
        equippedSlots
      });
      break;
    }
  }

  for (const category of LOCKER_CATEGORIES) {
    itemsByCategory[category].sort((a, b) => {
      if (a.equippedSlots.length !== b.equippedSlots.length) {
        return b.equippedSlots.length - a.equippedSlots.length;
      }
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  return {
    loadout: locker
      ? {
          lockerItemId: locker.id,
          lockerName: String(locker.item.attributes?.locker_name || ''),
          equippedByCategory
        }
      : null,
    itemsByCategory
  };
}

export function slotCategoryFor(category: LockerCategory) {
  return CATEGORY_META[category].slotCategory;
}

export function slotCountFor(category: LockerCategory) {
  return CATEGORY_META[category].slotCount;
}
