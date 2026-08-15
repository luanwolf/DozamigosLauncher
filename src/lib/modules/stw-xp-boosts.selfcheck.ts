import { strict as assert } from 'node:assert';
import { classifyXpBoostTemplate, listXpBoostStacks } from './stw-xp-boosts-parse';

assert.equal(classifyXpBoostTemplate('AccountResource:smallxpboost'), 'personal');
assert.equal(classifyXpBoostTemplate('AccountResource:smallxpboost_gift'), 'teammate');
assert.equal(classifyXpBoostTemplate('AccountResource:eventcurrency_scaling'), null);

const stacks = listXpBoostStacks({
  profileChanges: [
    {
      profile: {
        items: {
          a: { templateId: 'AccountResource:smallxpboost', quantity: 3 },
          b: { templateId: 'AccountResource:smallxpboost_gift', quantity: 2 },
          c: { templateId: 'AccountResource:smallxpboost', quantity: 0 }
        }
      }
    }
  ]
} as never);

assert.equal(stacks.length, 2);
assert.equal(stacks.find((s) => s.kind === 'personal')?.quantity, 3);
assert.equal(stacks.find((s) => s.kind === 'teammate')?.quantity, 2);

console.log('stw-xp-boosts selfcheck ok');
