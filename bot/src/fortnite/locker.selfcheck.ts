import { parseLockerCategory, type LockerCategory } from '@/fortnite/locker-parse';
import type { QueryProfile } from '@/fortnite/mcp';

const athena = {
  profileChanges: [
    {
      profile: {
        items: {
          aura1: { templateId: 'SparksAura:SparksAura_Bats', quantity: 1, attributes: {} },
          pet1: { templateId: 'CosmeticCompanion:Companion_AboutJury', quantity: 1, attributes: {} },
          shoe1: { templateId: 'CosmeticShoes:Shoes_AbyssBlot', quantity: 1, attributes: {} },
          skin1: { templateId: 'AthenaCharacter:CID_001', quantity: 1, attributes: {} }
        }
      }
    }
  ]
} as unknown as QueryProfile<'athena'>;

const cosmetics = new Map([
  ['sparksaura_bats', { id: 'SparksAura_Bats', name: 'Morcegos', rarity: 'uncommon', icon: 'a.png', smallIcon: 'a.png' }],
  [
    'companion_aboutjury',
    { id: 'Companion_AboutJury', name: 'Squanchy', rarity: 'uncommon', icon: 'p.png', smallIcon: 'p.png' }
  ],
  ['shoes_abyssblot', { id: 'Shoes_AbyssBlot', name: 'Pés de Polvo', rarity: 'uncommon', icon: 's.png', smallIcon: 's.png' }]
]);

const cats: LockerCategory[] = ['auras', 'pets', 'shoes'];
const names = cats.map((c) => parseLockerCategory(athena, cosmetics, c)[0]?.name);
if (names[0] !== 'Morcegos') throw new Error(`aura ${names[0]}`);
if (names[1] !== 'Squanchy') throw new Error(`pet ${names[1]}`);
if (names[2] !== 'Pés de Polvo') throw new Error(`shoe ${names[2]}`);
if (parseLockerCategory(athena, cosmetics, 'outfits').length !== 1) throw new Error('outfit');

process.stdout.write('locker.selfcheck ok\n');
