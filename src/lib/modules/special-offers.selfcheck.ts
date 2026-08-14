import assert from 'node:assert/strict';
import { parseSpecialOffers } from './special-offers';

// Shapes copied from a live BR response of the Epic catalog service.
const elements = [
  {
    id: 'pack-1',
    title: 'Pacote de Tarefas Toque de Ouro',
    description: 'A femme fatale favorecida pela fortuna.',
    status: 'ACTIVE',
    currentPrice: 6199,
    price: 6199,
    currencyCode: 'BRL',
    expiryDate: '2026-08-16T00:00:00.000Z',
    urlSlug: 'fortnite--golden-touch-quest-pack',
    keyImages: [
      { type: 'OfferImageWide', url: 'https://cdn/wide' },
      { type: 'OfferImageTall', url: 'https://cdn/tall' }
    ]
  },
  {
    id: 'pack-2',
    title: 'Pacote Ás',
    status: 'ACTIVE',
    currentPrice: 1699,
    price: 3199,
    currencyCode: 'BRL',
    expiryDate: '2026-08-20T00:00:00.000Z',
    urlSlug: 'fortnite--s5-starter-pack',
    keyImages: [{ type: 'Thumbnail', url: 'https://cdn/thumb' }]
  },
  {
    id: 'crew',
    title: 'Clube Fortnite',
    status: 'ACTIVE',
    currentPrice: 3800,
    price: 3800,
    currencyCode: 'BRL',
    urlSlug: 'fortnite--crew',
    categories: [{ path: 'subscription' }, { path: 'addons/durable' }],
    keyImages: []
  },
  {
    id: 'vbucks',
    title: '800 V-Bucks',
    status: 'ACTIVE',
    currentPrice: 3199,
    price: 3199,
    currencyCode: 'BRL',
    urlSlug: 'fortnite--800-v-bucks-core',
    categories: [{ path: 'points/packs' }, { path: 'addons/consumable' }],
    keyImages: []
  },
  { id: 'free', title: 'Fortnite', status: 'ACTIVE', currentPrice: 0, urlSlug: 'fortnite' },
  { id: 'gone', title: 'Antigo', status: 'SUNSET', currentPrice: 999, urlSlug: 'antigo' }
];

const offers = parseSpecialOffers(elements);

// Free experiences and retired offers are not purchases, and V-Bucks have their own page.
assert.deepEqual(
  offers.map((offer) => offer.id),
  ['pack-1', 'pack-2', 'crew']
);

assert.equal(offers[0]!.price, 61.99);
assert.equal(offers[0]!.basePrice, undefined);
assert.equal(offers[0]!.image, 'https://cdn/tall');
assert.equal(offers[1]!.basePrice, 31.99);
assert.match(offers[0]!.epicUrl, /fortnite--golden-touch-quest-pack$/);
assert.match(offers[1]!.psnUrl, /Pacote%20%C3%81s$/);

console.log('special-offers.selfcheck: ok');
