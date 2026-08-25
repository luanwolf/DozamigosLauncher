import assert from 'node:assert/strict';
import { rarityBackgroundSlug } from './locker-export-rarity';

assert.equal(rarityBackgroundSlug({ rarity: 'legendary' }), 'legendary');
assert.equal(rarityBackgroundSlug({ rarity: 'epic', series: 'iconseries' }), 'icon');
assert.equal(rarityBackgroundSlug({ rarity: 'epic', series: 'Série Ícones' }), 'icon');
assert.equal(rarityBackgroundSlug({ rarity: 'epic', series: 'Série Lendas dos Jogos' }), 'gaminglegends');
assert.equal(rarityBackgroundSlug({ rarity: 'epic', series: 'Série do Clube' }), 'crew');

console.log('locker-export-rarity self-check passed');
