import { egsStoreService } from '$lib/http';

export type FreeGame = {
  title: string;
  id: string;
  namespace: string;
  description: string;
  thumbnail: string;
  /** Wide art for hero / banners. Falls back to thumbnail when missing. */
  banner: string;
  originalPrice: number;
  endDate: string;
  storeUrl: string;
};

type StorePromotion = {
  startDate: string;
  endDate: string;
  discountSetting: { discountPercentage: number };
};

type SlugMapping = { pageSlug?: string; pageType?: string };

type StoreElement = {
  title: string;
  id: string;
  namespace: string;
  description: string;
  offerType: string;
  productSlug?: string | null;
  urlSlug?: string | null;
  offerMappings?: SlugMapping[] | null;
  catalogNs?: { mappings?: SlugMapping[] | null } | null;
  price: { totalPrice: { discountPrice: number; originalPrice: number } };
  promotions: {
    promotionalOffers: { promotionalOffers: StorePromotion[] }[];
  } | null;
  keyImages: { type: string; url: string }[];
};

/**
 * Builds the public Epic Games Store page URL for a game so it can be claimed
 * manually in the browser. Slug priority follows Epic's own resolution order:
 * offerMappings → catalogNs.mappings → productSlug.
 */
function buildStoreUrl(element: StoreElement, locale = 'en-US'): string {
  const type = element.offerType === 'BUNDLE' ? 'bundles' : 'p';
  const slug =
    element.offerMappings?.[0]?.pageSlug ||
    element.catalogNs?.mappings?.[0]?.pageSlug ||
    (element.productSlug && element.productSlug.replace(/\/home$/, '')) ||
    element.urlSlug ||
    '';

  if (!slug) {
    return `https://store.epicgames.com/${locale}/browse?sortBy=releaseDate&sortDir=DESC&priceTier=tierFree`;
  }

  return `https://store.epicgames.com/${locale}/${type}/${slug}`;
}

type StoreApiResponse = {
  data: { Catalog: { searchStore: { elements: StoreElement[] } } };
};

export async function fetchFreeGames(): Promise<FreeGame[]> {
  const response = await egsStoreService
    .get<StoreApiResponse>('freeGamesPromotions', {
      searchParams: { locale: 'en-US', country: 'US', allowCountries: 'US' }
    })
    .json();

  const now = new Date();
  const games: FreeGame[] = [];

  for (const element of response.data.Catalog.searchStore.elements) {
    if (!element.promotions?.promotionalOffers?.length) continue;
    if (element.offerType === 'ADD_ON') continue;

    const activePromo = element.promotions.promotionalOffers
      .flatMap((p) => p.promotionalOffers)
      .find((offer) => {
        const start = new Date(offer.startDate);
        const end = new Date(offer.endDate);
        return (
          now >= start &&
          now <= end &&
          offer.discountSetting.discountPercentage === 0
        );
      });

    if (!activePromo) continue;
    if (element.price.totalPrice.discountPrice !== 0) continue;

    const tallImageTypes = [
      'OfferImageTall',
      'DieselStoreFrontTall',
      'DieselGameBoxTall',
      'Thumbnail',
      'DieselGameBox'
    ];
    const wideImageTypes = [
      'OfferImageWide',
      'DieselStoreFrontWide',
      'DieselGameBoxWide',
      'DieselGameBox',
      'Thumbnail'
    ];

    const pickImage = (types: string[]) =>
      types.reduce<string>((found, type) => {
        if (found) return found;
        return element.keyImages.find((img) => img.type === type)?.url ?? '';
      }, '') || (element.keyImages[0]?.url ?? '');

    const thumbnail = pickImage(tallImageTypes);
    const banner = pickImage(wideImageTypes) || thumbnail;

    games.push({
      title: element.title,
      id: element.id,
      namespace: element.namespace,
      description: element.description,
      thumbnail,
      banner,
      originalPrice: element.price.totalPrice.originalPrice,
      endDate: activePromo.endDate,
      storeUrl: buildStoreUrl(element)
    });
  }

  return games;
}
