import ky from 'ky';

export type FreeGame = {
  title: string;
  id: string;
  namespace: string;
  description: string;
  cover: string;
  originalPrice: number;
  currentPrice: number;
  endDate: string;
  storeUrl: string;
};

type StorePromotion = {
  startDate: string;
  endDate: string;
  discountSetting: { discountPercentage: number };
};

type SlugMapping = { pageSlug?: string; pageType?: string };

export type StoreElement = {
  title: string;
  id: string;
  namespace: string;
  offerType: string;
  description?: string;
  productSlug?: string | null;
  urlSlug?: string | null;
  offerMappings?: SlugMapping[] | null;
  catalogNs?: { mappings?: SlugMapping[] | null } | null;
  price: { totalPrice: { discountPrice: number; originalPrice: number } };
  promotions: { promotionalOffers: { promotionalOffers: StorePromotion[] }[] } | null;
  keyImages: { type: string; url: string }[];
};

const LOCALE = 'pt-BR';
const STORE = ky.create({
  prefixUrl: 'https://store-site-backend-static-ipv4.ak.epicgames.com',
  timeout: 20_000,
  headers: { 'User-Agent': 'DozamigosDiscordBot/0.1.0' }
});

export function buildStoreUrl(element: StoreElement, locale = LOCALE): string {
  const type = element.offerType === 'BUNDLE' ? 'bundles' : 'p';
  const slug =
    element.offerMappings?.[0]?.pageSlug ||
    element.catalogNs?.mappings?.[0]?.pageSlug ||
    (element.productSlug && element.productSlug.replace(/\/home$/, '')) ||
    element.urlSlug ||
    '';
  if (!slug) return `https://store.epicgames.com/${locale}/free-games`;
  return `https://store.epicgames.com/${locale}/${type}/${slug}`;
}

export function buildStorePurchaseUrl(games: { namespace: string; id: string }[]): string {
  if (!games.length) return `https://store.epicgames.com/${LOCALE}/free-games`;
  const offers = games.map((g) => `offers=1-${g.namespace}-${g.id}`).join('&');
  return `https://www.epicgames.com/store/purchase?highlightColor=0078f2&${offers}&orderId&purchaseToken&showNavigation=true`;
}

export function buildExchangeClaimUrl(exchangeCode: string, redirectUrl: string): string {
  const url = new URL('https://www.epicgames.com/id/exchange');
  url.searchParams.set('exchangeCode', exchangeCode);
  url.searchParams.set('redirectUrl', redirectUrl);
  return url.toString();
}

function pickImage(images: StoreElement['keyImages'], types: string[]) {
  for (const type of types) {
    const hit = images.find((img) => img.type === type);
    if (hit?.url) return hit.url;
  }
  return images[0]?.url ?? '';
}

export function parseFreeGames(elements: StoreElement[], now = new Date()): FreeGame[] {
  const games: FreeGame[] = [];
  for (const element of elements) {
    if (!element.promotions?.promotionalOffers?.length) continue;
    if (element.offerType === 'ADD_ON') continue;
    if (element.price.totalPrice.discountPrice !== 0) continue;

    const activePromo = element.promotions.promotionalOffers
      .flatMap((p) => p.promotionalOffers)
      .find((offer) => {
        const start = new Date(offer.startDate);
        const end = new Date(offer.endDate);
        return now >= start && now <= end && offer.discountSetting.discountPercentage === 0;
      });
    if (!activePromo) continue;

    games.push({
      title: element.title,
      id: element.id,
      namespace: element.namespace,
      description: (element.description ?? '').trim(),
      cover: pickImage(element.keyImages, [
        'OfferImageWide',
        'DieselStoreFrontWide',
        'DieselGameBoxWide',
        'OfferImageTall',
        'DieselStoreFrontTall',
        'DieselGameBoxTall',
        'Thumbnail',
        'DieselGameBox'
      ]),
      originalPrice: element.price.totalPrice.originalPrice,
      currentPrice: element.price.totalPrice.discountPrice,
      endDate: activePromo.endDate,
      storeUrl: buildStoreUrl(element)
    });
  }
  return games;
}

type StoreApiResponse = {
  data: { Catalog: { searchStore: { elements: StoreElement[] } } };
};

export async function fetchFreeGames(): Promise<FreeGame[]> {
  const response = await STORE.get('freeGamesPromotions', {
    searchParams: { locale: LOCALE, country: 'BR', allowCountries: 'BR' }
  }).json<StoreApiResponse>();
  return parseFreeGames(response.data.Catalog.searchStore.elements);
}

export function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function fitDiscordUrl(url: string, fallback: string) {
  return url.length <= 512 ? url : fallback;
}
