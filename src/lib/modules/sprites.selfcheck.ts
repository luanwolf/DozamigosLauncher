import { strict as assert } from 'node:assert';
import {
  parseSpriteProgress,
  readSpriteCollection,
  SPRITE_ENTRIES,
  SPRITE_FAMILIES,
  spriteShortName,
  writeSpriteCollection
} from './sprites';
import {
  parseSpriteLevels,
  parseSpriteResources,
  flattenMagpie,
  parseCreatureSpriteId,
  parseRelicId,
  SPRITE_GIZMO_CATALOG
} from './sprites-account';

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

const resourceProfile = {
  profileChanges: [
    {
      profile: {
        items: {
          a: { templateId: 'Currency:SpriteDust', quantity: 140 },
          b: { templateId: 'Item:AthenaGizmo_PortableExtractor', quantity: 4 },
          c: { templateId: 'Item:AthenaGizmo_CheatCodeLocator', quantity: 2 },
          d: { templateId: 'Item:AthenaGizmo_SpicyTaco', quantity: 4 },
          e: { templateId: 'Item:AthenaGizmo_LlamaSupplyDrop', quantity: 2 },
          f: { templateId: 'Item:AthenaGizmo_ExtractionAccelerator', quantity: 2 }
        },
        stats: { attributes: {} }
      }
    }
  ]
};

const resources = parseSpriteResources(resourceProfile);
assert.equal(SPRITE_GIZMO_CATALOG.length, 5);
assert.equal(resources.dust, 140);
assert.equal(resources.gizmos.length, 5);
assert.ok(resources.gizmos.every((g) => SPRITE_GIZMO_CATALOG.some((c) => c.id === g.id)));
assert.ok(resources.gizmos.some((g) => g.id === 'portable-extractor' && g.quantity === 4));
assert.ok(resources.gizmos.some((g) => g.id === 'cheat-code-locator' && g.quantity === 2));
assert.ok(resources.gizmos.some((g) => g.id === 'spicy-taco' && g.quantity === 4));
assert.ok(resources.gizmos.some((g) => g.id === 'llama-supply-drop' && g.quantity === 2));
assert.ok(resources.gizmos.some((g) => g.id === 'extraction-accelerator' && g.quantity === 2));
assert.ok(resources.gizmos.every((g) => typeof g.iconUrl === 'string' && g.iconUrl.length > 0));

// Same stacks on athena + collections must not double-count.
const duped = parseSpriteResources(resourceProfile, resourceProfile);
assert.equal(duped.dust, 140);
assert.ok(duped.gizmos.every((g) => g.quantity === (resources.gizmos.find((x) => x.id === g.id)?.quantity ?? -1)));

// Epic sometimes sends quantity as string; Override plugin ids differ from AthenaGizmo_* names.
const liveNames = {
  profileChanges: [
    {
      profile: {
        items: {
          a: { templateId: 'Currency:SpriteDust', quantity: '11000' },
          b: { templateId: 'Item:WID_RelicExtractor', quantity: '3' },
          c: { templateId: 'Item:AthenaGizmo_LlamaSupplyDropCaller', quantity: '2' },
          d: { templateId: 'Item:AthenaGizmo_SmugglerExtractionKey', quantity: '1' },
          e: { templateId: 'Item:AthenaGizmo_CheatCodeFinder', quantity: '2' },
          f: { templateId: 'Item:AthenaGizmo_TacoTuesday', quantity: '4' }
        },
        stats: { attributes: {} }
      }
    }
  ]
};
const live = parseSpriteResources(liveNames);
assert.equal(live.dust, 11000);
assert.ok(live.gizmos.some((g) => g.id === 'portable-extractor' && g.quantity === 3));
assert.ok(live.gizmos.some((g) => g.id === 'llama-supply-drop' && g.quantity === 2));
assert.ok(live.gizmos.some((g) => g.id === 'extraction-accelerator' && g.quantity === 1));
assert.ok(live.gizmos.some((g) => g.id === 'cheat-code-locator' && g.quantity === 2));
assert.ok(live.gizmos.some((g) => g.id === 'spicy-taco' && g.quantity === 4));

const levelProfile = {
  profileChanges: [
    {
      profile: {
        items: {
          a: {
            templateId: 'CollectibleSprite:sprite_sonic_base',
            quantity: 1,
            attributes: { level: 5 }
          }
        }
      }
    }
  ]
};
const levels = parseSpriteLevels(levelProfile);
assert.equal(levels['sonic:base'], 5);

const questLevelTrap = {
  profileChanges: [
    {
      profile: {
        items: {
          a: {
            templateId: 'Quest:quest_s42_spritemastery_p01_q01',
            quantity: 1,
            attributes: { level: 1, quest_state: 'Claimed' }
          }
        }
      }
    }
  ]
};
assert.equal(parseSpriteLevels(questLevelTrap)['sonic:base'], undefined);

const tokenLevelTrap = {
  profileChanges: [
    {
      profile: {
        items: {
          a: {
            templateId: 'Token:athena_s42_spritemastery_token_jonesy',
            quantity: 1,
            attributes: { level: 1 }
          }
        }
      }
    }
  ]
};
assert.equal(parseSpriteLevels(tokenLevelTrap)['jonesy:base'], undefined);

const magpieProfile = {
  profileChanges: [
    {
      profile: {
        items: {
          a: { templateId: 'MagpieReward_MorningBell_CosmicThunder_ExtractionPoints', quantity: 140 },
          b: { templateId: 'MagpieReward_MorningBell_RelicExtractor_S42', quantity: 4 },
          c: { templateId: 'MagpieReward_MorningBell_LlamaSupplyDrop', quantity: 2 },
          d: { templateId: 'MagpieReward_MorningBell_SmugglerExtractionKey', quantity: 2 },
          e: { templateId: 'MagpieReward_MorningBell_CheatCodeFinder', quantity: 2 },
          f: { templateId: 'MagpieReward_MorningBell_SpicyTaco', quantity: 4 },
          g: { templateId: 'Jonesy_Variant_A', quantity: 1, attributes: { level: 3 } }
        },
        stats: { attributes: {} }
      }
    }
  ]
};
const magpieResources = parseSpriteResources(magpieProfile);
assert.equal(magpieResources.dust, 140);
assert.ok(magpieResources.gizmos.some((g) => g.id === 'portable-extractor' && g.quantity === 4));
assert.ok(magpieResources.gizmos.some((g) => g.id === 'llama-supply-drop' && g.quantity === 2));
assert.ok(magpieResources.gizmos.some((g) => g.id === 'extraction-accelerator' && g.quantity === 2));
assert.ok(magpieResources.gizmos.some((g) => g.id === 'cheat-code-locator' && g.quantity === 2));
assert.ok(magpieResources.gizmos.some((g) => g.id === 'spicy-taco' && g.quantity === 4));
assert.equal(parseSpriteLevels(magpieProfile)['jonesy:base'], 3);

const sonicLevel = {
  profileChanges: [
    {
      profile: {
        items: {
          a: { templateId: 'CollectibleSprite:sprite_sonic_base', quantity: 1, attributes: { level: 3 } }
        }
      }
    }
  ]
};
assert.equal(parseSpriteLevels(sonicLevel)['sonic:base'], 3);

const familyProgress = parseSpriteProgress({
  profileChanges: [
    {
      profile: {
        items: {
          a: { templateId: 'Quest:quest_s42_spritemastery_jonesy', attributes: { quest_state: 'Active' } },
          b: { templateId: 'Quest:quest_s42_spritemastery_klombo_02', attributes: { quest_state: 'Active' } },
          c: { templateId: 'Token:athena_s42_spritemastery_token_jonesy', quantity: 1 },
          d: { templateId: 'Token:athena_s42_spritemastery_token_8bit_01', quantity: 1 }
        }
      }
    }
  ]
});
assert.equal(familyProgress.extracted.has('jonesy'), true);
assert.equal(familyProgress.extracted.has('eight-bit'), true);
assert.equal(familyProgress.extracted.has('klombo'), false);

assert.deepEqual(parseRelicId('Jonesy_Variant_A'), { family: 'jonesy', variant: 'base' });
assert.deepEqual(parseRelicId('KillswitchSprite_Variant_CheatMaster'), {
  family: 'killswitch',
  variant: 'cheat-master'
});
assert.equal(parseRelicId('Quest:quest_s42_spritemastery_jonesy'), null);
assert.deepEqual(parseCreatureSpriteId('CollectableCreature:Jonesy'), { family: 'jonesy', variant: 'base' });
assert.deepEqual(parseCreatureSpriteId('CollectableCreatureSprite:JazzJackrabbit_Gold'), {
  family: 'jackrabbit',
  variant: 'gold'
});
assert.deepEqual(parseCreatureSpriteId('BR_Creature_Sprite_EightBitBlaster_Cheatmaster'), {
  family: 'eight-bit',
  variant: 'cheat-master'
});
assert.equal(
  parseSpriteLevels({
    profileChanges: [
      {
        profile: {
          items: {
            a: { templateId: 'CollectableCreature:Jonesy', quantity: 1, attributes: { level: 4 } }
          }
        }
      }
    ]
  })['jonesy:base'],
  4
);

const flattened = flattenMagpie({
  Jonesy_Variant_A: 4,
  MagpieReward_MorningBell_RelicExtractor_S42: 3
});
assert.ok(flattened.some((item) => item.templateId === 'Jonesy_Variant_A' && item.quantity === 4));
assert.ok(
  flattened.some((item) => item.templateId === 'MagpieReward_MorningBell_RelicExtractor_S42' && item.quantity === 3)
);
assert.equal(
  flattenMagpie({ Jonesy_Variant_A: 0, Klombo_Variant_Gold: 2 }).some((item) => item.templateId === 'Jonesy_Variant_A'),
  false
);
assert.ok(flattenMagpie({ Klombo_Variant_Gold: 2 }).some((item) => item.templateId === 'Klombo_Variant_Gold'));

console.log('sprites-account self-check passed');
