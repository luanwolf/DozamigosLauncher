import { EpicAPIError } from '$lib/exceptions/EpicAPIError';
import { storefrontService } from '$lib/http';
import { getAuthedKy } from '$lib/modules/auth-session';
import { openCardPacks } from '$lib/modules/free-llamas';
import { composeMCP } from '$lib/modules/mcp';
import type { Locale } from '$lib/paraglide/runtime';
import { extractGrantedItems, type GrantedItem } from '$lib/utils/mcp-loot';
import { localizedOfferTitle } from '$lib/utils/stw-item-locale';
import { currencyDisplay, resolveStwTemplateDisplay } from '$lib/utils/stw-template-display';
import type { AccountData } from '$types/account';
import type { CampaignProfile, CommonCoreProfile, CommonCoreProfileAttributes } from '$types/game/mcp';
import type {
  StwCatalogPrice,
  StwPurchaseLimit,
  StwPurchaseLimitPeriod,
  StwStoreData,
  StwStoreOffer,
  StwStoreSection
} from '$types/game/stw-store';

const STW_STOREFRONTS = new Set(['CardPackStorePreroll', 'STWSpecialEventStorefront', 'STWRotationalEventStorefront']);

const LOCALE_HEADER: Record<string, string> = {
  'pt-br': 'pt-BR'
};

const GOLD_ICON = '/resources/eventcurrency_scaling.png';

type RawCatalogEntry = {
  offerId: string;
  devName: string;
  title?: string;
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  prices: {
    currencyType: string;
    currencySubType: string;
    regularPrice: number;
    finalPrice: number;
    basePrice: number;
  }[];
  requirements?: { requirementType: string; requiredId: string; minQuantity: number }[];
  itemGrants: { templateId: string; quantity: number }[];
  meta?: Record<string, string | number | boolean>;
  metaInfo?: { key: string; value: string | number | boolean }[];
};

type RawCatalog = {
  expiration: string;
  storefronts: { name: string; catalogEntries: RawCatalogEntry[] }[];
};

type PurchaseRecord = {
  offerId: string;
  purchaseDate: string;
  grantTemplateIds: string[];
};

type OwnedCatalogState = {
  templateIds: Set<string>;
  quantities: Map<string, number>;
};

type IntervalPurchases = {
  lastInterval: string;
  purchaseList: Record<string, number>;
};

type PurchaseContext = {
  purchaseRecords: PurchaseRecord[];
  /** offerId -> qty from EventPurchaseTracker items (STW event store). */
  eventPurchasesByOfferId: Record<string, number>;
  dailyPurchases: IntervalPurchases;
  weeklyPurchases: IntervalPurchases;
  monthlyPurchases: IntervalPurchases;
  now: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;

function metaValue(entry: RawCatalogEntry, key: string): string | undefined {
  const raw = entry.meta?.[key] ?? entry.metaInfo?.find((m) => m.key === key)?.value;
  if (raw == null || raw === '') return undefined;
  return String(raw).trim();
}

function buildPurchaseRecords(attributes: CommonCoreProfileAttributes): PurchaseRecord[] {
  const rawPurchases = attributes.mtx_purchase_history?.purchases ?? [];
  const records: PurchaseRecord[] = [];

  for (const purchase of rawPurchases) {
    if (purchase.refundDate) continue;

    records.push({
      offerId: purchase.offerId,
      purchaseDate: purchase.purchaseDate,
      grantTemplateIds: (purchase.lootResult ?? []).map((loot) => loot.itemType).filter(Boolean)
    });
  }

  return records;
}

/** STW event-store buys live on EventPurchaseTracker items, not fulfillmentCounts. */
function buildEventPurchasesByOfferId(commonCore: CommonCoreProfile): Record<string, number> {
  const byOffer: Record<string, number> = {};

  for (const item of Object.values(commonCore.items ?? {})) {
    if (!item.templateId.startsWith('EventPurchaseTracker:')) continue;
    const purchases = item.attributes?.event_purchases as Record<string, number> | undefined;
    if (!purchases) continue;

    for (const [offerId, qty] of Object.entries(purchases)) {
      byOffer[offerId] = (byOffer[offerId] ?? 0) + (qty ?? 0);
    }
  }

  return byOffer;
}

function emptyIntervalPurchases(): IntervalPurchases {
  return { lastInterval: '', purchaseList: {} };
}

function buildPurchaseContext(commonCore: CommonCoreProfile): PurchaseContext {
  const attributes = commonCore.stats.attributes;

  return {
    purchaseRecords: buildPurchaseRecords(attributes),
    eventPurchasesByOfferId: buildEventPurchasesByOfferId(commonCore),
    dailyPurchases: attributes.daily_purchases ?? emptyIntervalPurchases(),
    weeklyPurchases: attributes.weekly_purchases ?? emptyIntervalPurchases(),
    monthlyPurchases: attributes.monthly_purchases ?? emptyIntervalPurchases(),
    now: Date.now()
  };
}

function buildOwnedState(campaign: CampaignProfile): OwnedCatalogState {
  const templateIds = new Set<string>();
  const quantities = new Map<string, number>();

  for (const item of Object.values(campaign.items)) {
    templateIds.add(item.templateId);
    quantities.set(item.templateId, (quantities.get(item.templateId) ?? 0) + (item.quantity ?? 1));
  }

  return { templateIds, quantities };
}

function periodWindowMs(period: StwPurchaseLimitPeriod) {
  switch (period) {
    case 'daily':
      return DAY_MS;
    case 'weekly':
      return WEEK_MS;
    case 'monthly':
      return MONTH_MS;
    default:
      return 0;
  }
}

function countIntervalPurchases(entry: RawCatalogEntry, period: StwPurchaseLimitPeriod, ctx: PurchaseContext) {
  const list =
    period === 'daily'
      ? ctx.dailyPurchases.purchaseList
      : period === 'weekly'
        ? ctx.weeklyPurchases.purchaseList
        : period === 'monthly'
          ? ctx.monthlyPurchases.purchaseList
          : null;

  // Epic already scopes these lists to the current interval.
  if (list) return list[entry.offerId] ?? 0;

  // Fallback: mtx history window (rarely has STW gold buys).
  const windowMs = periodWindowMs(period);
  if (!windowMs) return 0;

  let count = 0;
  for (const purchase of ctx.purchaseRecords) {
    const age = ctx.now - new Date(purchase.purchaseDate).getTime();
    if (age >= windowMs) continue;
    if (purchase.offerId === entry.offerId) count++;
  }
  return count;
}

function hasEventPurchaseLimit(entry: RawCatalogEntry) {
  const eventLimitRaw = metaValue(entry, 'EventLimit');
  const eventLimit = eventLimitRaw ? Number.parseInt(eventLimitRaw, 10) : Number.NaN;
  return !Number.isNaN(eventLimit) && eventLimit > 0;
}

function parsePurchaseLimit(entry: RawCatalogEntry, ctx: PurchaseContext): StwPurchaseLimit {
  const limits: StwPurchaseLimit[] = [];

  const eventLimitRaw = metaValue(entry, 'EventLimit');
  const eventLimit = eventLimitRaw ? Number.parseInt(eventLimitRaw, 10) : Number.NaN;

  // STW gold event buys only land on EventPurchaseTracker — not fulfillmentCounts / mtx history / inventory.
  if (!Number.isNaN(eventLimit) && eventLimit > 0) {
    const purchased = ctx.eventPurchasesByOfferId[entry.offerId] ?? 0;
    limits.push({
      max: eventLimit,
      period: 'event',
      purchased,
      remaining: Math.max(0, eventLimit - purchased)
    });
  }

  if (entry.dailyLimit > 0) {
    const purchased = countIntervalPurchases(entry, 'daily', ctx);
    limits.push({
      max: entry.dailyLimit,
      period: 'daily',
      purchased,
      remaining: Math.max(0, entry.dailyLimit - purchased)
    });
  }

  if (entry.weeklyLimit > 0) {
    const purchased = countIntervalPurchases(entry, 'weekly', ctx);
    limits.push({
      max: entry.weeklyLimit,
      period: 'weekly',
      purchased,
      remaining: Math.max(0, entry.weeklyLimit - purchased)
    });
  }

  if (entry.monthlyLimit > 0) {
    const purchased = countIntervalPurchases(entry, 'monthly', ctx);
    limits.push({
      max: entry.monthlyLimit,
      period: 'monthly',
      purchased,
      remaining: Math.max(0, entry.monthlyLimit - purchased)
    });
  }

  if (!limits.length) {
    return { max: -1, period: 'none', purchased: 0, remaining: null };
  }

  return limits.reduce((strictest, current) =>
    (current.remaining ?? Number.POSITIVE_INFINITY) < (strictest.remaining ?? Number.POSITIVE_INFINITY)
      ? current
      : strictest
  );
}

function meetsRequireOwnership(entry: RawCatalogEntry, owned: OwnedCatalogState) {
  for (const req of entry.requirements ?? []) {
    if (req.requirementType !== 'RequireItemOwnership') continue;
    const required = req.requiredId;
    const minQuantity = req.minQuantity ?? 1;
    if ((owned.quantities.get(required) ?? 0) < minQuantity) return false;
  }
  return true;
}

function isDeniedByOwnership(entry: RawCatalogEntry, owned: OwnedCatalogState) {
  if (hasEventPurchaseLimit(entry)) return false;

  for (const req of entry.requirements ?? []) {
    if (req.requirementType !== 'DenyOnItemOwnership') continue;
    const required = req.requiredId;
    const minQuantity = req.minQuantity ?? 1;
    if ((owned.quantities.get(required) ?? 0) >= minQuantity) return true;
  }
  return false;
}

function pickGameItemPrice(entry: RawCatalogEntry): StwCatalogPrice | null {
  const price = entry.prices.find((p) => p.currencyType === 'GameItem' && p.currencySubType);
  if (!price) return null;

  return {
    currency: 'GameItem',
    currencySubType: price.currencySubType,
    finalPrice: price.finalPrice,
    regularPrice: price.regularPrice
  };
}

function parseOffer(
  storefront: string,
  entry: RawCatalogEntry,
  owned: OwnedCatalogState,
  locale: Locale,
  ctx: PurchaseContext
): StwStoreOffer | null {
  const price = pickGameItemPrice(entry);
  if (!price) return null;
  if (!meetsRequireOwnership(entry, owned)) return null;

  const limit = parsePurchaseLimit(entry, ctx);
  const ownedGrant = isDeniedByOwnership(entry, owned);
  const acquired = ownedGrant || limit.remaining === 0;

  const ownershipReq = entry.requirements?.find((r) => r.requirementType === 'DenyOnItemOwnership');
  const requiredTemplateId = ownershipReq?.requiredId;

  const grants = entry.itemGrants.map((grant) => ({
    templateId: grant.templateId,
    quantity: grant.quantity,
    display: resolveStwTemplateDisplay(grant.templateId, locale)
  }));

  const primaryTemplateId = grants[0]?.templateId;
  const fallbackName = grants[0]?.display.name ?? entry.devName;

  return {
    offerId: entry.offerId,
    devName: entry.devName,
    title: localizedOfferTitle(locale, {
      catalogTitle: entry.title,
      devName: entry.devName,
      primaryTemplateId,
      fallbackName
    }),
    storefront,
    price,
    requiredTemplateId,
    grants,
    limit,
    ownedHeroGrant: acquired || undefined
  };
}

function readCurrencyBalances(profile: CampaignProfile) {
  const balances: Record<string, number> = {};

  for (const item of Object.values(profile.items)) {
    if (!item.templateId.startsWith('AccountResource:') && !item.templateId.startsWith('Item:')) continue;
    const key = item.templateId.replace('AccountResource:', '').replace('Item:', '');
    balances[key] = (balances[key] ?? 0) + (item.quantity ?? 0);
  }

  return balances;
}

// ponytail: bridge Epic fulfillment key-drift until profile match is solid; wiped on catalog rotation
type ExhaustedBucket = { expiration: string; ids: string[] };

function exhaustedStorageKey(accountId: string) {
  return `dozamigos.stwExhausted.${accountId}`;
}

function readExhaustedOffers(accountId: string, expiration: string): Set<string> {
  try {
    const raw = localStorage.getItem(exhaustedStorageKey(accountId));
    if (!raw) return new Set();
    const bucket = JSON.parse(raw) as ExhaustedBucket;
    if (bucket.expiration !== expiration) return new Set();
    return new Set(bucket.ids);
  } catch {
    return new Set();
  }
}

/** Remember an offer as bought for this catalog rotation (survives refresh). */
export function rememberExhaustedStwOffer(accountId: string, expiration: string, offerId: string) {
  if (!accountId || !expiration || !offerId) return;
  try {
    const key = exhaustedStorageKey(accountId);
    const raw = localStorage.getItem(key);
    let bucket: ExhaustedBucket = raw ? (JSON.parse(raw) as ExhaustedBucket) : { expiration, ids: [] };
    if (bucket.expiration !== expiration) bucket = { expiration, ids: [] };
    if (!bucket.ids.includes(offerId)) bucket.ids.push(offerId);
    localStorage.setItem(key, JSON.stringify(bucket));
  } catch {
    // ignore quota / private mode
  }
}

export async function fetchStwStore(
  account: AccountData,
  campaign: CampaignProfile,
  commonCore: CommonCoreProfile,
  locale: Locale = 'pt-br'
): Promise<StwStoreData> {
  const epicLocale = LOCALE_HEADER[locale] ?? 'pt-BR';
  const purchaseContext = buildPurchaseContext(commonCore);

  const catalog = await getAuthedKy(account, storefrontService)
    .get<RawCatalog>('catalog', {
      headers: { 'X-EpicGames-Language': epicLocale }
    })
    .json();

  const owned = buildOwnedState(campaign);
  const exhausted = readExhaustedOffers(account.accountId, catalog.expiration);

  const sections: StwStoreSection[] = [];

  for (const storefront of catalog.storefronts) {
    if (!STW_STOREFRONTS.has(storefront.name)) continue;

    const offers = storefront.catalogEntries
      .map((entry) => parseOffer(storefront.name, entry, owned, locale, purchaseContext))
      .filter((offer): offer is StwStoreOffer => !!offer)
      .map((offer) => (exhausted.has(offer.offerId) ? { ...offer, ownedHeroGrant: true } : offer))
      .sort((a, b) => Number(!!a.ownedHeroGrant) - Number(!!b.ownedHeroGrant));

    if (!offers.length) continue;

    sections.push({
      id: storefront.name,
      name: storefront.name,
      offers
    });
  }

  return {
    expiration: catalog.expiration,
    sections,
    balances: readCurrencyBalances(campaign)
  };
}

export function getBalanceForOffer(balances: Record<string, number>, price: StwCatalogPrice) {
  const key = price.currencySubType.replace('AccountResource:', '');
  return balances[key] ?? 0;
}

export function priceLabel(price: StwCatalogPrice) {
  const display = currencyDisplay(price.currencySubType);
  const isGold = price.currencySubType.includes('eventcurrency_scaling');
  const isXrayTicket = price.currencySubType.includes('currency_xrayllama');
  const isUpgradeLlamaToken = price.currencySubType.includes('voucher_cardpack_bronze');
  return {
    ...display,
    imageUrl: isGold
      ? GOLD_ICON
      : isXrayTicket
        ? '/resources/currency_xrayllama.png'
        : isUpgradeLlamaToken
          ? '/resources/cardpack_bronze.png'
          : display.imageUrl
  };
}

export function maxPurchasableQuantity(offer: StwStoreOffer, balance: number) {
  const unitPrice = offer.price.finalPrice;
  if (unitPrice < 0) return 0;
  if (offer.ownedHeroGrant) return 0;

  const byBalance = unitPrice === 0 ? 1 : Math.floor(balance / unitPrice);
  if (byBalance < 1) return 0;

  if (offer.limit.remaining !== null) return Math.min(byBalance, offer.limit.remaining);
  if (offer.limit.max > 0) return Math.min(byBalance, Math.max(0, offer.limit.max - offer.limit.purchased));

  // No catalog cap — buy as many as the current currency balance allows.
  return byBalance;
}

async function runPurchase(
  account: AccountData,
  offer: StwStoreOffer,
  quantity: number,
  expectedTotalPrice: number
): Promise<GrantedItem[]> {
  // ponytail: ProfileId meta on preroll llamas is campaign, but PurchaseCatalogEntry only lives on common_core.
  const response = await composeMCP(account, 'PurchaseCatalogEntry', 'common_core', {
    offerId: offer.offerId,
    purchaseQuantity: quantity,
    currency: offer.price.currency,
    currencySubType: offer.price.currencySubType,
    expectedTotalPrice,
    gameContext: 'GameContext: Frontend.CatabaScreen'
  });

  const granted = extractGrantedItems(response);
  const packIds = granted
    .filter((item) => item.templateId.startsWith('CardPack:') && item.itemGuid)
    .map((item) => item.itemGuid!);

  if (!packIds.length) return granted;

  try {
    // Store llamas land in the profile sealed — the loot only exists once they're opened.
    return await openCardPacks(account, packIds);
  } catch {
    return granted;
  }
}

export async function purchaseStwOffer(
  account: AccountData,
  offer: StwStoreOffer,
  quantity = 1
): Promise<{ spent: number; currencySubType: string; quantity: number; received: GrantedItem[] }> {
  const expectedTotalPrice = offer.price.finalPrice * quantity;

  try {
    const received = await runPurchase(account, offer, quantity, expectedTotalPrice);
    return { spent: expectedTotalPrice, currencySubType: offer.price.currencySubType, quantity, received };
  } catch (error) {
    if (error instanceof EpicAPIError && error.errorCode.includes('catalog_out_of_date')) {
      const newUnitPrice = Number.parseInt(error.messageVars[1]);
      const newTotal = Number.isNaN(newUnitPrice) ? expectedTotalPrice : newUnitPrice * quantity;
      if (!Number.isNaN(newUnitPrice) && newTotal <= expectedTotalPrice) {
        const received = await runPurchase(account, offer, quantity, newTotal);
        return { spent: newTotal, currencySubType: offer.price.currencySubType, quantity, received };
      }
    }

    throw error;
  }
}

function isStackableStwGrant(offer: StwStoreOffer) {
  const id = offer.grants[0]?.templateId ?? '';
  return id.startsWith('AccountResource:') || id.startsWith('Item:');
}

/**
 * Buy up to `quantity` units. Stackables (perk/flux/resources) go 1-by-1 —
 * Epic weekly STW offers often reject purchaseQuantity > 1 in a single MCP call.
 */
export async function purchaseStwOfferMax(
  account: AccountData,
  offer: StwStoreOffer,
  quantity: number
): Promise<{ spent: number; currencySubType: string; quantity: number; received: GrantedItem[] }> {
  if (quantity < 1) {
    return { spent: 0, currencySubType: offer.price.currencySubType, quantity: 0, received: [] };
  }

  if (quantity === 1 || !isStackableStwGrant(offer)) {
    return purchaseStwOffer(account, offer, quantity);
  }

  let spent = 0;
  let bought = 0;
  let currencySubType = offer.price.currencySubType;
  const received: GrantedItem[] = [];

  for (let i = 0; i < quantity; i++) {
    try {
      const result = await purchaseStwOffer(account, offer, 1);
      spent += result.spent;
      bought += result.quantity;
      currencySubType = result.currencySubType;
      received.push(...result.received);
    } catch (error) {
      if (bought > 0) break;
      throw error;
    }
  }

  return { spent, currencySubType, quantity: bought, received };
}

function isOneShotOffer(offer: StwStoreOffer) {
  if (offer.requiredTemplateId) return true;
  if (offer.ownedHeroGrant) return true;
  return offer.grants.some((grant) => grant.templateId.startsWith('Hero:'));
}

/** Mark an offer as acquired (kept visible, not removed). */
export function removeOfferFromStore(store: StwStoreData, offerId: string): StwStoreData {
  const sections = store.sections.map((section) => ({
    ...section,
    offers: section.offers.map((o) =>
      o.offerId === offerId
        ? {
            ...o,
            ownedHeroGrant: true,
            limit: {
              ...o.limit,
              remaining: 0
            }
          }
        : o
    )
  }));

  return { ...store, sections };
}

export function applyPurchaseToStore(
  store: StwStoreData,
  offer: StwStoreOffer,
  spent: number,
  currencySubType: string,
  quantity: number
): StwStoreData {
  const key = currencySubType.replace('AccountResource:', '');
  const balances = { ...store.balances, [key]: (store.balances[key] ?? 0) - spent };

  const sections = store.sections.map((section) => ({
    ...section,
    offers: section.offers.map((o) => {
      if (o.offerId !== offer.offerId) return o;

      // Ownership / hero grants cannot be bought again — keep card as acquired.
      if (isOneShotOffer(o)) {
        return {
          ...o,
          ownedHeroGrant: true,
          limit: { ...o.limit, remaining: 0 }
        };
      }

      if (o.limit.remaining !== null) {
        const purchased = o.limit.purchased + quantity;
        const remaining = Math.max(0, o.limit.remaining - quantity);
        return {
          ...o,
          ownedHeroGrant: remaining === 0 ? true : o.ownedHeroGrant,
          limit: { ...o.limit, purchased, remaining }
        };
      }

      if (o.limit.max > 0) {
        const purchased = o.limit.purchased + quantity;
        const remaining = Math.max(0, o.limit.max - purchased);
        return {
          ...o,
          ownedHeroGrant: remaining === 0 ? true : o.ownedHeroGrant,
          limit: { ...o.limit, purchased, remaining }
        };
      }

      return o;
    })
  }));

  return { ...store, balances, sections };
}
