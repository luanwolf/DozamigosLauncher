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

const PREFIX: Record<LockerCategory, string> = {
  outfits: 'AthenaCharacter:',
  backpacks: 'AthenaBackpack:',
  pickaxes: 'AthenaPickaxe:',
  gliders: 'AthenaGlider:',
  emotes: 'AthenaDance:',
  wraps: 'AthenaItemWrap:',
  auras: 'SparksAura:',
  pets: 'CosmeticCompanion:',
  shoes: 'CosmeticShoes:'
};

export const CATEGORY_LABEL: Record<LockerCategory, string> = {
  outfits: 'skins',
  backpacks: 'mochilas',
  pickaxes: 'picos',
  gliders: 'asas-deltas',
  emotes: 'gestos',
  wraps: 'envelopamentos',
  auras: 'aura',
  pets: 'pets',
  shoes: 'calçados'
};

export type LockerOwnedItem = {
  name: string;
  rarity: string;
  series?: string;
  imageUrl: string;
};

type CosmeticMeta = {
  name: string;
  rarity: string;
  series?: string;
  icon: string;
  smallIcon: string;
};

type AthenaProfile = {
  profileChanges: { profile: { items: Record<string, { templateId: string }> } }[];
};

function cosmeticId(templateId: string) {
  const idx = templateId.indexOf(':');
  return (idx >= 0 ? templateId.slice(idx + 1) : templateId).toLowerCase();
}

export function parseLockerCategory(
  athena: AthenaProfile,
  cosmetics: Map<string, CosmeticMeta>,
  category: LockerCategory
): LockerOwnedItem[] {
  const items: LockerOwnedItem[] = [];
  const prefix = PREFIX[category].toLowerCase();
  for (const item of Object.values(athena.profileChanges[0]!.profile.items)) {
    if (!item.templateId.toLowerCase().startsWith(prefix)) continue;
    const meta = cosmetics.get(cosmeticId(item.templateId));
    items.push({
      name: meta?.name || cosmeticId(item.templateId),
      rarity: meta?.rarity || 'common',
      series: meta?.series,
      imageUrl: meta?.icon || meta?.smallIcon || ''
    });
  }
  return items;
}
