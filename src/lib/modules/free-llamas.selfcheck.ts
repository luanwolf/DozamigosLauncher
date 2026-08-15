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

assert.deepEqual(extractGrantedItems({}), []);
assert.deepEqual(extractGrantedItems(null), []);
assert.deepEqual(extractGrantedItems({ notifications: [{ type: 'noop' }] }), []);

console.log('free-llamas selfcheck ok');
