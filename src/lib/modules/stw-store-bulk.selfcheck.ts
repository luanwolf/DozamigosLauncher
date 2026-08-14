import assert from 'node:assert/strict';
import { classifyStwGrantTemplateId } from './stw-store-bulk-classify';

assert.equal(classifyStwGrantTemplateId('Hero:hid_commando_xxx_sr'), 'heroes');
assert.equal(classifyStwGrantTemplateId('Schematic:sid_assault_foo_sr_t01'), 'schematics');
assert.equal(
  classifyStwGrantTemplateId('AccountResource:reagent_alteration_upgrade_sr'),
  'perkUp'
);
assert.equal(
  classifyStwGrantTemplateId('AccountResource:reagent_alteration_generic'),
  'resources'
);
assert.equal(classifyStwGrantTemplateId('AccountResource:reagent_evolverarity_sr'), 'flux');
assert.equal(classifyStwGrantTemplateId('AccountResource:reagent_c_t03'), 'resources');
assert.equal(classifyStwGrantTemplateId('Worker:managerdoctor_sr'), null);

console.log('stw-store-bulk.selfcheck: ok');
