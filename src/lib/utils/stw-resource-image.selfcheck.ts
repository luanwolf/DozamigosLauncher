import { strict as assert } from 'node:assert';
import { stwResourceImageUrl } from './stw-resource-image';

assert.equal(stwResourceImageUrl('eventcurrency_scaling'), '/resources/eventcurrency_scaling.png');
assert.equal(stwResourceImageUrl('eventcurrency_founders'), '/resources/eventcurrency_founders.png');
assert.equal(stwResourceImageUrl('eventcurrency_roadtrip'), '/currency/eventcurrency_roadtrip.png');
assert.equal(stwResourceImageUrl('heroxp'), '/resources/heroxp.png');
assert.equal(stwResourceImageUrl('eventcurrency_spring'), '/currency/eventcurrency_spring.gif');

console.log('stw-resource-image self-check passed');
