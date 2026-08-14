const CATALOG_URL = 'https://catalog-public-service-prod06.ol.epicgames.com/catalog/api/shared/namespace/fn/offers';
const EPIC_STORE_BASE = 'https://store.epicgames.com/pt-BR/p/';
/**
 * ponytail: the Epic catalog carries no PlayStation SKU, so the PSN button is a
 * store search for the pack title. Upgrade path: PSN's own catalog API, which
 * needs a hashed operation id that changes with every store release.
 */
const PSN_SEARCH_BASE = 'https://store.playstation.com/pt-br/search/';

export type SpecialOffer = {
  id: string;
  title: string;
  description: string;
  image: string;
  /** Already in currency units, e.g. 61.99 — not cents. */
  price: number;
  /** Only set when the offer is discounted. */
  basePrice?: number;
  currency: string;
  /** ISO date when a limited-time offer leaves the store. */
  endsAt?: string;
  epicUrl: string;
  psnUrl: string;
};

type RawOffer = {
  id?: string;
  title?: string;
  description?: string;
  status?: string;
  categories?: { path?: string }[];
  currentPrice?: number;
  price?: number;
  currencyCode?: string;
  expiryDate?: string;
  urlSlug?: string;
  keyImages?: { type?: string; url?: string }[];
};

const IMAGE_PRIORITY = ['OfferImageTall', 'Thumbnail', 'CodeRedemption_340x440', 'OfferImageWide', 'featuredMedia'];

function pickImage(offer: RawOffer): string {
  const images = offer.keyImages ?? [];
  for (const type of IMAGE_PRIORITY) {
    const match = images.find((image) => image.type === type && image.url);
    if (match?.url) return match.url;
  }
  return images.find((image) => image.url)?.url ?? '';
}

/** V-Bucks bundles live in their own page, so they are dropped here. */
function isCurrencyPack(offer: RawOffer) {
  return (offer.categories ?? []).some((category) => category.path?.startsWith('points'));
}

/**
 * Keeps the offers you can actually buy with money and puts the ones that
 * expire first, since those are the "special" ones the store highlights.
 */
export function parseSpecialOffers(elements: RawOffer[]): SpecialOffer[] {
  return elements
    .flatMap((offer): SpecialOffer[] => {
      const price = offer.currentPrice ?? 0;
      if (offer.status !== 'ACTIVE' || price <= 0 || !offer.id || !offer.title || !offer.urlSlug) return [];
      if (isCurrencyPack(offer)) return [];

      const listPrice = offer.price ?? price;

      return [
        {
          id: offer.id,
          title: offer.title,
          description: offer.description ?? '',
          image: pickImage(offer),
          // ponytail: catalog prices are minor units and we only ask for BR,
          // whose currency has 2 decimals. Revisit if other countries land.
          price: price / 100,
          basePrice: listPrice > price ? listPrice / 100 : undefined,
          currency: offer.currencyCode || 'BRL',
          endsAt: offer.expiryDate,
          epicUrl: `${EPIC_STORE_BASE}${offer.urlSlug}`,
          psnUrl: `${PSN_SEARCH_BASE}${encodeURIComponent(offer.title)}`
        }
      ];
    })
    .sort((a, b) => {
      if (!!a.endsAt !== !!b.endsAt) return a.endsAt ? -1 : 1;
      if (a.endsAt && b.endsAt) return a.endsAt.localeCompare(b.endsAt);
      return a.price - b.price;
    });
}

export async function fetchSpecialOffers(): Promise<SpecialOffer[]> {
  const { epicService } = await import('$lib/http');
  const { getAccessTokenUsingClientCredentials } = await import('$lib/modules/authentication');

  // A client token is enough here — no account needed — and it is cheap to mint.
  const { access_token } = await getAccessTokenUsingClientCredentials();

  const catalog = await epicService
    .get<{ elements: RawOffer[] }>(CATALOG_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
      searchParams: {
        status: 'ACTIVE',
        count: 100,
        country: 'BR',
        locale: 'pt-BR',
        sortBy: 'effectiveDate',
        sortDir: 'DESC'
      }
    })
    .json();

  return parseSpecialOffers(catalog.elements ?? []);
}
