import { isHTTPError } from 'ky';
import { launcherAppClient2 } from '$lib/constants/clients';
import { egsGraphqlService } from '$lib/http';
import { getAuthedKy } from '$lib/modules/auth-session';
import type { FreeGame } from '$lib/modules/free-games';
import type { AccountData } from '$types/account';

const GET_CATALOG_OFFER_HASH = 'abafd6e0aa80535c43676f533f0283c7f5214a59e9fae6ebfb37bed1b1bb2e9b';
const GET_MAPPING_BY_PAGE_SLUG_HASH = '781fd69ec8116125fa8dc245c0838198cdf5283e31647d08dfa27f45ee8b1f30';

export type ResolvedStoreOffer = {
  offerId: string;
  namespace: string;
};

type CatalogOffer = {
  id: string;
  namespace: string;
  price?: { totalPrice: { discountPrice: number } };
  expiryDate?: string | null;
};

async function storeGraphql<T>(
  account: AccountData,
  operationName: string,
  variables: object,
  sha256Hash: string
): Promise<T | null> {
  try {
    return await getAuthedKy(account, egsGraphqlService, launcherAppClient2)
      .get<T>('', {
        searchParams: {
          operationName,
          variables: JSON.stringify(variables),
          extensions: JSON.stringify({ persistedQuery: { version: 1, sha256Hash } })
        }
      })
      .json();
  } catch (error) {
    // Store GraphQL rejects launcher tokens (403) — not fatal for claim flow.
    if (isHTTPError(error) && (error.response.status === 403 || error.response.status === 401)) {
      return null;
    }
    return null;
  }
}

function isFreeCatalogOffer(offer: CatalogOffer): boolean {
  if (offer.price?.totalPrice?.discountPrice !== 0) return false;
  if (offer.expiryDate && new Date(offer.expiryDate) < new Date()) return false;
  return true;
}

function pageSlugFromStoreUrl(storeUrl: string): string | undefined {
  const match = storeUrl.match(/\/(?:p|bundles)\/([^/?#]+)/);
  return match?.[1];
}

async function fetchCatalogOffer(
  account: AccountData,
  namespace: string,
  offerId: string,
  country: 'BR' | 'US'
): Promise<CatalogOffer | null> {
  const body = await storeGraphql<{
    data?: { Catalog?: { catalogOffer?: CatalogOffer } };
    errors?: { message: string }[];
  }>(
    account,
    'getCatalogOffer',
    { locale: 'pt-BR', country, offerId, sandboxId: namespace },
    GET_CATALOG_OFFER_HASH
  );

  if (!body) return null;

  const offer = body.data?.Catalog?.catalogOffer;
  if (!offer || !isFreeCatalogOffer(offer)) return null;
  return offer;
}

async function fetchOfferFromPageSlug(account: AccountData, pageSlug: string): Promise<ResolvedStoreOffer | null> {
  const body = await storeGraphql<{
    data?: {
      StorePageMapping?: {
        mapping?: {
          mappings?: { offer?: { id: string; namespace: string } };
        };
      };
    };
  }>(account, 'getMappingByPageSlug', { pageSlug, locale: 'pt-BR' }, GET_MAPPING_BY_PAGE_SLUG_HASH);

  if (!body) return null;

  const offer = body.data?.StorePageMapping?.mapping?.mappings?.offer;
  if (!offer?.id || !offer?.namespace) return null;

  const catalogOffer = await fetchCatalogOffer(account, offer.namespace, offer.id, 'BR');
  if (!catalogOffer) return null;

  return { offerId: catalogOffer.id, namespace: catalogOffer.namespace };
}

/** Best-effort alternate offer id; returns null when store GraphQL is unavailable. */
export async function tryResolveClaimOffer(account: AccountData, game: FreeGame): Promise<ResolvedStoreOffer | null> {
  for (const country of ['BR', 'US'] as const) {
    const fromCatalog = await fetchCatalogOffer(account, game.namespace, game.id, country);
    if (fromCatalog) {
      return { offerId: fromCatalog.id, namespace: fromCatalog.namespace };
    }
  }

  const pageSlug = pageSlugFromStoreUrl(game.storeUrl);
  if (pageSlug) {
    return fetchOfferFromPageSlug(account, pageSlug);
  }

  return null;
}
