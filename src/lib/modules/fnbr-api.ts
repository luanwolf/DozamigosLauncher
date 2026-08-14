import { fnbrApiService } from '$lib/http';
import { isFnbrApiConfigured } from '$lib/env';

export type FnbrPriceIcon = 'vbucks' | 'vbook' | 'vip' | 'fip' | 'og_vip' | false;

export type FnbrCosmetic = {
  id: string;
  name: string;
  price: string;
  priceIcon: FnbrPriceIcon;
  priceIconLink?: string | false;
  images: {
    icon?: string | false;
    png?: string | false;
    gallery?: string | false;
    featured?: string | false;
    resizeAvailable?: boolean;
  };
  rarity: string;
  type: string;
  slug: string;
  readableType: string;
  description: string;
  legoAssoc?: string | false;
};

type FnbrListResponse<T> = {
  status: number;
  data: T;
};

type FnbrShopResponse = FnbrListResponse<{
  date: string;
  featured: FnbrCosmetic[];
  daily: FnbrCosmetic[];
}>;

type FnbrStatsResponse = {
  totalCosmetics: number;
  matrix: {
    type: string;
    rarity: { rarity: string; count: number }[];
  }[];
  unreleased: number;
};

export async function fetchFnbrShop(): Promise<FnbrShopResponse['data']> {
  const response = await fnbrApiService.get<FnbrShopResponse>('shop').json();
  return response.data;
}

export async function fetchFnbrStats(): Promise<FnbrStatsResponse> {
  return fnbrApiService.get<FnbrStatsResponse>('stats').json();
}

export async function fetchFnbrUpcoming(): Promise<FnbrCosmetic[]> {
  const response = await fnbrApiService.get<FnbrListResponse<FnbrCosmetic[]>>('upcoming').json();
  return response.data ?? [];
}

export { isFnbrApiConfigured };
