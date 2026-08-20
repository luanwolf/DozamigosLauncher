const LOCALE_TO_FN_LANG: Record<string, string> = {
  'pt-br': 'pt-BR'
};

type FnApiVariantOption = {
  tag: string;
  name: string;
  image?: string;
};

type FnApiCosmetic = {
  id: string;
  name: string;
  type: { displayValue: string };
  rarity: { value: string; displayValue: string };
  series?: { value: string };
  images: { smallIcon?: string; icon?: string; featured?: string };
  variants?: { options?: FnApiVariantOption[] }[];
  added: string;
};

type FnApiNewCosmeticsResponse = {
  status: number;
  data: {
    date: string;
    build: string;
    previousBuild: string;
    lastAdditions: { br: string };
    items: { br: FnApiCosmetic[] };
  };
};

type FnApiAesResponse = {
  status: number;
  data: {
    mainKey?: string;
    build?: string;
  };
};

export type LeakedStyle = {
  name: string;
  image: string;
};

export type LeakedCosmetic = {
  id: string;
  name: string;
  type: string;
  rarity: string;
  rarityValue: string;
  series?: string;
  image: string;
  styles: LeakedStyle[];
  added: string;
};

export type LeaksData = {
  lastUpdated: string;
  build: string;
  previousBuild: string;
  lastBrAddition: string;
  aesKey: string | null;
  cosmetics: LeakedCosmetic[];
};

export type LeakDayGroup = {
  dateKey: string;
  items: LeakedCosmetic[];
};

function mapStyles(item: FnApiCosmetic): LeakedStyle[] {
  return (item.variants ?? [])
    .flatMap((variant) => variant.options ?? [])
    .flatMap((option) => (option.image ? [{ name: option.name || option.tag, image: option.image }] : []));
}

function mapCosmetic(item: FnApiCosmetic): LeakedCosmetic {
  return {
    id: item.id,
    name: item.name,
    type: item.type.displayValue,
    rarity: item.rarity.displayValue,
    rarityValue: item.rarity.value.toLowerCase(),
    series: item.series?.value,
    image: item.images.featured ?? item.images.icon ?? item.images.smallIcon ?? '',
    styles: mapStyles(item),
    added: item.added
  };
}

/** Groups leaks by UTC calendar day of `added`, newest first. */
export function groupLeaksByDay(cosmetics: LeakedCosmetic[]): LeakDayGroup[] {
  const byDay = new Map<string, LeakedCosmetic[]>();

  for (const item of cosmetics) {
    const dateKey = item.added.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
    const list = byDay.get(dateKey);
    if (list) list.push(item);
    else byDay.set(dateKey, [item]);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([dateKey, items]) => ({
      dateKey,
      items: [...items].sort((a, b) => new Date(b.added).getTime() - new Date(a.added).getTime())
    }));
}

export function formatLeakDayLabel(dateKey: string, locale = 'pt-BR') {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return dateKey;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

async function fetchAesKey(): Promise<string | null> {
  try {
    const { fortniteApiService } = await import('$lib/http');
    const response = await fortniteApiService.get<FnApiAesResponse>('v2/aes').json();
    return response.data.mainKey?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Fetches cosmetics newly discovered in the latest Fortnite game build.
 * Source: fortnite-api.com v2/cosmetics/new (diff between current and previous build).
 */
export async function fetchFortniteLeaks(locale?: string): Promise<LeaksData> {
  // Dynamic import keeps pure helpers (groupByDay) runnable in Bun/tsx selfchecks.
  const { fortniteApiService } = await import('$lib/http');
  const language = (locale && LOCALE_TO_FN_LANG[locale]) || 'pt-BR';
  const [response, aesKey] = await Promise.all([
    fortniteApiService
      .get<FnApiNewCosmeticsResponse>('v2/cosmetics/new', { searchParams: { language } })
      .json(),
    fetchAesKey()
  ]);

  const cosmetics = (response.data.items.br ?? [])
    .map(mapCosmetic)
    .sort((a, b) => new Date(b.added).getTime() - new Date(a.added).getTime());

  return {
    lastUpdated: response.data.date,
    build: response.data.build,
    previousBuild: response.data.previousBuild,
    lastBrAddition: response.data.lastAdditions.br,
    aesKey,
    cosmetics
  };
}
