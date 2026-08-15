import { strict as assert } from 'node:assert';
import {
  parseSpriteProgress,
  readSpriteCollection,
  SPRITE_ENTRIES,
  SPRITE_FAMILIES,
  spriteShortName,
  writeSpriteCollection
} from './sprites';

assert.equal(SPRITE_FAMILIES.length, 25);
assert.equal(SPRITE_ENTRIES.length, 118);
assert.equal(new Set(SPRITE_ENTRIES.map((entry) => entry.key)).size, SPRITE_ENTRIES.length);
assert.equal(SPRITE_FAMILIES.find((f) => f.slug === 'water')?.name, 'Elemental de Água');
assert.equal(SPRITE_FAMILIES.find((f) => f.slug === 'zero-point')?.name, 'Elemental do Ponto Zero');
assert.equal(SPRITE_FAMILIES.every((f) => f.name.startsWith('Elemental')), true);
assert.equal(spriteShortName('Elemental de Água'), 'Água');
assert.equal(spriteShortName('Elemental Ceifador'), 'Ceifador');
assert.equal(spriteShortName('Elemental dos Sete'), 'Sete');

const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value)
} as Storage;

writeSpriteCollection(
  'account-a',
  ['water:base', 'fire:gold', 'nao-existe:base'],
  ['fire:gold', 'nao-existe:base']
);
assert.deepEqual(readSpriteCollection('account-a'), {
  extracted: ['water:base', 'fire:gold'],
  mastered: ['fire:gold']
});
assert.deepEqual(readSpriteCollection('account-b'), { extracted: [], mastered: [] });

const quest = (templateId: string, quest_state: string, reward?: string) => ({
  templateId,
  attributes: { quest_state, premium_rewards: reward ? { rewards: [{ templateId: reward }] } : undefined }
});

const progress = parseSpriteProgress({
  profileChanges: [
    {
      profile: {
        items: {
          // Water: base + galaxy redeemed, 2 of 3 Mastery stages done.
          a: quest('Quest:quest_s41_spritemastery_p01_q01', 'Claimed'),
          b: quest('Quest:quest_s41_spritemastery_p01_q01a', 'Claimed'),
          c: quest('Quest:quest_s41_spritemastery_p01_q01b', 'Active'),
          d: quest(
            'Quest:quest_s41_spritemastery_redeem_p01_q01',
            'Claimed',
            'CosmeticVariantToken:vtid_backpack_coldtrophy_water'
          ),
          e: quest(
            'Quest:quest_s41_spritemastery_redeem_p01_q01a',
            'Claimed',
            'CosmeticVariantToken:vtid_backpack_coldtrophy_water_galaxy'
          ),
          f: quest(
            'Quest:quest_s41_spritemastery_redeem_p01_q01b',
            'Active',
            'CosmeticVariantToken:vtid_backpack_coldtrophy_water_gold'
          ),
          // Earth: known Sprite, no stage done yet.
          g: quest('Quest:quest_s41_spritemastery_p01_q02', 'Active'),
          h: quest(
            'Quest:quest_s41_spritemastery_redeem_p01_q02',
            'Active',
            'CosmeticVariantToken:vtid_backpack_coldtrophy_earth'
          ),
          i: quest('Quest:quest_s41_bpquests_p01_q01', 'Claimed')
        }
      }
    }
  ]
});

assert.deepEqual([...progress.mastered].sort(), ['water:base', 'water:galaxy']);
assert.deepEqual([...progress.extracted], ['water']);

console.log(`sprites self-check passed (${SPRITE_ENTRIES.length} entries)`);
