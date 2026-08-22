/** Pure helpers for Battle Pass status / catalog claim parsing. */

export type BattlePassClaimStatus = {
  level: number;
  xp: number;
  purchased: boolean;
  seasonNum: number;
  battleStars: number;
  seasonPassTemplateId: string | null;
};

export type BattlePassOffer = {
  offerId: string;
  title: string;
  storefront: string;
  price: number;
  currencySubType: string;
  grantTemplateIds: string[];
};

type BattlePassAttrs = {
  book_level?: number;
  book_xp?: number;
  book_purchased?: boolean;
  season_num?: number;
  battlestars?: number;
};

type ProfileItemLike = {
  templateId: string;
  quantity?: number;
  attributes?: Record<string, unknown>;
};

/** AthenaSeason:athenaseason41 → prefer the live season matching season_num. */
export function findSeasonPassTemplateId(
  items: Record<string, ProfileItemLike> | null | undefined,
  seasonNum?: number
): string | null {
  if (!items) return null;

  const seasons: string[] = [];
  for (const item of Object.values(items)) {
    const tid = item.templateId;
    if (/^AthenaSeason:athenaseason\d+$/i.test(tid)) seasons.push(tid);
  }
  if (!seasons.length) return null;

  if (seasonNum != null) {
    const exact = seasons.find((t) => t.toLowerCase() === `athenaseason:athenaseason${seasonNum}`);
    if (exact) return exact;
  }

  // Highest season number wins when profile is mid-migration.
  seasons.sort((a, b) => {
    const na = Number(a.match(/(\d+)$/)?.[1] ?? 0);
    const nb = Number(b.match(/(\d+)$/)?.[1] ?? 0);
    return nb - na;
  });
  return seasons[0] ?? null;
}

export function parseBattlePassClaimStatus(
  attributes: BattlePassAttrs,
  items?: Record<string, ProfileItemLike> | null
): BattlePassClaimStatus {
  const seasonNum = attributes.season_num ?? 0;
  return {
    level: attributes.book_level ?? 0,
    xp: attributes.book_xp ?? 0,
    purchased: !!attributes.book_purchased,
    seasonNum,
    battleStars: attributes.battlestars ?? 0,
    seasonPassTemplateId: findSeasonPassTemplateId(items, seasonNum)
  };
}

/** Battle-star (or similar GameItem) prices on BR pass storefronts. */
export function isBattleStarPrice(currencyType: string, currencySubType: string): boolean {
  if (currencyType !== 'GameItem') return false;
  const sub = currencySubType.toLowerCase();
  return (
    sub.includes('battlestar') ||
    sub.includes('athenabattlestar') ||
    sub.includes('seasonxp') ||
    sub.includes('stylepoint')
  );
}

export function isPassStorefrontName(name: string): boolean {
  return /pass|season|battle.?star|br.?season/i.test(name);
}

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

/**
 * Pull claimable GameItem (battle star) offers from Epic's storefront catalog.
 * Page rewards live in season assets — catalog may only expose a subset (levels/packs).
 */
export function parseBattlePassOffersFromCatalog(
  storefronts: { name: string; catalogEntries: RawCatalogEntry[] }[],
  ownedTemplateIds: Set<string>
): BattlePassOffer[] {
  const out: BattlePassOffer[] = [];

  for (const sf of storefronts) {
    if (!isPassStorefrontName(sf.name)) continue;

    for (const entry of sf.catalogEntries ?? []) {
      const price = (entry.prices ?? []).find((p) =>
        isBattleStarPrice(p.currencyType, p.currencySubType ?? '')
      );
      if (!price || price.finalPrice < 0) continue;

      const grants = (entry.itemGrants ?? []).map((g) => g.templateId).filter(Boolean);
      // Skip if every grant is already owned (already claimed / purchased).
      if (grants.length && grants.every((id) => ownedTemplateIds.has(id.toLowerCase()))) continue;

      out.push({
        offerId: entry.offerId,
        title: entry.title || entry.devName || entry.offerId,
        storefront: sf.name,
        price: price.finalPrice,
        currencySubType: price.currencySubType,
        grantTemplateIds: grants
      });
    }
  }

  return out;
}
