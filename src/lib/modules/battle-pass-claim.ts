import { storefrontService } from '$lib/http';
import { getAuthedKy } from '$lib/modules/auth-session';
import { clientQuestLogin, composeMCP, queryProfile } from '$lib/modules/mcp';
import {
  parseBattlePassClaimStatus,
  parseBattlePassOffersFromCatalog,
  type BattlePassClaimStatus,
  type BattlePassOffer
} from '$lib/modules/battle-pass-claim-parse';
import type { AccountData } from '$types/account';
import type { FullQueryProfile } from '$types/game/mcp';

export {
  parseBattlePassClaimStatus,
  parseBattlePassOffersFromCatalog,
  type BattlePassClaimStatus,
  type BattlePassOffer
} from '$lib/modules/battle-pass-claim-parse';

export type BattlePassAccountSnapshot = BattlePassClaimStatus & {
  offers: BattlePassOffer[];
};

type RawCatalogEntry = {
  offerId: string;
  devName?: string;
  title?: string;
  prices?: {
    currencyType: string;
    currencySubType: string;
    finalPrice: number;
  }[];
  itemGrants?: { templateId: string; quantity: number }[];
};

type RawCatalog = {
  storefronts: { name: string; catalogEntries: RawCatalogEntry[] }[];
};

function statusFromAthena(athena: FullQueryProfile<'athena'>): BattlePassClaimStatus {
  const profile = athena.profileChanges[0].profile;
  return parseBattlePassClaimStatus(profile.stats.attributes, profile.items);
}

function ownedTemplateIds(athena: FullQueryProfile<'athena'>): Set<string> {
  const ids = new Set<string>();
  for (const item of Object.values(athena.profileChanges[0].profile.items)) {
    ids.add(item.templateId.toLowerCase());
  }
  return ids;
}

async function fetchCatalog(account: AccountData): Promise<RawCatalog> {
  return getAuthedKy(account, storefrontService).get<RawCatalog>('catalog').json();
}

export async function fetchBattlePassSnapshot(account: AccountData): Promise<BattlePassAccountSnapshot> {
  const athena = await queryProfile(account, 'athena');
  const status = statusFromAthena(athena);

  let offers: BattlePassOffer[] = [];
  try {
    const catalog = await fetchCatalog(account);
    offers = parseBattlePassOffersFromCatalog(catalog.storefronts, ownedTemplateIds(athena));
  } catch {
    // Catalog is optional — status still useful; claim will surface the error.
    offers = [];
  }

  return { ...status, offers };
}

const EMPTY_ADDITIONAL = {
  islandId: '',
  islandTitle: '',
  productTag: 'Product.FNE.Hub',
  storeContext: '',
  sourceContext: '',
  checkoutProperties: {},
  itemShopFilterContext: { activeFilters: [] as string[], inactiveFilters: [] as string[] },
  storefront: '',
  storeId: '',
  groupId: ''
};

/**
 * Spends battle stars on one or more pass offers (same MCP the game uses for page claims).
 * Returns refreshed status + remaining catalog offers.
 */
export async function claimBattlePassOffers(
  account: AccountData,
  offerIds: string[],
  seasonPassTemplateId?: string | null
): Promise<BattlePassAccountSnapshot> {
  if (!offerIds.length) {
    throw new Error('Nenhuma oferta selecionada para resgatar.');
  }

  const athena = await clientQuestLogin(account, 'athena');
  const status = statusFromAthena(athena);
  const templateId = seasonPassTemplateId || status.seasonPassTemplateId;

  if (templateId) {
    await composeMCP(account, 'ExchangeGameCurrencyForSeasonPassOffer', 'athena', {
      offerItemIdList: offerIds,
      seasonPassTemplateId: templateId,
      additionalData: EMPTY_ADDITIONAL
    });
  } else {
    await composeMCP(account, 'ExchangeGameCurrencyForBattlePassOffer', 'athena', {
      offerItemIdList: offerIds,
      additionalData: EMPTY_ADDITIONAL
    });
  }

  return fetchBattlePassSnapshot(account);
}
