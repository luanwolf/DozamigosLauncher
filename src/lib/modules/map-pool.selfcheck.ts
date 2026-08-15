import assert from 'node:assert/strict';
import { mapPool } from './map-pool';

const order: number[] = [];
const results = await mapPool(
  [1, 2, 3],
  async (n) => {
    order.push(n);
    return n * 10;
  },
  1
);

assert.deepEqual(order, [1, 2, 3]);
assert.deepEqual(
  results.map((r) => (r.status === 'fulfilled' ? r.value : null)),
  [10, 20, 30]
);

let parallel = 0;
let maxParallel = 0;
await mapPool(
  [1, 2, 3, 4],
  async () => {
    parallel++;
    maxParallel = Math.max(maxParallel, parallel);
    await new Promise((r) => setTimeout(r, 20));
    parallel--;
  },
  2
);
assert.equal(maxParallel, 2);

console.log('map-pool.selfcheck: ok');
