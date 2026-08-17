import { strict as assert } from 'node:assert';
import { localizedStwItemName } from './stw-item-names';

assert.equal(
  localizedStwItemName('name:Legendary Troll Loot Truck... Llama', 'pt-br', 'Legendary Troll Loot Truck... Llama'),
  'Lhama-caminhão Lendária de Saque de Trolls'
);

assert.equal(
  localizedStwItemName('name:Legendary Troll Loot Truck Llama', 'pt-br', 'Legendary Troll Loot Truck Llama'),
  'Lhama-caminhão Lendária de Saque de Trolls'
);

assert.equal(
  localizedStwItemName('cardpack_jackpot_super', 'pt-br', 'Legendary Troll Loot Truck... Llama'),
  'Lhama-caminhão Lendária de Saque de Trolls'
);

console.log('stw-item-locale selfcheck ok');
