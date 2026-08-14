import heroes from '../../../src/lib/data/heroes.json';
import survivors from '../../../src/lib/data/survivors.json';
import survivorsMythicLeads from '../../../src/lib/data/survivors-mythic-leads.json';
import resources from '../../../src/lib/data/resources.json';
import ingredients from '../../../src/lib/data/ingredients.json';
import traps from '../../../src/lib/data/traps.json';
import { staticAsset } from '@/config/paths';
import { StwRarityColors } from '@/config/colors';

type RarityType = 'c' | 'uc' | 'r' | 'vr' | 'sr' | 'ur';

const Rarities = { Common: 'c', Uncommon: 'uc', Rare: 'r', Epic: 'vr', Legendary: 'sr', Mythic: 'ur' } as const;

export type StwTemplateDisplay = {
  name: string;
  imagePath: string;
  rarity: RarityType;
};

function parseRarity(templateId: string): RarityType {
  const match = templateId.match(/_((?:UR|SR|VR|R|L|H|CR|HR|C|U|E))(?:_|$)/i);
  if (!match) return Rarities.Epic;
  const token = match[1].toUpperCase();
  const map: Record<string, RarityType> = {
    C: Rarities.Common,
    U: Rarities.Uncommon,
    R: Rarities.Rare,
    E: Rarities.Epic,
    VR: Rarities.Epic,
    SR: Rarities.Legendary,
    UR: Rarities.Mythic,
    L: Rarities.Legendary,
    H: Rarities.Mythic
  };
  return map[token] ?? Rarities.Epic;
}

function resolveHeroKey(templateId: string): string | null {
  const body = templateId.replace(/^Hero:/i, '').toLowerCase();
  const keys = Object.keys(heroes);
  if (keys.includes(body)) return body;
  const hit = keys.find((k) => body.startsWith(`${k}_`) || body.includes(k));
  return hit ?? null;
}

export function resolveStwTemplateDisplay(templateId: string): StwTemplateDisplay {
  const rarity = parseRarity(templateId);

  if (templateId.startsWith('Hero:')) {
    const key = resolveHeroKey(templateId);
    if (key && (heroes as Record<string, { name?: string }>)[key]) {
      return {
        name: (heroes as Record<string, { name?: string }>)[key].name ?? 'Hero',
        imagePath: staticAsset(`heroes/${key}.png`),
        rarity
      };
    }
    return {
      name: 'Hero',
      imagePath: staticAsset(`resources/voucher_generic_hero_${rarity}.png`),
      rarity
    };
  }

  if (templateId.startsWith('Worker:')) {
    for (const [id] of Object.entries(survivorsMythicLeads as Record<string, unknown>)) {
      if (templateId.toLowerCase().includes(id.toLowerCase())) {
        return {
          name: 'Lead Mythic',
          imagePath: staticAsset(`survivors/unique-leads/${id}.png`),
          rarity: Rarities.Mythic
        };
      }
    }
    for (const [id, worker] of Object.entries(survivors as Record<string, { name?: string }>)) {
      if (templateId.toLowerCase().includes(id.toLowerCase())) {
        return {
          name: worker.name ?? 'Survivor',
          imagePath: staticAsset(`survivors/${id}.png`),
          rarity
        };
      }
    }
    const isManager = templateId.toLowerCase().includes('manager');
    return {
      name: isManager ? 'Lead Survivor' : 'Survivor',
      imagePath: staticAsset(`resources/voucher_generic_${isManager ? 'manager' : 'worker'}_${rarity}.png`),
      rarity
    };
  }

  for (const [id, resource] of Object.entries(resources as Record<string, { name: string }>)) {
    if (templateId.includes(id)) {
      return {
        name: resource.name,
        imagePath: staticAsset(`resources/${id}.png`),
        rarity
      };
    }
  }

  for (const [id, ingredient] of Object.entries(ingredients as Record<string, { name: string }>)) {
    if (templateId.includes(id)) {
      return {
        name: ingredient.name,
        imagePath: staticAsset(`ingredients/${id}.png`),
        rarity
      };
    }
  }

  for (const [id, trap] of Object.entries(traps as Record<string, { name: string }>)) {
    if (templateId.includes(id)) {
      return {
        name: trap.name,
        imagePath: staticAsset(`traps/${id}.png`),
        rarity
      };
    }
  }

  if (templateId.startsWith('Schematic:')) {
    return {
      name: 'Schematic',
      imagePath: staticAsset(`resources/voucher_generic_schematic_${rarity}.png`),
      rarity
    };
  }

  return {
    name: templateId.split(':').pop()?.replace(/_/g, ' ') ?? templateId,
    imagePath: staticAsset(`rarities/${rarity}.png`),
    rarity
  };
}

export function stwRarityColor(rarity: RarityType): string {
  return StwRarityColors[rarity] ?? StwRarityColors.vr;
}

export function stwStorefrontLabel(id: string): string {
  if (id.includes('SpecialEvent')) return 'Loja de Evento STW';
  if (id.includes('Rotational')) return 'Loja Rotativa STW';
  return id.replace('STW', 'STW ').replace('Storefront', '');
}
