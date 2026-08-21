import { buildStorePurchaseUrl, buildStoreUrl, formatBRL, parseFreeGames, type StoreElement } from '@/fortnite/free-games';

const now = new Date('2026-08-21T12:00:00Z');

const live: StoreElement = {
  title: 'Hades',
  id: 'offer-hades',
  namespace: 'hades-ns',
  offerType: 'BASE_GAME',
  productSlug: 'hades',
  price: { totalPrice: { discountPrice: 0, originalPrice: 2499 } },
  promotions: {
    promotionalOffers: [
      {
        promotionalOffers: [
          {
            startDate: '2026-08-20T00:00:00Z',
            endDate: '2026-08-28T15:00:00Z',
            discountSetting: { discountPercentage: 0 }
          }
        ]
      }
    ]
  },
  keyImages: [{ type: 'OfferImageTall', url: 'https://cdn.example/hades.png' }],
  description: 'Um roguelike'
};

const upcoming: StoreElement = {
  ...live,
  id: 'later',
  title: 'Later',
  promotions: {
    promotionalOffers: [
      {
        promotionalOffers: [
          {
            startDate: '2026-09-01T00:00:00Z',
            endDate: '2026-09-08T00:00:00Z',
            discountSetting: { discountPercentage: 0 }
          }
        ]
      }
    ]
  }
};

const addon: StoreElement = { ...live, id: 'dlc', offerType: 'ADD_ON', title: 'DLC' };
const paid: StoreElement = {
  ...live,
  id: 'paid',
  price: { totalPrice: { discountPrice: 999, originalPrice: 2499 } }
};

const games = parseFreeGames([live, upcoming, addon, paid], now);
if (games.length !== 1) throw new Error(`count ${games.length}`);
if (games[0]?.title !== 'Hades') throw new Error('title');
if (games[0]?.storeUrl !== 'https://store.epicgames.com/pt-BR/p/hades') throw new Error(games[0]?.storeUrl ?? 'url');
if (!games[0]?.cover.includes('hades.png')) throw new Error('cover');
if (games[0]?.originalPrice !== 2499) throw new Error('original');
if (games[0]?.currentPrice !== 0) throw new Error('current');
if (formatBRL(2499) !== 'R$\xa024,99' && formatBRL(2499) !== 'R$ 24,99') {
  const got = formatBRL(2499);
  if (!got.includes('24,99')) throw new Error(`brl ${got}`);
}

if (buildStoreUrl({ ...live, offerType: 'BUNDLE', offerMappings: [{ pageSlug: 'pack' }] }) !== 'https://store.epicgames.com/pt-BR/bundles/pack') {
  throw new Error('bundle slug');
}

const purchase = buildStorePurchaseUrl(games);
if (!purchase.includes('offers=1-hades-ns-offer-hades')) throw new Error(purchase);

process.stdout.write('free-games.selfcheck ok\n');
