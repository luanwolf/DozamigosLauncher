import { strict as assert } from 'node:assert';
import { accoladeDisplayName } from './stw-accolade-name';

assert.equal(accoladeDisplayName('accoladeid_stw_endurance_w06', 'pt-br'), 'Resistência: Onda 6');
assert.equal(accoladeDisplayName('Accolade:accoladeid_stw_endurance_w06', 'pt-br'), 'Resistência: Onda 6');
assert.equal(accoladeDisplayName('accoladeid_stw_endurance_w06', 'en'), 'Endurance: Wave 6');
assert.equal(accoladeDisplayName('accoladeid_stw_endurance_w30', 'pt-br'), 'Resistência: Onda 30');
assert.equal(accoladeDisplayName('Hero:hid_herobasic_sr_t01', 'pt-br'), null);

console.log('stw-accolade-name self-check passed');
