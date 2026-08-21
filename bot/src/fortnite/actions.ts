import type { AccountData } from '@/fortnite/clients';
import { authed } from '@/fortnite/auth';
import { clientQuestLogin, composeMCP, queryProfile } from '@/fortnite/mcp';
import { storefrontService } from '@/fortnite/http';

export type BattlePassStatus = {
  level: number;
  purchased: boolean;
  seasonNum: number;
  battleStars: number;
  seasonPassTemplateId: string | null;
  offers: { offerId: string; title: string; price: number }[];
};

export function findSeasonPassTemplateId(items: Record<string, { templateId: string }>, seasonNum?: number) {
  const seasons = Object.values(items)
    .map((i) => i.templateId)
    .filter((t) => /^AthenaSeason:athenaseason\d+$/i.test(t));
  if (!seasons.length) return null;
  if (seasonNum != null) {
    const exact = seasons.find((t) => t.toLowerCase() === `athenaseason:athenaseason${seasonNum}`);
    if (exact) return exact;
  }
  seasons.sort((a, b) => Number(b.match(/(\d+)$/)?.[1] ?? 0) - Number(a.match(/(\d+)$/)?.[1] ?? 0));
  return seasons[0] ?? null;
}

export async function fetchBattlePass(account: AccountData): Promise<BattlePassStatus> {
  const athena = await queryProfile(account, 'athena');
  const attrs = athena.profileChanges[0]!.profile.stats.attributes;
  const items = athena.profileChanges[0]!.profile.items;
  const seasonNum = Number(attrs.season_num ?? 0);
  const owned = new Set(Object.values(items).map((i) => i.templateId.toLowerCase()));
  let offers: BattlePassStatus['offers'] = [];
  try {
    const catalog = await authed(account, storefrontService)
      .get('catalog')
      .json<{ storefronts: { name: string; catalogEntries: { offerId: string; title?: string; devName?: string; prices?: { currencyType: string; currencySubType: string; finalPrice: number }[]; itemGrants?: { templateId: string }[] }[] }[] }>();
    for (const sf of catalog.storefronts) {
      if (!/battlepass|seasonpass|br.?pass/i.test(sf.name)) continue;
      for (const entry of sf.catalogEntries) {
        const price = entry.prices?.find((p) => p.currencyType === 'GameItem');
        if (!price) continue;
        const grants = entry.itemGrants ?? [];
        if (grants.every((g) => owned.has(g.templateId.toLowerCase()))) continue;
        offers.push({
          offerId: entry.offerId,
          title: entry.title || entry.devName || entry.offerId,
          price: price.finalPrice
        });
      }
    }
  } catch {
    offers = [];
  }
  return {
    level: Number(attrs.book_level ?? 0),
    purchased: !!attrs.book_purchased,
    seasonNum,
    battleStars: Number(attrs.battlestars ?? 0),
    seasonPassTemplateId: findSeasonPassTemplateId(items, seasonNum),
    offers
  };
}

export async function claimBattlePassOffers(account: AccountData, offerIds: string[], seasonPassTemplateId?: string | null) {
  await clientQuestLogin(account, 'athena');
  const additionalData = {
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
  if (seasonPassTemplateId) {
    await composeMCP(account, 'ExchangeGameCurrencyForSeasonPassOffer', 'athena', {
      offerItemIdList: offerIds,
      seasonPassTemplateId,
      additionalData
    });
  } else {
    await composeMCP(account, 'ExchangeGameCurrencyForBattlePassOffer', 'athena', {
      offerItemIdList: offerIds,
      additionalData
    });
  }
}

export async function claimMfa(account: AccountData, stw: boolean) {
  const res = await composeMCP<{ profileRevision: number; profileChangesBaseRevision: number }>(
    account,
    'ClaimMfaEnabled',
    'common_core',
    { bClaimForStw: stw }
  );
  if (res.profileRevision < res.profileChangesBaseRevision) throw new Error('MFA_CLAIM_FAILED');
}

export async function redeemCode(account: AccountData, code: string) {
  const { fulfillmentService } = await import('@/fortnite/http');
  const clean = encodeURIComponent(code.toUpperCase().replaceAll('-', '').replaceAll('_', '').trim());
  return authed(account, fulfillmentService)
    .post(`accounts/${account.accountId}/codes/${clean}`, { json: {} })
    .json<{ items?: unknown[] }>();
}

export async function lookupCreator(name: string) {
  const { fortniteApi } = await import('@/fortnite/http');
  try {
    const response = await fortniteApi
      .get('v2/creatorcode', { searchParams: { name: name.trim() } })
      .json<{ status: number; data?: { code?: string; account?: { id?: string; name?: string } } }>();
    if (response.status !== 200 || !response.data?.account?.id) return null;
    return {
      code: response.data.code || name.trim(),
      accountId: response.data.account.id,
      displayName: response.data.account.name || name.trim()
    };
  } catch {
    return null;
  }
}

export async function setCreator(account: AccountData, code: string) {
  await composeMCP(account, 'SetAffiliateName', 'common_core', { affiliateName: code });
}

export async function currentCreator(account: AccountData) {
  const core = await queryProfile(account, 'common_core');
  const attrs = core.profileChanges[0]!.profile.stats.attributes;
  return String(attrs.mtx_affiliate ?? '');
}
