import assert from 'node:assert/strict';
import { gridColumns, gridPixelSize } from './locker-export-layout';
import { sortLockerItemsForExport } from './locker-export-sort';
import type { LockerOwnedItem } from './locker-parse';

// Every category must hold all its items, and — from 2 items up, where the fixed
// header and footer stop dominating — come out close to square.
for (const count of [1, 2, 7, 24, 40, 100, 328, 645, 719, 1307]) {
  const { width, height, cols, rows } = gridPixelSize(count);
  const ratio = width / height;
  assert.ok(cols * rows >= count, `grid too small for ${count}`);
  if (count < 2) continue;
  assert.ok(ratio > 0.6 && ratio < 1.6, `${count} items exported at ${ratio.toFixed(2)}:1`);
}

assert.equal(gridColumns(0), 1);

const stub = (name: string, rarity: string, series?: string): LockerOwnedItem => ({
  itemId: name,
  templateId: name,
  cosmeticId: name,
  name,
  description: '',
  rarity,
  series,
  styles: [],
  imageUrl: '',
  favorite: false,
  equippedSlots: []
});

const sorted = sortLockerItemsForExport([
  stub('Common', 'common'),
  stub('Epic', 'epic'),
  stub('Batman', 'epic', 'dcuseries'),
  stub('Mythic', 'mythic'),
  stub('Vader', 'legendary', 'starwarsseries'),
  stub('Legendary', 'legendary'),
  stub('Rare', 'rare')
]);

assert.deepEqual(
  sorted.map((i) => i.name),
  ['Batman', 'Vader', 'Mythic', 'Legendary', 'Epic', 'Rare', 'Common']
);

console.log('locker-export.selfcheck: ok');
