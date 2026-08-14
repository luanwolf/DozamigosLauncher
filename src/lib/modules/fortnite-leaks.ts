import { fortniteApiService } from '$lib/http';

const LOCALE_TO_FN_LANG: Record<string, string> = {
  'pt-br': 'pt-BR'
};

type FnApiCosmetic = {
  id: string;
  name: string;
  type: { displayValue: string };
  rarity: { value: string; displayValue: string };
  series?: { value: string };
  images: { smallIcon?: string; icon?: string; featured?: string };
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

export type LeakedCosmetic = {
  id: string;
  name: string;
  type: string;
  rarity: string;
  rarityValue: string;
  series?: string;
  image: string;
  added: string;
};

export type LeaksData = {
  lastUpdated: string;
  build: string;
  previousBuild: string;
  lastBrAddition: string;
  cosmetics: LeakedCosmetic[];
};

function mapCosmetic(item: FnApiCosmetic): LeakedCosmetic {
  return {
    id: item.id,
    name: item.name,
    type: item.type.displayValue,
    rarity: item.rarity.displayValue,
    rarityValue: item.rarity.value.toLowerCase(),
    series: item.series?.value,
    image: item.images.featured ?? item.images.icon ?? item.images.smallIcon ?? '',
    added: item.added
  };
}

/**
 * Fetches cosmetics newly discovered in the latest Fortnite game build.
 * Source: fortnite-api.com v2/cosmetics/new (diff between current and previous build).
 */
export async function fetchFortniteLeaks(locale?: string): Promise<LeaksData> {
  const language = (locale && LOCALE_TO_FN_LANG[locale]) || 'pt-BR';
  const response = await fortniteApiService
    .get<FnApiNewCosmeticsResponse>('v2/cosmetics/new', { searchParams: { language } })
    .json();

  const cosmetics = (response.data.items.br ?? [])
    .map(mapCosmetic)
    .sort((a, b) => new Date(b.added).getTime() - new Date(a.added).getTime());

  return {
    lastUpdated: response.data.date,
    build: response.data.build,
    previousBuild: response.data.previousBuild,
    lastBrAddition: response.data.lastAdditions.br,
    cosmetics
  };
}
