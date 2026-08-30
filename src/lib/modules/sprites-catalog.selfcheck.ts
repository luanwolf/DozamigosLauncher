import { strict as assert } from 'node:assert';
import { mapApiSpriteFamilyId, spriteShortName } from './sprites';
import { applySpriteLocaleFile, fallbackCatalog, resolveSpriteLabel } from './sprites-catalog';
assert.equal(mapApiSpriteFamilyId('KlomboSprite'), 'klombo');
assert.equal(mapApiSpriteFamilyId('EightBitBlasterSprite'), 'eight-bit');
assert.equal(mapApiSpriteFamilyId('StormScoutSprite'), 'storm-scout');
assert.equal(mapApiSpriteFamilyId('NarrowfleaSprite'), 'sonic');
assert.equal(mapApiSpriteFamilyId('UnknownSprite'), null);

const base = fallbackCatalog();
const merged = applySpriteLocaleFile(base, {
  sprites: {
    klombo: { name: 'Elemental Klombo traduzido', ability: 'Habilidade custom' },
    sonic: { name: 'Elemental Sonic' }
  }
});
assert.equal(merged.names.klombo, 'Elemental Klombo traduzido');
assert.equal(merged.abilities.klombo, 'Habilidade custom');
assert.equal(merged.sources.klombo, 'locale-file');
assert.equal(merged.names.sonic, 'Elemental Sonic');
assert.equal(merged.sources.jonesy, 'fallback');

const labeled = resolveSpriteLabel(
  'klombo',
  { name: 'Elemental Klimbo', ability: 'fallback' },
  { names: { klombo: 'Elemental Klombo' }, abilities: { klombo: 'api ability' }, sources: { klombo: 'locale-file' } }
);
assert.equal(labeled.name, 'Elemental Klombo');
assert.equal(labeled.ability, 'api ability');

const pt = applySpriteLocaleFile(fallbackCatalog(), {
  sprites: { killswitch: { name: 'Elemental Disruptor' }, 'storm-scout': { name: 'Elemental Meteorológico' } }
});
assert.equal(
  spriteShortName(resolveSpriteLabel('killswitch', { name: 'Elemental Killswitch', ability: '' }, pt).name),
  'Disruptor'
);
assert.equal(
  spriteShortName(resolveSpriteLabel('storm-scout', { name: 'Elemental Storm Scout', ability: '' }, pt).name),
  'Meteorológico'
);

console.log('sprites-catalog self-check passed');
