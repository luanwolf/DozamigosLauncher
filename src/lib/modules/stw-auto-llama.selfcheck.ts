import { strict as assert } from 'node:assert';
import {
  currencyMatchesPreference,
  isLegendaryOrMythicSurvivorTemplate,
  llamaContainsLegendaryMythicSurvivor
} from './stw-auto-llama-parse';

assert.equal(isLegendaryOrMythicSurvivorTemplate('Worker:workerbasic_sr_t04'), true);
assert.equal(isLegendaryOrMythicSurvivorTemplate('Worker:workerbasic_r_t03'), false);
assert.equal(llamaContainsLegendaryMythicSurvivor(['Hero:foo', 'Worker:manager_ur_t05']), true);
assert.equal(currencyMatchesPreference('AccountResource:currency_xrayllama', 'xray'), true);
assert.equal(currencyMatchesPreference('AccountResource:voucher_cardpack_bronze', 'token'), true);
assert.equal(currencyMatchesPreference('AccountResource:currency_xrayllama', 'token'), false);

console.log('stw-auto-llama selfcheck ok');
