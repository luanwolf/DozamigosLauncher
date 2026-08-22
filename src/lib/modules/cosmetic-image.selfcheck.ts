import assert from 'node:assert/strict';
import { fortniteApiCosmeticIconUrl, pickCosmeticImage } from './cosmetic-image';

assert.equal(pickCosmeticImage('feat', 'render', 'icon', 'small'), 'feat');
assert.equal(
  pickCosmeticImage(undefined, 'https://x/render.png', 'https://x/icon.png', 'https://x/smallicon.png'),
  'https://x/render.png'
);
assert.equal(pickCosmeticImage('', undefined, 'https://x/icon.png', 'https://x/smallicon.png'), 'https://x/icon.png');
assert.equal(pickCosmeticImage(), '');
assert.equal(
  fortniteApiCosmeticIconUrl('Backpack_Season_42'),
  'https://fortnite-api.com/images/cosmetics/br/Backpack_Season_42/icon.png'
);

console.log('cosmetic-image.selfcheck: ok');
