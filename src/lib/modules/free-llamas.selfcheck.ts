import { strict as assert } from 'node:assert';
import { extractGrantedItems } from '../utils/mcp-loot';

// PurchaseCatalogEntry: sealed llama, needs opening before the loot exists.
assert.deepEqual(
  extractGrantedItems({
    notifications: [
      {
        type: 'CatalogPurchase',
        lootResult: {
          items: [{ itemType: 'CardPack:cardpack_bronze', itemGuid: 'guid-1', quantity: 1 }]
        }
      }
    ]
  }),
  [{ templateId: 'CardPack:cardpack_bronze', quantity: 1, itemGuid: 'guid-1' }]
);

// OpenCardPackBatch: one notification per pack, loot under lootGranted.
assert.deepEqual(
  extractGrantedItems({
    notifications: [
      { type: 'cardPackResult', lootGranted: { items: [{ itemType: 'Hero:hid_soldier', quantity: 1 }] } },
      { type: 'cardPackResult', lootGranted: { items: [{ itemType: 'AccountResource:reagent_c_t01', quantity: 25 }] } }
    ]
  }),
  [
    { templateId: 'Hero:hid_soldier', quantity: 1, itemGuid: undefined },
    { templateId: 'AccountResource:reagent_c_t01', quantity: 25, itemGuid: undefined }
  ]
);

// Some live OpenCardPackBatch responses return lootGranted as a bare array.
assert.deepEqual(
  extractGrantedItems({
    notifications: [
      {
        type: 'cardPackResult',
        lootGranted: [{ itemType: 'Worker:workerbasic_sr', quantity: 1 }]
      }
    ]
  }),
  [{ templateId: 'Worker:workerbasic_sr', quantity: 1, itemGuid: undefined }]
);

// PurchaseCatalogEntry can put the campaign grant in multiUpdate instead.
assert.deepEqual(
  extractGrantedItems({
    multiUpdate: [
      {
        profileChanges: [
          {
            changeType: 'itemAdded',
            itemId: 'pack-guid',
            item: { templateId: 'CardPack:cardpack_bronze', quantity: 1 }
          }
        ]
      }
    ]
  }),
  [{ templateId: 'CardPack:cardpack_bronze', quantity: 1, itemGuid: 'pack-guid' }]
);

// Prefer the profile copy when it enriches a guidless notification copy.
assert.deepEqual(
  extractGrantedItems({
    notifications: [{ lootResult: [{ itemType: 'CardPack:cardpack_bronze', quantity: 1 }] }],
    profileChanges: [
      {
        changeType: 'itemAdded',
        itemId: 'pack-guid',
        item: { templateId: 'cardpack:cardpack_bronze', quantity: 1 }
      }
    ]
  }),
  [{ templateId: 'cardpack:cardpack_bronze', quantity: 1, itemGuid: 'pack-guid' }]
);

assert.deepEqual(extractGrantedItems({}), []);
assert.deepEqual(extractGrantedItems(null), []);
assert.deepEqual(extractGrantedItems({ notifications: [{ type: 'noop' }] }), []);

console.log('free-llamas selfcheck ok');
