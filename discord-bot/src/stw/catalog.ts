import { storefrontService } from '@/core/http';
import { getAuthedKy } from '@/core/auth-session';
import { queryProfile } from '@/core/mcp';
import { localizedOfferTitle } from '@/stw/locale/offer-title';
import { toLocale } from '@/stw/locale/types';
import { resolveStwTemplateDisplay, stwRarityColor, stwStorefrontLabel } from '@/stw/template-display';
import type { AccountData } from '@/core/types';

const STW_STOREFRONTS = new Set(['STWSpecialEventStorefront', 'STWRotationalEventStorefront']);
const ITEMS_PER_PAGE = 6;

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
    finalPrice: number;
  }[];
  requirements?: { requirementType: string; requiredId: string; minQuantity: number }[];
  itemGrants: { templateId: string; quantity: number }[];
};

type RawCatalog = {
  expiration: string;
  storefronts: { name: string; catalogEntries: RawCatalogEntry[] }[];
};

export type StwStoreOffer = {
  offerId: string;
  title: string;
  price: number;
  quantity: number;
  imagePath: string;
  rarityColor: string;
  limitRemaining: number | null;
};

export type StwStoreSection = {
  id: string;
  name: string;
  offers: StwStoreOffer[];
};

export type StwStoreData = {
  expiration: string;
  gold: number;
  sections: StwStoreSection[];
};

function pickGoldPrice(entry: RawCatalogEntry) {
  return entry.prices.find((p) => p.currencyType === 'GameItem' && p.currencySubType);
}

function parseOffer(entry: RawCatalogEntry, locale: string): StwStoreOffer | null {
  const price = pickGoldPrice(entry);
  if (!price) return null;

  const grant = entry.itemGrants[0];
  if (!grant) return null;

  const display = resolveStwTemplateDisplay(grant.templateId);
  const title = localizedOfferTitle(toLocale(locale), {
    catalogTitle: entry.title,
    devName: entry.devName,
    primaryTemplateId: grant.templateId,
    fallbackName: display.name
  });

  const limit = entry.dailyLimit || entry.weeklyLimit || entry.monthlyLimit;

  return {
    offerId: entry.offerId,
    title,
    price: price.finalPrice,
    quantity: grant.quantity,
    imagePath: display.imagePath,
    rarityColor: stwRarityColor(display.rarity),
    limitRemaining: limit > 0 ? limit : null
  };
}

export async function fetchStwStore(account: AccountData, locale = 'pt'): Promise<StwStoreData> {
  const epicLocale = locale === 'pt' ? 'pt-BR' : locale;

  const [catalog, campaign] = await Promise.all([
    getAuthedKy(account, storefrontService)
      .get<RawCatalog>('catalog', { headers: { 'X-EpicGames-Language': epicLocale } })
      .json(),
    queryProfile<{
      profileChanges: {
        profile: {
          items: Record<string, { templateId: string; quantity: number }>;
          stats: { attributes: { event_currency?: Record<string, number> } };
        };
      }[];
    }>(account, 'campaign')
  ]);

  const profile = campaign.profileChanges[0].profile;
  const gold = profile.stats.attributes.event_currency?.eventcurrency_scaling ?? 0;

  const sections: StwStoreSection[] = [];
  for (const storefront of catalog.storefronts) {
    if (!STW_STOREFRONTS.has(storefront.name)) continue;
    const offers = storefront.catalogEntries
      .map((e) => parseOffer(e, locale))
      .filter((o): o is StwStoreOffer => !!o);
    if (!offers.length) continue;
    sections.push({ id: storefront.name, name: stwStorefrontLabel(storefront.name), offers });
  }

  return { expiration: catalog.expiration, gold, sections };
}

export function getStwPageItems(section: StwStoreSection, page: number) {
  const start = page * ITEMS_PER_PAGE;
  return section.offers.slice(start, start + ITEMS_PER_PAGE);
}

export function getStwPageCount(section: StwStoreSection) {
  return Math.max(1, Math.ceil(section.offers.length / ITEMS_PER_PAGE));
}

export function stwOfferToGridCard(offer: StwStoreOffer) {
  return {
    name: offer.quantity > 1 ? `${offer.title} ×${offer.quantity}` : offer.title,
    priceLabel: String(offer.price),
    priceIcon: 'gold' as const,
    imagePath: offer.imagePath,
    backgroundColor: offer.rarityColor
  };
}

export { ITEMS_PER_PAGE };
