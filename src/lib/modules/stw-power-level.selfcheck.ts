import assert from 'node:assert/strict';
import {
  fortTotal,
  powerLevelFromFort,
  researchFortFromItems,
  survivorFortFromItems
} from './stw-power-level';
import type { ProfileItem } from '$types/game/mcp';

const researchItems = {
  a: { templateId: 'Stat:fortitude_phoenix', quantity: 10, attributes: {} },
  b: { templateId: 'Stat:fortitude', quantity: 20, attributes: {} },
  c: { templateId: 'Stat:resistance', quantity: 15, attributes: {} },
  d: { templateId: 'Stat:offense', quantity: 12, attributes: {} },
  e: { templateId: 'Stat:technology', quantity: 8, attributes: {} },
  f: { templateId: 'Stat:team_fortitude', quantity: 999, attributes: {} },
  g: { templateId: 'Stat:team_offense', quantity: 999, attributes: {} },
  h: { templateId: 'Stat:tech', quantity: 500, attributes: {} }
} as Record<string, ProfileItem>;

const research = researchFortFromItems(researchItems, false);
assert.equal(research.fortitude, 20);
assert.equal(research.resistance, 15);
assert.equal(research.offense, 12);
assert.equal(research.tech, 8);
assert.equal(researchFortFromItems(researchItems, true).fortitude, 10);

const inflated = researchFortFromItems({
  personal: { templateId: 'Stat:fortitude', quantity: 100, attributes: {} },
  party: { templateId: 'Stat:team_fortitude', quantity: 500, attributes: {} }
} as Record<string, ProfileItem>);
assert.equal(inflated.fortitude, 100);
assert.equal(researchFortFromItems(researchItems, false).tech, 8);

const inflatedTech = researchFortFromItems(
  {
    tech: { templateId: 'Stat:tech', quantity: 500, attributes: {} },
    technology: { templateId: 'Stat:technology', quantity: 8, attributes: {} }
  } as Record<string, ProfileItem>,
  false
);
assert.equal(inflatedTech.tech, 8);

const pl = powerLevelFromFort(research);
assert.ok(pl > 1 && pl < 200, `unexpected PL ${pl}`);
assert.equal(fortTotal(research), 55);

const workers = {
  lead: {
    templateId: 'Worker:managerdoctor_sr_t05',
    quantity: 1,
    attributes: {
      level: 50,
      squad_id: 'squad_attribute_medicine_emtsquad',
      squad_slot_idx: 0,
      personality: 'Doctor',
      managerSynergy: 'Homebase.Manager.IsDoctor'
    }
  },
  mate: {
    templateId: 'Worker:workerbasic_sr_t05',
    quantity: 1,
    attributes: {
      level: 50,
      squad_id: 'squad_attribute_medicine_emtsquad',
      squad_slot_idx: 1,
      personality: 'Doctor'
    }
  }
} as Record<string, ProfileItem>;

const survivorFort = survivorFortFromItems(workers);
assert.ok(survivorFort.fortitude > 0, 'lead+mate should add fortitude');
assert.equal(survivorFort.offense, 0);

console.log('stw-power-level self-check passed');
