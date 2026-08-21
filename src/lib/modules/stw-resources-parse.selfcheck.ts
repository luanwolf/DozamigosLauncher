import assert from 'node:assert/strict';

/** Mirrors isOwnedAccountResource — keep in sync (avoids svelte/$app via display utils). */
function isOwnedAccountResource(item: { templateId: string; quantity?: number }): boolean {
  return item.templateId.startsWith('AccountResource:') && (item.quantity ?? 0) > 0;
}

assert.equal(isOwnedAccountResource({ templateId: 'AccountResource:reagent_c_t01', quantity: 25 }), true);
assert.equal(isOwnedAccountResource({ templateId: 'AccountResource:heroxp', quantity: 0 }), false);
assert.equal(isOwnedAccountResource({ templateId: 'Worker:foo', quantity: 1 }), false);

console.log('stw-resources-parse self-check passed');
