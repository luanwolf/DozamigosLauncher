export type VbucksPack = {
  id: string;
  amount: number;
  priceBrl: number;
  bonusPercent?: number;
  storeUrl: string;
  /** Accent color for card top border (hex). */
  accentColor: string;
};

/** Official Fortnite V-Bucks packs (BRL reference prices from Epic Games Brasil). */
export const VBUCKS_PACKS = [
  {
    id: '800',
    amount: 800,
    priceBrl: 31.99,
    storeUrl: 'https://store.epicgames.com/pt-BR/p/fortnite--800-v-bucks-core',
    accentColor: '#4a7fd4'
  },
  {
    id: '2400',
    amount: 2400,
    priceBrl: 78.99,
    bonusPercent: 17,
    storeUrl: 'https://store.epicgames.com/pt-BR/p/fortnite--2400-v-bucks-core',
    accentColor: '#7c5cbf'
  },
  {
    id: '4500',
    amount: 4500,
    priceBrl: 124.99,
    bonusPercent: 37,
    storeUrl: 'https://store.epicgames.com/pt-BR/p/fortnite--4500-v-bucks-core',
    accentColor: '#c45c2a'
  },
  {
    id: '12500',
    amount: 12500,
    priceBrl: 313.99,
    bonusPercent: 56,
    storeUrl: 'https://store.epicgames.com/pt-BR/p/fortnite--12500-v-bucks',
    accentColor: '#2d8a4e'
  }
] as const satisfies readonly VbucksPack[];

export const VBUCKS_SHOP_URL = 'https://store.epicgames.com/pt-BR/collection/v-bucks';
