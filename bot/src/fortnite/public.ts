import { fortniteApi } from '@/fortnite/http';

export const FN_LANG = 'pt-BR';

export type ShopOffer = {
  offerId: string;
  name: string;
  price: number;
  image: string;
  rarity: string;
  series?: string;
  outDate: string;
};

export type ShopData = {
  lastUpdated: string;
  offers: ShopOffer[];
};

type FnApiShop = {
  data: {
    date: string;
    entries: {
      offerId: string;
      finalPrice: number;
      outDate: string;
      regularPrice: number;
      layout?: { name?: string };
      bundle?: { name?: string; image?: string };
      newDisplayAsset?: { renderImages?: { image: string }[] };
      brItems?: {
        name: string;
        rarity?: { value: string };
        series?: { backendValue: string };
        images?: { featured?: string; icon?: string; smallIcon?: string };
      }[];
    }[];
  };
};

export async function fetchShop(): Promise<ShopData> {
  const response = await fortniteApi.get('v2/shop', { searchParams: { language: FN_LANG } }).json<FnApiShop>();
  const offers: ShopOffer[] = [];
  for (const entry of response.data.entries) {
    const br = entry.brItems?.[0];
    const image =
      entry.bundle?.image ||
      br?.images?.featured ||
      entry.newDisplayAsset?.renderImages?.[0]?.image ||
      br?.images?.icon ||
      br?.images?.smallIcon ||
      '';
    offers.push({
      offerId: entry.offerId,
      name: entry.bundle?.name || br?.name || entry.layout?.name || 'Item',
      price: entry.finalPrice,
      image,
      rarity: (br?.rarity?.value ?? 'common').toLowerCase(),
      series: br?.series?.backendValue?.toLowerCase(),
      outDate: entry.outDate
    });
  }
  return { lastUpdated: response.data.date, offers };
}

export function isLeavingToday(outDate: string, now = Date.now()): boolean {
  if (!outDate) return false;
  const out = new Date(outDate).getTime();
  return out > now && out - now <= 86_400_000;
}

export type CosmeticMeta = {
  id: string;
  name: string;
  rarity: string;
  series?: string;
  icon: string;
  smallIcon: string;
};

let cosmeticsCache: { map: Map<string, CosmeticMeta>; at: number } | null = null;

export async function fetchCosmeticsBr(): Promise<Map<string, CosmeticMeta>> {
  if (cosmeticsCache && Date.now() - cosmeticsCache.at < 15 * 60_000) return cosmeticsCache.map;
  const response = await fortniteApi
    .get('v2/cosmetics/br', { searchParams: { language: FN_LANG } })
    .json<{ data: { id: string; name: string; rarity?: { value: string }; series?: { backendValue: string }; images?: { icon?: string; smallIcon?: string } }[] }>();
  const map = new Map<string, CosmeticMeta>();
  for (const item of response.data) {
    map.set(item.id.toLowerCase(), {
      id: item.id,
      name: item.name,
      rarity: item.rarity?.value?.toLowerCase() ?? 'common',
      series: item.series?.backendValue?.toLowerCase(),
      icon: item.images?.icon ?? item.images?.smallIcon ?? '',
      smallIcon: item.images?.icon ?? item.images?.smallIcon ?? ''
    });
  }
  cosmeticsCache = { map, at: Date.now() };
  return map;
}

export async function fetchMapPoisUrl(): Promise<string> {
  const response = await fortniteApi
    .get('v1/map', { searchParams: { language: FN_LANG } })
    .json<{ data: { images: { pois: string } } }>();
  return response.data.images.pois;
}

export type LeakedCosmetic = {
  id: string;
  name: string;
  rarity: string;
  series?: string;
  image: string;
  added: string;
};

export async function fetchLeaks(): Promise<{ build: string; cosmetics: LeakedCosmetic[] }> {
  const response = await fortniteApi
    .get('v2/cosmetics/new', { searchParams: { language: FN_LANG } })
    .json<{
      data: {
        build: string;
        items: {
          br: {
            id: string;
            name: string;
            rarity: { value: string };
            series?: { value: string };
            images: { featured?: string; icon?: string; smallIcon?: string };
            added: string;
          }[];
        };
      };
    }>();
  const cosmetics = (response.data.items.br ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    rarity: item.rarity.value.toLowerCase(),
    series: item.series?.value,
    image: item.images.featured ?? item.images.icon ?? item.images.smallIcon ?? '',
    added: item.added
  }));
  return { build: response.data.build, cosmetics };
}

export function groupLeaksByDay(cosmetics: LeakedCosmetic[]) {
  const byDay = new Map<string, LeakedCosmetic[]>();
  for (const item of cosmetics) {
    const key = item.added.slice(0, 10);
    const list = byDay.get(key) ?? [];
    list.push(item);
    byDay.set(key, list);
  }
  return [...byDay.entries()].sort(([a], [b]) => (a < b ? 1 : -1));
}

export type SeasonInfo = {
  name: string;
  seasonNumber: number;
  daysRemaining?: number;
  progressPercent?: number;
};

export async function fetchSeasonInfo(): Promise<SeasonInfo> {
  const news = await fortniteApi
    .get('v2/news/br', { searchParams: { language: FN_LANG } })
    .json<{ data: { motds: { title: string; hidden?: boolean }[] } }>()
    .catch(() => null);
  const motd = news?.data.motds.find((item) => !item.hidden && /^Fortnite:\s*\S/i.test(item.title));
  const name = motd
    ? motd.title.replace(/^Fortnite:\s*/i, '').replace(/\s+(?:chegou|já chegou|is here)!?$/i, '').trim()
    : 'Temporada atual';
  return { name, seasonNumber: 0 };
}

export async function fetchServerStatus(): Promise<{ fortnite: string; epic: string }> {
  const [light, page] = await Promise.all([
    (async () => {
      const { getAccessTokenUsingClientCredentials } = await import('@/fortnite/auth');
      const { lightswitchService } = await import('@/fortnite/http');
      const token = await getAccessTokenUsingClientCredentials();
      const data = await lightswitchService
        .get('Fortnite/status', { headers: { Authorization: `Bearer ${token.access_token}` } })
        .json<{ status?: string }[] | { status?: string }>();
      const row = Array.isArray(data) ? data[0] : data;
      return row?.status ?? 'UNKNOWN';
    })().catch(() => 'UNKNOWN'),
    (async () => {
      const { http } = await import('@/fortnite/http');
      const data = await http.get('https://status.epicgames.com/api/v2/summary.json').json<{ status?: { description?: string } }>();
      return data.status?.description ?? 'n/d';
    })().catch(() => 'n/d')
  ]);
  return { fortnite: light, epic: page };
}
