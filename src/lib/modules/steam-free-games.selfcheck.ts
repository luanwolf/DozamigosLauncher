import { strict as assert } from 'node:assert';
import { parseSteamFreeGames } from './steam-free-games-parse';

const html = `
  <a href="https://store.steampowered.com/app/214340/Deponia/" data-ds-appid="214340"
     class="search_result_row">
    <img src="https://shared.fastly.steamstatic.com/steam/apps/214340/capsule_231x87.jpg?t=1">
    <span class="title">Deponia &amp; Friends</span>
    <div data-price-final="0">
      <div data-discount="100">
        <div class="discount_original_price">R$ 19,99</div>
      </div>
    </div>
  </a>
  <a data-ds-appid="10" class="search_result_row">
    <img src="paid.jpg"><span class="title">Pago</span>
    <div data-price-final="499" data-discount="75"></div>
  </a>
`;

assert.deepEqual(parseSteamFreeGames(html), [
  {
    appId: '214340',
    title: 'Deponia & Friends',
    image: 'https://shared.fastly.steamstatic.com/steam/apps/214340/capsule_231x87.jpg?t=1',
    banner: 'https://shared.fastly.steamstatic.com/steam/apps/214340/header.jpg?t=1',
    originalPrice: 'R$ 19,99',
    storeUrl: 'https://store.steampowered.com/app/214340/'
  }
]);

// eslint-disable-next-line no-console
console.log('steam-free-games selfcheck ok');
