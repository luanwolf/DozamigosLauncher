import { fortniteApiService } from '$lib/http';
import type { ShopData, ShopItem } from '$types/shop';

type FnApiShopEntry = {
  offerId: string;
  devName: string;
  regularPrice: number;
  finalPrice: number;
  inDate: string;
  outDate: string;
  giftable: boolean;
  refundable: boolean;
  sortPriority: number;
  newDisplayAssetPath?: string;
  layoutId?: string;
  layout?: { id: string; name: string };
  bundle?: { name: string; info: string; image: string };
  brItems?: FnApiBrItem[];
  tracks?: FnApiTrack[];
  cars?: FnApiCarItem[];
  newDisplayAsset?: { renderImages?: { image: string }[] };
};

type FnApiBrItem = {
  id: string;
  name: string;
  description: string;
  type: { value: string; displayValue: string; backendValue: string };
  rarity: { value: string; displayValue: string; backendValue: string };
  series?: { value: string; backendValue: string };
  images: { smallIcon?: string; icon?: string; featured?: string };
  variants?: { channel: string; type: string; options?: { tag: string; name: string; image?: string }[] }[];
  /** YouTube video id when Epic has a showcase clip for the cosmetic. */
  showcaseVideo?: string;
  added: string;
  shopHistory?: string[];
};

/** Extra look of a cosmetic (Epic calls them styles), already flattened across channels. */
export type CosmeticStyle = {
  name: string;
  image: string;
};

function mapStyles(item: FnApiBrItem | undefined): CosmeticStyle[] {
  return (item?.variants ?? [])
    .flatMap((variant) => variant.options ?? [])
    .flatMap((option) => (option.image ? [{ name: option.name || option.tag, image: option.image }] : []));
}

type FnApiTrack = {
  id: string;
  title: string;
  artist: string;
  albumArt?: string;
  added: string;
};

type FnApiCarItem = {
  id: string;
  vehicleId?: string;
  name: string;
  description: string;
  type: { value: string; displayValue: string; backendValue: string };
  rarity: { value: string; displayValue: string; backendValue: string };
  images?: { small?: string; large?: string; icon?: string };
};

type FnApiShopResponse = {
  status: number;
  data: {
    hash: string;
    date: string;
    vbuckIcon: string;
    entries: FnApiShopEntry[];
  };
};

function isBundleEntry(entry: FnApiShopEntry): boolean {
  if (entry.bundle?.name) return true;
  const brCount = entry.brItems?.length ?? 0;
  const trackCount = entry.tracks?.length ?? 0;
  const carCount = entry.cars?.length ?? 0;
  return brCount + trackCount + carCount > 1;
}

/** Returns undefined when absent — never use '' or `??` skips album art / icons below. */
function newDisplayRenderImage(entry: FnApiShopEntry): string | undefined {
  const url = entry.newDisplayAsset?.renderImages?.[0]?.image;
  return url || undefined;
}

function isFeaturedBundle(entry: FnApiShopEntry): boolean {
  return /Bundle_Featured/i.test(entry.newDisplayAssetPath ?? '');
}

function isCharacterBundle(entry: FnApiShopEntry): boolean {
  return /Character_/i.test(entry.newDisplayAssetPath ?? '');
}

const FEATURED_BUNDLE_PREFIX: Record<string, string> = {
  'pt-br': 'Pacote'
};

function featuredBundlePrefix(locale?: string) {
  return FEATURED_BUNDLE_PREFIX[locale ?? 'pt-br'] ?? FEATURED_BUNDLE_PREFIX['pt-br'];
}

/** Epic virtual offers sometimes omit brItems; devName still carries a label. */
function labelFromDevName(devName: string): string {
  const match = devName.match(/\[VIRTUAL\]1 x (.+?) for \d+/i);
  return match?.[1]?.trim() ?? '';
}

function resolveBundleName(entry: FnApiShopEntry, brItems: FnApiBrItem[], locale?: string): string {
  const leadName = brItems[0]?.name?.trim();
  const apiBundleName = entry.bundle?.name?.trim();
  const sectionName = entry.layout?.name?.trim();
  const itemCount = brItems.length;

  if (isCharacterBundle(entry)) {
    return apiBundleName || leadName || labelFromDevName(entry.devName);
  }

  if (isFeaturedBundle(entry)) {
    if (itemCount >= 10 && sectionName) return sectionName;
    if (apiBundleName) return apiBundleName;
    if (leadName) return `${featuredBundlePrefix(locale)} ${leadName}`;
  }

  if (apiBundleName) return apiBundleName;
  if (leadName) return leadName;
  return labelFromDevName(entry.devName);
}

function mapEntry(entry: FnApiShopEntry, locale?: string): ShopItem {
  const brItems = entry.brItems ?? [];
  const tracks = entry.tracks ?? [];
  const cars = entry.cars ?? [];
  const brItem = brItems[0];
  const track = tracks[0];
  const car = cars[0];
  const bundle = entry.bundle;
  const isBundle = isBundleEntry(entry);
  const isTrackOffer = !isBundle && !brItem && !car && !!track;
  const renderImage = newDisplayRenderImage(entry);

  const name = isBundle
    ? resolveBundleName(entry, brItems, locale)
    : (brItem?.name ?? car?.name ?? bundle?.name ?? track?.title ?? labelFromDevName(entry.devName) ?? '');
  const description =
    isBundle && bundle?.info ? bundle.info : (brItem?.description ?? car?.description ?? bundle?.info ?? '');
  const cosmeticImage =
    brItem?.images?.featured ??
    brItem?.images?.icon ??
    brItem?.images?.smallIcon ??
    car?.images?.large ??
    car?.images?.small ??
    car?.images?.icon;

  const image =
    isBundle && bundle?.image
      ? bundle.image
      : isTrackOffer
        ? (track.albumArt ?? renderImage ?? '')
        : (cosmeticImage ?? renderImage ?? bundle?.image ?? track?.albumArt ?? '');
  const smallImage =
    isBundle && bundle?.image
      ? bundle.image
      : isTrackOffer
        ? (track.albumArt ?? renderImage ?? '')
        : (brItem?.images?.smallIcon ??
          car?.images?.small ??
          car?.images?.icon ??
          renderImage ??
          bundle?.image ??
          track?.albumArt ??
          '');
  const largeImage =
    isBundle && bundle?.image
      ? bundle.image
      : isTrackOffer
        ? (track.albumArt ?? renderImage ?? '')
        : (brItem?.images?.icon ??
          car?.images?.large ??
          car?.images?.icon ??
          renderImage ??
          bundle?.image ??
          track?.albumArt ??
          '');

  const shopHistory = brItem?.shopHistory ?? [];
  const lastSeen = shopHistory.at(-1) ?? entry.inDate;
  const releaseDate = brItem?.added ?? entry.inDate;

  const contents = [
    ...brItems.map((b) => ({ id: b.id, name: b.name, alreadyOwnedPriceReduction: 0 })),
    ...tracks.map((t) => ({ id: t.id, name: t.title, alreadyOwnedPriceReduction: 0 })),
    ...cars.map((c) => ({
      id: c.id ?? c.vehicleId ?? '',
      name: c.name,
      alreadyOwnedPriceReduction: 0
    }))
  ];

  return {
    id: isBundle ? entry.offerId : (brItem?.id ?? car?.id ?? car?.vehicleId ?? track?.id ?? entry.offerId),
    offerId: entry.offerId,
    devName: entry.devName,
    name,
    description,
    price: {
      final: entry.finalPrice,
      regular: entry.regularPrice,
      floor: 0
    },
    assets: {
      small: smallImage,
      large: largeImage,
      featured: image
    },
    type: {
      id: isBundle ? 'bundle' : (brItem?.type.backendValue ?? car?.type.backendValue ?? (isTrackOffer ? 'track' : '')),
      name: isBundle ? 'Bundle' : (brItem?.type.displayValue ?? car?.type.displayValue ?? (isTrackOffer ? 'Music' : ''))
    },
    rarity: {
      id: (brItem?.rarity.value ?? car?.rarity.value ?? '').toLowerCase(),
      name: brItem?.rarity.displayValue ?? car?.rarity.displayValue ?? ''
    },
    series: brItem?.series ? { id: brItem.series.backendValue.toLowerCase(), name: brItem.series.value } : undefined,
    meta: {
      newDisplayAssetPath: entry.newDisplayAssetPath ?? '',
      webURL: '',
      templateId: brItem?.id ?? car?.id ?? ''
    },
    dates: {
      releaseDate: brItem?.added ?? track?.added ?? entry.inDate,
      lastSeen,
      in: entry.inDate,
      out: entry.outDate
    },
    section: {
      id: entry.layout?.id ?? entry.layoutId ?? '',
      name: entry.layout?.name ?? ''
    },
    banner: { id: '', name: '', intensity: '' },
    contents,
    // ponytail: bundles show the styles of the lead cosmetic only — listing every
    // member's styles would fill the modal with dozens of thumbnails.
    styles: mapStyles(brItem),
    shopHistory,
    sortPriority: entry.sortPriority,
    giftable: entry.giftable,
    refundable: entry.refundable,
    isBundle
  };
}

/** Outfit ids bundled today — only hide duplicate standalone skins, not emotes/tools sold separately. */
function isOutfitCatalogId(id: string): boolean {
  const lower = id.toLowerCase();
  return lower.startsWith('cid_') || lower.startsWith('character_');
}

/** Drops standalone skin rows when the same outfit is already sold in a bundle card. */
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
    if (offer.type.id !== 'AthenaCharacter') return true;
    const soloId = (offer.contents[0]?.id ?? offer.id)?.toLowerCase();
    return !soloId || !outfitIdsInBundles.has(soloId);
  });
}

const LOCALE_TO_FN_LANG: Record<string, string> = {
  'pt-br': 'pt-BR'
};

export async function fetchShop(locale?: string): Promise<ShopData> {
  const language = (locale && LOCALE_TO_FN_LANG[locale]) || 'pt-BR';
  const response = await fortniteApiService.get<FnApiShopResponse>('v2/shop', { searchParams: { language } }).json();

  const offers = dedupeBundleMemberOffers(response.data.entries.map((entry) => mapEntry(entry, locale)));

  return {
    lastUpdated: response.data.date,
    hash: response.data.hash,
    image: response.data.vbuckIcon,
    offers
  };
}

export type CosmeticMeta = {
  id: string;
  name: string;
  description: string;
  /** Backend type, e.g. "AthenaCharacter", "AthenaBackpack". */
  typeBackend: string;
  /** Rarity value lowercased, e.g. "legendary". */
  rarity: string;
  /** Series backend value when present, e.g. "MarvelSeries". */
  series?: string;
  smallIcon: string;
  icon: string;
  styles: CosmeticStyle[];
};

type FnApiCosmeticsResponse = {
  status: number;
  data: FnApiBrItem[];
};

const cosmeticsCacheByLang = new Map<string, Map<string, CosmeticMeta>>();

/**
 * Fetches the full Battle Royale cosmetics catalog from fortnite-api.com and
 * returns a map keyed by the cosmetic id (lowercased). Cached in memory per
 * language for the session — the catalog is large, so we only fetch it once.
 */
export async function fetchCosmeticsBr(locale?: string): Promise<Map<string, CosmeticMeta>> {
  const language = (locale && LOCALE_TO_FN_LANG[locale]) || 'pt-BR';

  const cached = cosmeticsCacheByLang.get(language);
  if (cached) return cached;

  const response = await fortniteApiService
    .get<FnApiCosmeticsResponse>('v2/cosmetics/br', { searchParams: { language } })
    .json();

  const map = new Map<string, CosmeticMeta>();
  for (const item of response.data) {
    map.set(item.id.toLowerCase(), {
      id: item.id,
      name: item.name,
      description: item.description ?? '',
      typeBackend: item.type?.backendValue ?? '',
      rarity: item.rarity?.value?.toLowerCase() ?? 'common',
      series: item.series?.backendValue?.toLowerCase() || undefined,
      smallIcon: item.images?.smallIcon ?? item.images?.icon ?? '',
      icon: item.images?.icon ?? item.images?.smallIcon ?? '',
      styles: mapStyles(item)
    });
  }

  cosmeticsCacheByLang.set(language, map);
  return map;
}

export type FortniteNewsItem = {
  id: string;
  title: string;
  body: string;
  image: string;
  tileImage?: string;
};

type FnApiBrNewsResponse = {
  status: number;
  data: {
    hash?: string;
    date?: string;
    image?: string;
    motds: Array<{
      id: string;
      title: string;
      body: string;
      image: string;
      tileImage?: string;
      hidden?: boolean;
      sortingPriority?: number;
    }>;
  };
};

type FnApiStwNewsResponse = {
  status: number;
  data: {
    messages: Array<{
      title: string;
      body: string;
      image: string;
    }>;
  };
};

function mapBrNewsItem(item: FnApiBrNewsResponse['data']['motds'][number]): FortniteNewsItem {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    image: item.image || item.tileImage || '',
    tileImage: item.tileImage
  };
}

export async function fetchBrNews(locale?: string): Promise<FortniteNewsItem[]> {
  const language = (locale && LOCALE_TO_FN_LANG[locale]) || 'pt-BR';
  const response = await fortniteApiService
    .get<FnApiBrNewsResponse>('v2/news/br', { searchParams: { language } })
    .json();

  return response.data.motds
    .filter((item) => !item.hidden)
    .sort((a, b) => (b.sortingPriority ?? 0) - (a.sortingPriority ?? 0))
    .map(mapBrNewsItem);
}

export async function fetchStwNews(locale?: string): Promise<FortniteNewsItem[]> {
  const language = (locale && LOCALE_TO_FN_LANG[locale]) || 'pt-BR';
  const response = await fortniteApiService
    .get<FnApiStwNewsResponse>('v2/news/stw', { searchParams: { language } })
    .json();

  return response.data.messages.map((item, index) => ({
    id: `stw-${index}`,
    title: item.title,
    body: item.body,
    image: item.image
  }));
}

export type FortniteMapPoi = {
  id: string;
  name: string;
  location: { x: number; y: number; z: number };
};

export type FortniteMapData = {
  imageBlank: string;
  imagePois: string;
  pois: FortniteMapPoi[];
};

type FnApiMapResponse = {
  status: number;
  data: {
    images: { blank: string; pois: string };
    pois: FortniteMapPoi[];
  };
};

export async function fetchMap(locale?: string): Promise<FortniteMapData> {
  const language = (locale && LOCALE_TO_FN_LANG[locale]) || 'pt-BR';
  const response = await fortniteApiService.get<FnApiMapResponse>('v1/map', { searchParams: { language } }).json();

  return {
    imageBlank: response.data.images.blank,
    imagePois: response.data.images.pois,
    pois: response.data.pois
  };
}
