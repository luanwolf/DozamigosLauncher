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

const cats: LockerCategory[] = ['outfits', 'backpacks', 'pickaxes', 'gliders', 'emotes', 'wraps'];
assert.equal(cats.length, 6);

console.log('locker.selfcheck: ok');
