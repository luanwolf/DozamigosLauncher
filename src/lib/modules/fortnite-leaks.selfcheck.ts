import { strict as assert } from 'node:assert';
import { formatLeakDayLabel, groupLeaksByDay, type LeakedCosmetic } from './fortnite-leaks';

const sample = (id: string, added: string): LeakedCosmetic => ({
  id,
  name: id,
  type: 'Outfit',
  rarity: 'Rare',
  rarityValue: 'rare',
  image: '',
  styles: [],
  added
});

const groups = groupLeaksByDay([
  sample('a', '2026-08-17T16:00:57Z'),
  sample('b', '2026-08-15T10:00:00Z'),
  sample('c', '2026-08-17T12:00:00Z'),
  sample('bad', 'not-a-date')
]);

assert.equal(groups.length, 2);
assert.equal(groups[0]?.dateKey, '2026-08-17');
assert.deepEqual(
  groups[0]?.items.map((item) => item.id),
  ['a', 'c']
);
assert.equal(groups[1]?.dateKey, '2026-08-15');
assert.equal(formatLeakDayLabel('2026-08-20', 'pt-BR'), '20/08/2026');

console.log('fortnite-leaks.selfcheck: ok');
