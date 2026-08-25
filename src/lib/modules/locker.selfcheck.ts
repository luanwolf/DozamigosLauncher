import assert from 'node:assert/strict';
import type { FullQueryProfile } from '$types/game/mcp';
import { parseLockerData, type LockerCategory } from './locker-parse';

const athena = {
  profileChanges: [
    {
      changeType: 'fullProfileUpdate',
      profile: {
        items: {
          locker1: {
            templateId: 'CosmeticLocker:cosmeticlocker_athena',
            quantity: 1,
            attributes: {
              locker_name: 'Main',
              locker_slots_data: {
                slots: {
                  Character: { items: ['skin1'] },
                  Dance: { items: ['AthenaDance:EID_Dance1', '', '', '', '', ''] }
                }
              }
            }
          },
          skin1: {
            templateId: 'AthenaCharacter:CID_001',
            quantity: 1,
            attributes: { item_seen: true, favorite: true }
          },
          skin2: {
            templateId: 'AthenaCharacter:CID_002',
            quantity: 1,
            attributes: { item_seen: true }
          },
          skin3: {
            templateId: 'AthenaCharacter:CID_003',
            quantity: 1,
            attributes: {}
          },
          emote1: {
            templateId: 'AthenaDance:EID_Dance1',
            quantity: 1,
            attributes: { item_seen: true }
          }
        },
        stats: { attributes: { loadouts: ['locker1'], last_applied_loadout: 'locker1' } }
      }
    }
  ]
} as unknown as FullQueryProfile<'athena'>;

const cosmetics = new Map([
  [
    'cid_001',
    {
      id: 'CID_001',
      name: 'Recruit',
      description: 'Default recruit',
      typeBackend: 'AthenaCharacter',
      rarity: 'common',
      smallIcon: 'a.png',
      icon: 'a.png',
      styles: [{ name: 'Gold', image: 'gold.png' }]
    }
  ],
  [
    'cid_002',
    {
      id: 'CID_002',
      name: 'Other',
      description: '',
      typeBackend: 'AthenaCharacter',
      rarity: 'rare',
      smallIcon: 'b.png',
      icon: 'b.png'
    }
  ],
  [
    'cid_003',
    {
      id: 'CID_003',
      name: 'Unseen',
      description: '',
      typeBackend: 'AthenaCharacter',
      rarity: 'epic',
      smallIcon: 'd.png',
      icon: 'd.png'
    }
  ],
  [
    'eid_dance1',
    {
      id: 'EID_Dance1',
      name: 'Dance',
      description: 'A dance',
      typeBackend: 'AthenaDance',
      rarity: 'uncommon',
      smallIcon: 'e.png',
      icon: 'e.png'
    }
  ]
]);

const data = parseLockerData(athena, cosmetics);
assert.equal(data.loadout?.lockerItemId, 'locker1');
assert.equal(data.itemsByCategory.outfits.length, 3);
assert.deepEqual(data.itemsByCategory.outfits[0]!.equippedSlots, [0]);
assert.equal(data.itemsByCategory.outfits[0]!.name, 'Recruit');
assert.equal(data.itemsByCategory.outfits[0]!.description, 'Default recruit');
assert.deepEqual(data.itemsByCategory.outfits[0]!.styles, [{ name: 'Gold', image: 'gold.png' }]);
// fortnite.gg previews are case sensitive, so the catalog casing must survive.
assert.equal(data.itemsByCategory.outfits[0]!.cosmeticId, 'CID_001');
assert.deepEqual(data.itemsByCategory.outfits[1]!.styles, []);
assert.deepEqual(data.itemsByCategory.emotes[0]!.equippedSlots, [0]);
assert.equal(data.itemsByCategory.emotes[0]!.description, 'A dance');

// lowercase slot keys + GUID resolve still mark equipped
const athenaLower = {
  profileChanges: [
    {
      changeType: 'fullProfileUpdate',
      profile: {
        items: {
          locker1: {
            templateId: 'CosmeticLocker:cosmeticlocker_athena',
            quantity: 1,
            attributes: {
              locker_slots_data: {
                slots: {
                  character: { items: ['AthenaCharacter:CID_003'] }
                }
              }
            }
          },
          skin3: {
            templateId: 'AthenaCharacter:CID_003',
            quantity: 1,
            attributes: {}
          }
        },
        stats: { attributes: { loadouts: ['locker1'], last_applied_loadout: 'locker1' } }
      }
    }
  ]
} as unknown as FullQueryProfile<'athena'>;

const lowerData = parseLockerData(athenaLower, cosmetics);
assert.deepEqual(lowerData.itemsByCategory.outfits[0]!.equippedSlots, [0]);
assert.equal(lowerData.itemsByCategory.outfits[0]!.name, 'Unseen');

const cats: LockerCategory[] = [
  'outfits',
  'backpacks',
  'pickaxes',
  'gliders',
  'emotes',
  'wraps',
  'auras',
  'pets',
  'shoes'
];
assert.equal(cats.length, 9);

const extraAthena = {
  profileChanges: [
    {
      changeType: 'fullProfileUpdate',
      profile: {
        items: {
          locker1: {
            templateId: 'CosmeticLocker:cosmeticlocker_athena',
            quantity: 1,
            attributes: {
              locker_slots_data: {
                slots: {
                  SparksAura: { items: ['SparksAura:SparksAura_Bats'] },
                  CosmeticCompanion: { items: ['pet1'] },
                  Shoes: { items: ['CosmeticShoes:Shoes_AbyssBlot'] }
                }
              }
            }
          },
          aura1: {
            templateId: 'SparksAura:SparksAura_Bats',
            quantity: 1,
            attributes: {}
          },
          pet1: {
            templateId: 'CosmeticCompanion:Companion_AboutJury',
            quantity: 1,
            attributes: {}
          },
          pet2: {
            templateId: 'AthenaPet:Pet_Default',
            quantity: 1,
            attributes: {}
          },
          petDup: {
            templateId: 'CosmeticCompanion:Companion_AboutJury',
            quantity: 1,
            attributes: {}
          },
          petFx: {
            templateId: 'CosmeticCompanion:Companion_ReactFX_BriskImp',
            quantity: 1,
            attributes: {}
          },
          shoe1: {
            templateId: 'CosmeticShoes:Shoes_AbyssBlot',
            quantity: 1,
            attributes: {}
          }
        },
        stats: { attributes: { loadouts: ['locker1'], last_applied_loadout: 'locker1' } }
      }
    }
  ]
} as unknown as FullQueryProfile<'athena'>;

const extraCosmetics = new Map([
  [
    'sparksaura_bats',
    {
      id: 'SparksAura_Bats',
      name: 'Bats',
      description: '',
      typeBackend: 'SparksAura',
      rarity: 'uncommon',
      smallIcon: 'aura.png',
      icon: 'aura.png'
    }
  ],
  [
    'companion_aboutjury',
    {
      id: 'Companion_AboutJury',
      name: 'Squanchy',
      description: '',
      typeBackend: 'CosmeticCompanion',
      rarity: 'uncommon',
      smallIcon: 'pet.png',
      icon: 'pet.png'
    }
  ],
  [
    'pet_default',
    {
      id: 'Pet_Default',
      name: 'Bonesy',
      description: '',
      typeBackend: 'AthenaPet',
      rarity: 'uncommon',
      smallIcon: 'pet2.png',
      icon: 'pet2.png'
    }
  ],
  [
    'shoes_abyssblot',
    {
      id: 'Shoes_AbyssBlot',
      name: 'Octopus Feet',
      description: '',
      typeBackend: 'CosmeticShoes',
      rarity: 'uncommon',
      smallIcon: 'shoe.png',
      icon: 'shoe.png'
    }
  ]
]);

const extra = parseLockerData(extraAthena, extraCosmetics);
assert.equal(extra.itemsByCategory.auras[0]!.name, 'Bats');
assert.deepEqual(extra.itemsByCategory.auras[0]!.equippedSlots, [0]);
assert.equal(extra.itemsByCategory.pets[0]!.name, 'Squanchy');
assert.deepEqual(extra.itemsByCategory.pets[0]!.equippedSlots, [0]);
assert.equal(extra.itemsByCategory.pets.filter((p) => p.name === 'Squanchy').length, 1);
assert.equal(extra.itemsByCategory.pets.some((p) => p.name === 'Bonesy'), true);
assert.equal(
  extra.itemsByCategory.pets.some((p) => p.cosmeticId.toLowerCase().includes('reactfx')),
  false
);
assert.equal(extra.itemsByCategory.shoes[0]!.name, 'Octopus Feet');
assert.deepEqual(extra.itemsByCategory.shoes[0]!.equippedSlots, [0]);

// Sidekicks stay in Mascote even when Epic's template prefix looks like an outfit.
const sidekickAthena = {
  profileChanges: [
    {
      changeType: 'fullProfileUpdate',
      profile: {
        items: {
          locker1: {
            templateId: 'CosmeticLocker:cosmeticlocker_athena',
            quantity: 1,
            attributes: { locker_slots_data: { slots: { Sidekick: { items: ['sk1'] } } } }
          },
          sk1: {
            templateId: 'AthenaCharacter:Companion_BandSoda',
            quantity: 1,
            attributes: {}
          },
          sk2: {
            templateId: 'Token:Mimosa_BeachDay',
            quantity: 1,
            attributes: {}
          }
        },
        stats: { attributes: { loadouts: ['locker1'], last_applied_loadout: 'locker1' } }
      }
    }
  ]
} as unknown as FullQueryProfile<'athena'>;

const sidekickCosmetics = new Map([
  [
    'companion_bandsoda',
    {
      id: 'Companion_BandSoda',
      name: 'Doggo Jr.',
      description: '',
      typeBackend: 'CosmeticCompanion',
      typeValue: 'sidekick',
      rarity: 'uncommon',
      smallIcon: 'd.png',
      icon: 'd.png'
    }
  ],
  [
    'mimosa_beachday',
    {
      id: 'Mimosa_BeachDay',
      name: 'Mimosa',
      description: '',
      typeBackend: 'CosmeticCompanion',
      typeValue: 'sidekick',
      rarity: 'uncommon',
      smallIcon: 'm.png',
      icon: 'm.png'
    }
  ]
]);

const sidekicks = parseLockerData(sidekickAthena, sidekickCosmetics);
assert.equal(sidekicks.itemsByCategory.outfits.length, 0);
assert.equal(sidekicks.itemsByCategory.pets.length, 2);
assert.equal(sidekicks.itemsByCategory.pets[0]!.name, 'Doggo Jr.');
assert.equal(sidekicks.itemsByCategory.pets[0]!.cosmeticId, 'Companion_BandSoda');
assert.deepEqual(sidekicks.itemsByCategory.pets[0]!.equippedSlots, [0]);
assert.equal(sidekicks.itemsByCategory.pets.some((p) => p.cosmeticId === 'Mimosa_BeachDay'), true);

console.log('locker.selfcheck: ok');
