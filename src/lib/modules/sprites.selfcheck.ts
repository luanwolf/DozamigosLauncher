import { strict as assert } from 'node:assert';
import {
  parseSpriteProgress,
  readSpriteCollection,
  SPRITE_ENTRIES,
  SPRITE_FAMILIES,
  spriteShortName,
  writeSpriteCollection
} from './sprites';

assert.equal(SPRITE_FAMILIES.length, 12);
assert.equal(SPRITE_ENTRIES.length, 36);
assert.equal(new Set(SPRITE_ENTRIES.map((entry) => entry.key)).size, SPRITE_ENTRIES.length);
assert.equal(SPRITE_FAMILIES.find((f) => f.slug === 'sonic')?.name, 'Elemental Sonic');
assert.equal(SPRITE_FAMILIES.find((f) => f.slug === 'klombo')?.rarity, 'mythic');
assert.equal(SPRITE_FAMILIES.every((f) => f.name.startsWith('Elemental')), true);
assert.equal(SPRITE_FAMILIES.every((f) => f.variants.includes('cheat-master')), true);
assert.equal(spriteShortName('Elemental Sonic'), 'Sonic');
assert.equal(spriteShortName('Elemental Storm Scout'), 'Storm Scout');
assert.equal(spriteShortName('Elemental 8-Bit'), '8-Bit');

const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value)
} as Storage;

writeSpriteCollection(
  'account-a',
  ['sonic:base', 'klombo:gold', 'nao-existe:base'],
  ['klombo:gold', 'nao-existe:base']
);
assert.deepEqual(readSpriteCollection('account-a'), {
  extracted: ['sonic:base', 'klombo:gold'],
  mastered: ['klombo:gold']
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
          a: quest('Quest:quest_s42_spritemastery_p01_q01', 'Claimed'),
          b: quest('Quest:quest_s42_spritemastery_p01_q01a', 'Claimed'),
          c: quest('Quest:quest_s42_spritemastery_p01_q01b', 'Active'),
          d: quest(
            'Quest:quest_s42_spritemastery_redeem_p01_q01',
            'Claimed',
            'CosmeticVariantToken:vtid_backpack_coldtrophy_narrowflea'
          ),
          e: quest(
            'Quest:quest_s42_spritemastery_redeem_p01_q01a',
            'Claimed',
            'CosmeticVariantToken:vtid_backpack_coldtrophy_narrowflea_gold'
          ),
          f: quest(
            'Quest:quest_s42_spritemastery_redeem_p01_q01b',
            'Active',
            'CosmeticVariantToken:vtid_backpack_coldtrophy_narrowflea_cheatmaster'
          ),
          g: quest('Quest:quest_s42_spritemastery_p01_q02', 'Active'),
          h: quest(
            'Quest:quest_s42_spritemastery_redeem_p01_q02',
            'Active',
            'CosmeticVariantToken:vtid_backpack_coldtrophy_klombo'
          ),
          i: quest('Quest:quest_s42_bpquests_p01_q01', 'Claimed')
        }
      }
    }
  ]
});

assert.deepEqual([...progress.mastered].sort(), ['sonic:base', 'sonic:gold']);
assert.deepEqual([...progress.extracted], ['sonic']);

console.log(`sprites self-check passed (${SPRITE_ENTRIES.length} entries)`);
