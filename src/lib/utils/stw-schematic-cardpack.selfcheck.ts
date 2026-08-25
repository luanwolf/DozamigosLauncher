import assert from 'node:assert/strict';
import { isGhostLlamaOffer, schematicCardPackImage } from './stw-schematic-cardpack';

assert.equal(schematicCardPackImage('cardpack_schematic_r'), '/resources/voucher_generic_schematic_r.png');
assert.equal(schematicCardPackImage('cardpack_schematic_vr'), '/resources/voucher_generic_schematic_vr.png');
assert.equal(schematicCardPackImage('cardpack_bronze'), null);
assert.equal(schematicCardPackImage('cardpack_cache_schematic_r'), '/resources/voucher_generic_schematic_r.png');

assert.equal(isGhostLlamaOffer('CardPackStorePreroll', { price: { finalPrice: 0 } }), true);
assert.equal(isGhostLlamaOffer('CardPackStorePreroll', { price: { finalPrice: 1 } }), true);
assert.equal(isGhostLlamaOffer('CardPackStorePreroll', { price: { finalPrice: 50 } }), false);
assert.equal(isGhostLlamaOffer('STWSpecialEventStorefront', { price: { finalPrice: 0 } }), false);

console.log('stw-schematic-cardpack.selfcheck: ok');
