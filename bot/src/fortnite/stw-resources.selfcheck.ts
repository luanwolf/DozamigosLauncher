import { parseStwResources } from '@/fortnite/stw';
import type { QueryProfile } from '@/fortnite/mcp';

const campaign = {
  profileChanges: [
    {
      profile: {
        items: {
          a: { templateId: 'AccountResource:heroxp', quantity: 1200 },
          b: { templateId: 'AccountResource:reagent_evolverarity_sr', quantity: 4 },
          c: { templateId: 'AccountResource:eventcurrency_roadtrip', quantity: 80 },
          skip: { templateId: 'AccountResource:heroxp', quantity: 0 },
          other: { templateId: 'Hero:something', quantity: 1 }
        }
      }
    }
  ]
} as unknown as QueryProfile<'campaign'>;

const rows = parseStwResources(campaign);
if (rows.length !== 3) throw new Error(`count ${rows.length}`);

const hero = rows.find((r) => r.templateId.endsWith(':heroxp'));
if (hero?.name !== 'Hero XP') throw new Error(`hero name ${hero?.name}`);
if (hero?.rarity !== 'common') throw new Error(`hero rarity ${hero?.rarity}`);

const flux = rows.find((r) => r.templateId.includes('evolverarity_sr'));
if (flux?.name !== 'Legendary Flux') throw new Error(`flux name ${flux?.name}`);
if (flux?.rarity !== 'legendary') throw new Error(`flux rarity ${flux?.rarity}`);

const tickets = rows.find((r) => r.templateId.includes('roadtrip'));
if (tickets?.name !== 'Road Trip Tickets') throw new Error(`tickets ${tickets?.name}`);
if (!tickets?.imageUrls.some((u) => u.includes('eventcurrency_roadtrip') || u.includes('/currency/'))) throw new Error('icon path');

process.stdout.write('stw-resources.selfcheck ok\n');
