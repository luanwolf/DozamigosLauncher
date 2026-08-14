import { fortniteApiService } from '@/core/http';
import { brItemColor } from '@/config/colors';

export type ShopItem = {
  offerId: string;
  name: string;
  description: string;
  price: { final: number; regular: number };
  rarity: string;
  rarityId: string;
  seriesId?: string;
  type: string;
  section: string;
  sectionId: string;
  image: string;
  isBundle: boolean;
  sortPriority: number;
  contents: { id: string }[];
};

export type ShopSection = {
  id: string;
  name: string;
  items: ShopItem[];
};

export type ShopData = {
  lastUpdated: string;
  hash: string;
  sections: ShopSection[];
  offers: ShopItem[];
};

type FnApiShopEntry = {
  offerId: string;
  devName: string;
  regularPrice: number;
  finalPrice: number;
  sortPriority: number;
  layoutId?: string;
  layout?: { id: string; name: string };
  newDisplayAssetPath?: string;
  bundle?: { name: string; info: string; image: string };
  brItems?: {
    id: string;
    name: string;
    type: { displayValue: string; backendValue: string };
    rarity: { displayValue: string; value: string };
    series?: { value: string; backendValue: string };
    images?: { icon?: string; featured?: string; smallIcon?: string };
  }[];
  tracks?: { id: string; title: string; albumArt?: string }[];
  cars?: {
    id: string;
    name: string;
    type: { displayValue: string };
    rarity: { displayValue: string; value: string };
    images?: { icon?: string; large?: string; small?: string };
  }[];
  newDisplayAsset?: { renderImages?: { image: string }[] };
};

type FnApiShopResponse = {
  data: { date: string; hash: string; entries: FnApiShopEntry[] };
};

const LOCALE_MAP: Record<string, string> = {
  pt: 'pt-BR',
  en: 'en',
  es: 'es',
  fr: 'fr',
  de: 'de',
  tr: 'tr'
};

const ITEMS_PER_PAGE = 6;

function isFeaturedBundle(entry: FnApiShopEntry): boolean {
  return /Bundle_Featured/i.test(entry.newDisplayAssetPath ?? '');
}

function isCharacterBundle(entry: FnApiShopEntry): boolean {
  return /Character_/i.test(entry.newDisplayAssetPath ?? '');
}

const FEATURED_BUNDLE_PREFIX: Record<string, string> = {
  de: 'Paket',
  en: 'Bundle',
  es: 'Lote',
  fr: 'Pack',
  'pt-br': 'Pacote',
  tr: 'Paket'
};

function featuredBundlePrefix(locale: string) {
  return FEATURED_BUNDLE_PREFIX[locale] ?? FEATURED_BUNDLE_PREFIX.en;
}

function labelFromDevName(devName: string): string {
  const match = devName.match(/\[VIRTUAL\]1 x (.+?) for \d+/i);
  return match?.[1]?.trim() ?? '';
}

function resolveBundleName(entry: FnApiShopEntry, locale: string): string {
  const brItems = entry.brItems ?? [];
  const leadName = brItems[0]?.name?.trim();
  const apiBundleName = entry.bundle?.name?.trim();
  const sectionName = entry.layout?.name?.trim();
  const itemCount = brItems.length;

  if (isCharacterBundle(entry)) {
    return apiBundleName || leadName || labelFromDevName(entry.devName) || 'Desconhecido';
  }

  if (isFeaturedBundle(entry)) {
    if (itemCount >= 10 && sectionName) return sectionName;
    if (apiBundleName) return apiBundleName;
    if (leadName) return `${featuredBundlePrefix(locale)} ${leadName}`;
  }

  if (apiBundleName) return apiBundleName;
  if (leadName) return leadName;
  return labelFromDevName(entry.devName) || 'Desconhecido';
}

function mapEntry(entry: FnApiShopEntry, locale: string): ShopItem {
  const brItem = entry.brItems?.[0];
  const track = entry.tracks?.[0];
  const car = entry.cars?.[0];
  const isBundle =
    !!entry.bundle?.name ||
    (entry.brItems?.length ?? 0) + (entry.tracks?.length ?? 0) + (entry.cars?.length ?? 0) > 1;

  const name = isBundle
    ? resolveBundleName(entry, locale)
    : brItem?.name ||
      car?.name ||
      track?.title ||
      entry.devName.replace(/\[VIRTUAL\]1 x (.+?) for \d+/i, '$1') ||
      'Desconhecido';

  const image =
    entry.bundle?.image ||
    brItem?.images?.featured ||
    brItem?.images?.icon ||
    car?.images?.large ||
    car?.images?.icon ||
    track?.albumArt ||
    entry.newDisplayAsset?.renderImages?.[0]?.image ||
    '';

  const rarityId = brItem?.rarity.value?.toLowerCase() ?? car?.rarity.value?.toLowerCase() ?? 'common';
  const seriesId = brItem?.series?.backendValue?.toLowerCase();

  return {
    offerId: entry.offerId,
    name,
    description:
      (brItem as { description?: string } | undefined)?.description ??
      (car as { description?: string } | undefined)?.description ??
      entry.bundle?.info ??
      '',
    price: { final: entry.finalPrice, regular: entry.regularPrice },
    rarity: brItem?.rarity.displayValue ?? car?.rarity.displayValue ?? '',
    rarityId,
    seriesId,
    type: isBundle ? 'Bundle' : (brItem?.type.displayValue ?? car?.type.displayValue ?? (track ? 'Music' : '')),
    section: entry.layout?.name ?? 'Outros',
    sectionId: entry.layout?.id ?? entry.layoutId ?? '__other__',
    image,
    isBundle,
    sortPriority: entry.sortPriority,
    contents: [
      ...(entry.brItems ?? []).map((item) => ({ id: item.id })),
      ...(entry.tracks ?? []).map((item) => ({ id: item.id })),
      ...(entry.cars ?? []).map((item) => ({ id: item.id ?? item.vehicleId ?? '' }))
    ]
  };
}

function isOutfitCatalogId(id: string): boolean {
  const lower = id.toLowerCase();
  return lower.startsWith('cid_') || lower.startsWith('character_');
}

function dedupeBundleMemberOffers(offers: ShopItem[]): ShopItem[] {
  const outfitIdsInBundles = new Set<string>();

  for (const offer of offers) {
    if (!offer.isBundle) continue;
    for (const content of offer.contents) {
      if (content.id && isOutfitCatalogId(content.id)) {
        outfitIdsInBundles.add(content.id.toLowerCase());
      }
    }
  }

  if (outfitIdsInBundles.size === 0) return offers;

  return offers.filter((offer) => {
    if (offer.isBundle) return true;
    const soloId = offer.contents[0]?.id?.toLowerCase();
    if (!soloId || !isOutfitCatalogId(soloId)) return true;
    return !outfitIdsInBundles.has(soloId);
  });
}

function groupSections(offers: ShopItem[]): ShopSection[] {
  const map = new Map<string, ShopSection>();
  for (const item of offers) {
    const key = item.sectionId;
    const existing = map.get(key);
    if (existing) existing.items.push(item);
    else map.set(key, { id: key, name: item.section, items: [item] });
  }
  for (const section of map.values()) {
    section.items.sort((a, b) => b.sortPriority - a.sortPriority);
  }
  return [...map.values()];
}

export function getBrShopPageItems(section: ShopSection, page: number): ShopItem[] {
  const start = page * ITEMS_PER_PAGE;
  return section.items.slice(start, start + ITEMS_PER_PAGE);
}

export function getBrShopPageCount(section: ShopSection): number {
  return Math.max(1, Math.ceil(section.items.length / ITEMS_PER_PAGE));
}

export async function fetchShop(locale = 'pt'): Promise<ShopData> {
  const language = LOCALE_MAP[locale] ?? 'pt-BR';
  const response = await fortniteApiService.get<FnApiShopResponse>('v2/shop', { searchParams: { language } }).json();
  const offers = dedupeBundleMemberOffers(response.data.entries.map((entry) => mapEntry(entry, locale)));
  return {
    lastUpdated: response.data.date,
    hash: response.data.hash,
    sections: groupSections(offers),
    offers
  };
}

export function shopItemToGridCard(item: ShopItem) {
  return {
    name: item.name,
    priceLabel: item.price.final === 0 ? 'Grátis' : String(item.price.final),
    priceIcon: 'vbucks' as const,
    imageUrl: item.image || undefined,
    backgroundColor: brItemColor(item.rarityId, item.seriesId),
    badge: item.isBundle ? 'BUNDLE' : undefined
  };
}

export async function searchCosmetic(name: string, locale = 'pt') {
  const language = LOCALE_MAP[locale] ?? 'pt-BR';
  const response = await fortniteApiService
    .get<{
      data: {
        id: string;
        name: string;
        description?: string;
        type: { displayValue: string };
        rarity: { displayValue: string; value: string };
        images: { icon?: string; featured?: string; smallIcon?: string };
      }[];
    }>('v2/cosmetics/br/search/all', { searchParams: { language, match: name } })
    .json();
  return response.data.slice(0, 10);
}

export { ITEMS_PER_PAGE, LOCALE_MAP };
