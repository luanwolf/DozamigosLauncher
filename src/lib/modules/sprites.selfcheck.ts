import { strict as assert } from 'node:assert';
import { m } from '$lib/paraglide/messages';
import {
  mapApiSpriteFamilyId,
  parseSpriteProgress,
  readSpriteCollection,
  SPRITE_ENTRIES,
  SPRITE_EXPORT_ORDER,
  SPRITE_EXPORT_VARIANTS,
  SPRITE_FAMILIES,
  spriteShortName,
  spriteVariantFromToken,
  writeSpriteCollection
} from './sprites';
import {
  parseSpriteLevels,
  parseSpriteMastered,
  parseSpriteResources,
  flattenMagpie,
  parseCreatureSpriteId,
  parseRelicId,
  parseMagpieV2Inventory,
  mergeMagpieItems,
  collectMagpieModuleIds,
  spriteXpToLevel,
  SPRITE_GIZMO_CATALOG
} from './sprites-account';

assert.equal(SPRITE_FAMILIES.length, 19);
assert.equal(SPRITE_ENTRIES.length, 91);
assert.equal(new Set(SPRITE_ENTRIES.map((entry) => entry.key)).size, SPRITE_ENTRIES.length);
assert.equal(SPRITE_FAMILIES.find((f) => f.slug === 'sonic')?.name, 'Elemental Sonic');
assert.equal(SPRITE_FAMILIES.find((f) => f.slug === 'klombo')?.rarity, 'mythic');
function pascalFamily(slug: string) {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

for (const family of SPRITE_FAMILIES) {
  const compact = family.slug.replace(/-/g, '');
  const pascal = pascalFamily(family.slug);
  assert.equal(mapApiSpriteFamilyId(family.slug), family.slug, family.slug);
  assert.equal(mapApiSpriteFamilyId(family.slug.replace(/-/g, '_')), family.slug, `${family.slug} underscores`);
  assert.equal(mapApiSpriteFamilyId(`${compact}Sprite`), family.slug, `${compact}Sprite`);
  assert.deepEqual(parseRelicId(`${pascal}_Variant_A`), { family: family.slug, variant: 'base' }, pascal);
  assert.deepEqual(
    parseRelicId(`module-uuid:${pascal}Sprite_Variant_A`),
    { family: family.slug, variant: 'base' },
    `uuid:${pascal}`
  );
}
assert.equal(mapApiSpriteFamilyId('NarrowfleaSprite'), 'sonic');
assert.equal(mapApiSpriteFamilyId('EightBitBlasterSprite'), 'eight-bit');
assert.equal(mapApiSpriteFamilyId('BulletSprite'), 'onigiri');
assert.equal(mapApiSpriteFamilyId('Mega_Man'), 'mega-man');
assert.equal(mapApiSpriteFamilyId('WinnerBSprite'), 'x-ray');
assert.equal(mapApiSpriteFamilyId('WinnerC'), 'onigiri');
assert.equal(mapApiSpriteFamilyId('ImprovedSlideSprite'), 'mega-man');
assert.equal(mapApiSpriteFamilyId('CrashBandicootSprite'), 'crash');
assert.equal(mapApiSpriteFamilyId('PondSprite'), 'pond');
assert.equal(mapApiSpriteFamilyId('Blinky'), 'blinky');
assert.equal(mapApiSpriteFamilyId('UnknownSprite'), null);
assert.equal(spriteVariantFromToken('BountyHunter'), 'bounty-hunter');
assert.equal(spriteVariantFromToken('galaxy'), 'loot-hacker');
assert.equal(SPRITE_FAMILIES.every((f) => f.name.startsWith('Elemental')), true);
assert.equal(SPRITE_FAMILIES.find((f) => f.slug === 'mega-man')?.variants.length, 0);
assert.equal(SPRITE_FAMILIES.find((f) => f.slug === 'overshield')?.variants.includes('loot-hacker'), true);
assert.equal(SPRITE_FAMILIES.find((f) => f.slug === 'pond')?.variants.includes('bounty-hunter'), true);
assert.equal(
  SPRITE_FAMILIES.filter((f) => f.slug !== 'mega-man').every((f) => f.variants.includes('bounty-hunter')),
  true
);
assert.deepEqual(SPRITE_EXPORT_VARIANTS, ['base', 'gold', 'cheat-master', 'loot-hacker', 'bounty-hunter']);
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
          i: quest('Quest:quest_s42_bpquests_p01_q01', 'Claimed'),
          j: quest('Quest:quest_s42_spritemastery_p01_q03', 'Claimed'),
          k: quest(
            'Quest:quest_s42_spritemastery_redeem_p01_q03',
            'Claimed',
            'CosmeticVariantToken:vtid_backpack_coldtrophy_narrowflea_galaxy'
          )
        }
      }
    }
  ]
});

assert.deepEqual([...progress.mastered].sort(), ['sonic:base', 'sonic:gold', 'sonic:loot-hacker']);
assert.deepEqual([...progress.extracted], ['sonic']);

const bountyProgress = parseSpriteProgress({
  profileChanges: [
    {
      profile: {
        items: {
          a: quest('Quest:quest_s42_spritemastery_p01_q04', 'Claimed'),
          b: quest(
            'Quest:quest_s42_spritemastery_redeem_p01_q04',
            'Claimed',
            'CosmeticVariantToken:vtid_backpack_coldtrophy_crown_bountyhunter'
          )
        }
      }
    }
  ]
});
assert.deepEqual([...bountyProgress.mastered], ['crown:bounty-hunter']);
assert.deepEqual([...bountyProgress.extracted], ['crown']);

console.log(`sprites self-check passed (${SPRITE_ENTRIES.length} entries)`);

for (const key of [
  'sprites.variants.base',
  'sprites.variants.gold',
  'sprites.variants.cheatMaster',
  'sprites.variants.lootHacker',
  'sprites.variants.bountyHunter'
] as const) {
  assert.equal(typeof m[key], 'function', key);
  assert.ok(m[key]({}, { locale: 'pt-br' }));
}

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

const liveTokenProgress = parseSpriteProgress({
  profileChanges: [
    {
      profile: {
        items: {
          a: { templateId: 'Token:athena_s42_spritemastery_token_winnerb', quantity: 1 },
          b: { templateId: 'Token:athena_s42_spritemastery_token_winnerc_02', quantity: 1 },
          c: { templateId: 'Token:athena_s42_spritemastery_token_improvedslide', quantity: 1 },
          d: { templateId: 'Token:athena_s42_spritemastery_token_overshield_01', quantity: 1 }
        }
      }
    }
  ]
});
assert.equal(liveTokenProgress.extracted.has('x-ray'), true);
assert.equal(liveTokenProgress.extracted.has('onigiri'), true);
assert.equal(liveTokenProgress.extracted.has('mega-man'), true);
assert.equal(liveTokenProgress.extracted.has('overshield'), true);

const catalogTokenItems = Object.fromEntries(
  SPRITE_FAMILIES.flatMap((family, i) => [
    [
      `t${i}`,
      { templateId: `Token:athena_s42_spritemastery_token_${family.slug.replace(/-/g, '_')}`, quantity: 1 }
    ],
    [
      `s${i}`,
      { templateId: `Token:athena_s42_spritemastery_token_${family.slug.replace(/-/g, '')}sprite`, quantity: 1 }
    ]
  ])
);
const catalogTokenProgress = parseSpriteProgress({
  profileChanges: [{ profile: { items: catalogTokenItems } }]
});
for (const family of SPRITE_FAMILIES) {
  assert.equal(catalogTokenProgress.extracted.has(family.slug), true, `token ${family.slug}`);
}

const catalogLevelItems = Object.fromEntries(
  SPRITE_FAMILIES.map((family, i) => [
    `l${i}`,
    {
      templateId: `${pascalFamily(family.slug)}_Variant_A`,
      quantity: 1,
      attributes: { level: 2, ml: true }
    }
  ])
);
const catalogLevels = parseSpriteLevels({
  profileChanges: [{ profile: { items: catalogLevelItems } }]
});
const catalogMastered = parseSpriteMastered({
  profileChanges: [{ profile: { items: catalogLevelItems } }]
});
for (const family of SPRITE_FAMILIES) {
  assert.equal(catalogLevels[`${family.slug}:base`], 2, `level ${family.slug}`);
  assert.equal(catalogMastered.has(`${family.slug}:base`), true, `mastered ${family.slug}`);
}

assert.deepEqual(parseRelicId('Jonesy_Variant_A'), { family: 'jonesy', variant: 'base' });
assert.deepEqual(parseRelicId('KillswitchSprite_Variant_CheatMaster'), {
  family: 'killswitch',
  variant: 'cheat-master'
});
assert.deepEqual(parseRelicId('CrownSprite_Variant_BountyHunter'), {
  family: 'crown',
  variant: 'bounty-hunter'
});
assert.deepEqual(parseRelicId('Crash_Variant_Bounty'), { family: 'crash', variant: 'bounty-hunter' });
assert.deepEqual(parseCreatureSpriteId('BR_Creature_Sprite_Pond_BountyHunter'), {
  family: 'pond',
  variant: 'bounty-hunter'
});
assert.deepEqual(parseRelicId('XRaySprite_Variant_LootHacker'), {
  family: 'x-ray',
  variant: 'loot-hacker'
});
assert.deepEqual(parseRelicId('OnigiriSprite_Variant_Galaxy'), {
  family: 'onigiri',
  variant: 'loot-hacker'
});
assert.deepEqual(parseRelicId('Mega_Man_Variant_A'), {
  family: 'mega-man',
  variant: 'base'
});
assert.deepEqual(parseRelicId('828c9446-3eb8-497e-a282-d95b92243c14:OnigiriSprite_Variant_A'), {
  family: 'onigiri',
  variant: 'base'
});
assert.deepEqual(parseRelicId('BulletSprite_Variant_Gold'), {
  family: 'onigiri',
  variant: 'gold'
});
assert.deepEqual(parseRelicId('XRaySprite_Variant_A'), { family: 'x-ray', variant: 'base' });
assert.deepEqual(parseRelicId('OnigiriSprite_Variant_A'), { family: 'onigiri', variant: 'base' });
assert.deepEqual(parseRelicId('OvershieldSprite_Variant_A'), { family: 'overshield', variant: 'base' });
assert.deepEqual(parseRelicId('WinnerBSprite_Variant_A'), { family: 'x-ray', variant: 'base' });
assert.deepEqual(parseRelicId('WinnerCSprite_Variant_CheatMaster'), {
  family: 'onigiri',
  variant: 'cheat-master'
});
assert.deepEqual(parseRelicId('ImprovedSlideSprite_Variant_A'), { family: 'mega-man', variant: 'base' });
assert.deepEqual(parseRelicId('828c9446-3eb8-497e-a282-d95b92243c14:WinnerBSprite_Variant_LootHacker'), {
  family: 'x-ray',
  variant: 'loot-hacker'
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
assert.deepEqual(parseCreatureSpriteId('BR_Creature_Sprite_XRay_LootHacker'), {
  family: 'x-ray',
  variant: 'loot-hacker'
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
assert.equal(
  parseSpriteLevels({
    profileChanges: [
      {
        profile: {
          items: {
            a: { templateId: 'Mega_Man_Variant_A', quantity: 1, attributes: { xp: 800, level: 2 } },
            b: { templateId: 'OnigiriSprite_Variant_A', quantity: 1, attributes: { ml: true, xp: 4000, level: 5 } }
          }
        }
      }
    ]
  })['mega-man:base'],
  2
);
assert.equal(
  parseSpriteLevels({
    profileChanges: [
      {
        profile: {
          items: {
            a: { templateId: 'OnigiriSprite_Variant_A', quantity: 1, attributes: { ml: true, xp: 4000, level: 5 } }
          }
        }
      }
    ]
  })['onigiri:base'],
  5
);
assert.deepEqual(
  [...parseSpriteMastered({
    profileChanges: [
      {
        profile: {
          items: {
            a: { templateId: 'OnigiriSprite_Variant_A', quantity: 1, attributes: { ml: true, level: 5 } },
            b: { templateId: 'Mega_Man_Variant_A', quantity: 1, attributes: { ml: true, level: 5 } }
          }
        }
      }
    ]
  })].sort(),
  ['mega-man:base', 'onigiri:base']
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

assert.equal(spriteXpToLevel(0), 1);
assert.equal(spriteXpToLevel(300), 1);
assert.equal(spriteXpToLevel(800), 2);
assert.equal(spriteXpToLevel(1275), 3);
assert.equal(spriteXpToLevel(2010), 4);
assert.equal(spriteXpToLevel(4000, true), 5);

const v2Items = parseMagpieV2Inventory({
  inventory: [
    {
      counts: {
        Jonesy_Variant_A: 2,
        Currency_ExtractionPoints: 8765,
        NarrowFleaSprite_Variant_A: 2
      },
      entitlementMetadata: {
        Jonesy_Variant_A: '{"xp":4000,"ml":true}',
        NarrowFleaSprite_Variant_A: '{"xp":2000,"ml":false}'
      }
    }
  ]
});
assert.equal(v2Items.find((item) => item.templateId === 'Currency_ExtractionPoints')?.quantity, 8765);
assert.equal(v2Items.find((item) => item.templateId === 'Jonesy_Variant_A')?.attributes?.level, 5);
assert.equal(v2Items.find((item) => item.templateId === 'NarrowFleaSprite_Variant_A')?.attributes?.level, 4);
assert.equal(
  parseSpriteLevels(itemsAsProfileForCheck(v2Items))['jonesy:base'],
  5
);
assert.deepEqual([...parseSpriteMastered(itemsAsProfileForCheck(v2Items))].sort(), ['jonesy:base']);
assert.equal(parseSpriteResources(itemsAsProfileForCheck(v2Items)).dust, 8765);

assert.ok(SPRITE_EXPORT_ORDER.indexOf('jackrabbit') < SPRITE_EXPORT_ORDER.indexOf('x-ray'));
assert.ok(SPRITE_EXPORT_ORDER.indexOf('sonic') < SPRITE_EXPORT_ORDER.indexOf('jackrabbit'));
assert.ok(SPRITE_EXPORT_ORDER.indexOf('storm-scout') < SPRITE_EXPORT_ORDER.indexOf('shadow'));
assert.deepEqual([...SPRITE_EXPORT_ORDER], [
  'bush',
  'adventure',
  'jonesy',
  'eight-bit',
  'onigiri',
  'mega-man',
  'overshield',
  'storm-scout',
  'shadow',
  'tails',
  'pond',
  'killswitch',
  'sonic',
  'jackrabbit',
  'x-ray',
  'blinky',
  'crash',
  'klombo',
  'crown'
]);

function itemsAsProfileForCheck(
  list: { templateId?: string; quantity?: number | string; attributes?: Record<string, unknown> }[]
) {
  const items: Record<string, (typeof list)[number]> = {};
  list.forEach((item, i) => {
    items[`m-${i}`] = item;
  });
  return { profileChanges: [{ profile: { items, stats: { attributes: {} } } }] };
}

const gizmoV2 = parseMagpieV2Inventory({
  inventory: [
    {
      counts: {
        '/MorningBell/CosmicThunder/Item00': 4,
        '/MorningBell/CosmicThunder/Item01': 2,
        '/MorningBell/CosmicThunder/Item02': 3,
        '/MorningBell/CosmicThunder/Item03': 3,
        '/MorningBell/CosmicThunder/Item04': 2,
        '/MorningBell/CosmicThunder/Item00/UnseenStatus': 1
      }
    }
  ]
});
assert.equal(
  gizmoV2.some((item) => /UnseenStatus/i.test(item.templateId ?? '')),
  false
);
const gizmoRes = parseSpriteResources(itemsAsProfileForCheck(gizmoV2));
assert.ok(gizmoRes.gizmos.some((g) => g.id === 'spicy-taco' && g.quantity === 4));
assert.ok(gizmoRes.gizmos.some((g) => g.id === 'llama-supply-drop' && g.quantity === 2));
assert.ok(gizmoRes.gizmos.some((g) => g.id === 'extraction-accelerator' && g.quantity === 3));
assert.ok(gizmoRes.gizmos.some((g) => g.id === 'cheat-code-locator' && g.quantity === 3));
assert.ok(gizmoRes.gizmos.some((g) => g.id === 'portable-extractor' && g.quantity === 2));

const renamedSlots = parseSpriteResources(
  itemsAsProfileForCheck(
    parseMagpieV2Inventory({
      inventory: [
        {
          counts: {
            '039e7691-eb2a-4ce2-99c5-63c831917870:/MorningBell/Override/Item00': 5,
            '/MorningBell/Override/Item01': 1,
            '/MorningBell/Override/Item02': 7,
            '/MorningBell/Override/Item03': 2,
            '/MorningBell/Override/Item04': 9,
            '/MorningBell/Override/Item00/UnseenStatus': 1
          }
        }
      ]
    })
  )
);
assert.ok(renamedSlots.gizmos.some((g) => g.id === 'spicy-taco' && g.quantity === 5));
assert.ok(renamedSlots.gizmos.some((g) => g.id === 'llama-supply-drop' && g.quantity === 1));
assert.ok(renamedSlots.gizmos.some((g) => g.id === 'extraction-accelerator' && g.quantity === 7));
assert.ok(renamedSlots.gizmos.some((g) => g.id === 'cheat-code-locator' && g.quantity === 2));
assert.ok(renamedSlots.gizmos.some((g) => g.id === 'portable-extractor' && g.quantity === 9));

const spriteBag = parseMagpieV2Inventory({
  inventory: [
    {
      counts: { Jonesy_Variant_A: 2, Currency_ExtractionPoints: 8765 },
      entitlementMetadata: { Jonesy_Variant_A: '{"xp":4000,"ml":true}' }
    }
  ]
});
const gizmoBag = parseMagpieV2Inventory({
  inventory: [{ counts: { '/MorningBell/CosmicThunder/Item00': 4 } }]
});
const fullBag = parseMagpieV2Inventory({
  inventory: [
    {
      counts: {
        '828c9446-3eb8-497e-a282-d95b92243c14:Jonesy_Variant_A': 1,
        '039e7691-eb2a-4ce2-99c5-63c831917870:/MorningBell/CosmicThunder/Item00': 4,
        OnigiriSprite_Variant_A: 3
      },
      entitlementMetadata: { OnigiriSprite_Variant_A: '{"xp":800,"ml":false}' }
    }
  ]
});
const emptyUnfiltered = parseMagpieV2Inventory({ inventory: [] });
const merged = mergeMagpieItems(spriteBag, gizmoBag, emptyUnfiltered, fullBag);
assert.equal(merged.filter((item) => magpieLeaf(item.templateId).includes('Jonesy_Variant_A')).length, 1);
assert.equal(merged.find((item) => magpieLeaf(item.templateId).includes('Jonesy_Variant_A'))?.quantity, 2);
assert.equal(merged.filter((item) => /Item00/.test(item.templateId ?? '')).length, 1);
assert.ok(merged.some((item) => item.templateId === 'OnigiriSprite_Variant_A' && item.quantity === 3));
const mergedRes = parseSpriteResources(itemsAsProfileForCheck(merged));
assert.equal(mergedRes.dust, 8765);
assert.ok(mergedRes.gizmos.some((g) => g.id === 'spicy-taco' && g.quantity === 4));
assert.equal(parseSpriteLevels(itemsAsProfileForCheck(merged))['jonesy:base'], 5);
assert.equal(parseSpriteLevels(itemsAsProfileForCheck(merged))['onigiri:base'], 2);
assert.ok(parseSpriteMastered(itemsAsProfileForCheck(merged)).has('jonesy:base'));

const v4210Bag = parseMagpieV2Inventory({
  inventory: [
    {
      counts: {
        WinnerBSprite_Variant_A: 1,
        WinnerCSprite_Variant_Gold: 1,
        ImprovedSlideSprite_Variant_A: 1,
        OvershieldSprite_Variant_A: 2,
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee:XRaySprite_Variant_CheatMaster': 1
      },
      entitlementMetadata: {
        WinnerBSprite_Variant_A: '{"xp":4000,"ml":true}',
        ImprovedSlideSprite_Variant_A: '{"xp":800,"ml":false}',
        OvershieldSprite_Variant_A: '{"xp":2000,"ml":false}'
      }
    }
  ]
});
const v4210Profile = itemsAsProfileForCheck(v4210Bag);
assert.equal(parseSpriteLevels(v4210Profile)['x-ray:base'], 5);
assert.equal(parseSpriteLevels(v4210Profile)['onigiri:gold'], 1);
assert.equal(parseSpriteLevels(v4210Profile)['mega-man:base'], 2);
assert.equal(parseSpriteLevels(v4210Profile)['overshield:base'], 4);
assert.equal(parseSpriteLevels(v4210Profile)['x-ray:cheat-master'], 1);
assert.ok(parseSpriteMastered(v4210Profile).has('x-ray:base'));
assert.deepEqual(collectMagpieModuleIds(v4210Bag).sort(), ['aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee']);
assert.deepEqual(
  collectMagpieModuleIds({
    modules: [{ moduleId: '11111111-2222-3333-4444-555555555555' }],
    inventory: [{ counts: { '828c9446-3eb8-497e-a282-d95b92243c14:Jonesy_Variant_A': 1 } }]
  }).sort(),
  ['11111111-2222-3333-4444-555555555555', '828c9446-3eb8-497e-a282-d95b92243c14']
);

function magpieLeaf(id: string | undefined) {
  return id?.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:/i, '') ?? '';
}

console.log('sprites-account self-check passed');
