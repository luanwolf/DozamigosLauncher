import { get } from 'svelte/store';
import { Rarities, RarityNames } from '$lib/constants/stw/resources';
import { heroes, ingredients, resources, survivors, survivorsMythicLeads, traps } from '$lib/data';
import { localizedStwItemName } from '$lib/utils/stw-item-names';
import { heroDisplayName, resolveHeroCatalogKey } from '$lib/utils/stw-hero-locale';
import { resolveGenericTemplateBody } from '$lib/utils/stw-generic-names';
import { resolveSchematicStoreTitle } from '$lib/utils/stw-schematic-locale';
import { localizedTokenGrant } from '$lib/utils/stw-store-offers';
import type { Locale } from '$lib/paraglide/runtime';
import type { RarityType } from '$types/game/stw/resources';

export type StwTemplateDisplay = {
  name: string;
  imageUrl: string;
  rarity: RarityType;
  kind: 'hero' | 'worker' | 'defender' | 'schematic' | 'trap' | 'resource' | 'other';
};

function parseRarityFromTemplate(templateId: string): RarityType {
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
    H: Rarities.Mythic,
    CR: Rarities.Common,
    HR: Rarities.Mythic
  };

  return map[token] ?? Rarities.Epic;
}

export { resolveHeroCatalogKey } from '$lib/utils/stw-hero-locale';

export function resolveStwTemplateDisplay(templateId: string, locale: Locale = 'pt-br'): StwTemplateDisplay {
  const rarity = parseRarityFromTemplate(templateId);
  const rarityName = get(RarityNames)[rarity];

  if (templateId.startsWith('Hero:')) {
    const key = resolveHeroCatalogKey(templateId);
    const hero = heroes[key as keyof typeof heroes];
    const heroBody = templateId.replace(/^Hero:/i, '');
    const genericHero = !hero ? resolveGenericTemplateBody(heroBody, locale, rarity) : null;
    const heroName = heroDisplayName(templateId, locale);
    return {
      name: heroName || genericHero || `${rarityName} Hero`,
      imageUrl: hero ? `/heroes/${key}.png` : `/resources/voucher_generic_hero_${rarity}.png`,
      rarity,
      kind: 'hero'
    };
  }

  if (templateId.startsWith('Worker:')) {
    const isManager = templateId.toLowerCase().includes('manager');
    for (const [id, lead] of Object.entries(survivorsMythicLeads)) {
      if (templateId.toLowerCase().includes(id.toLowerCase())) {
        return {
          name: `${get(RarityNames)[Rarities.Mythic]} Lead`,
          imageUrl: `/survivors/unique-leads/${id}.png`,
          rarity: Rarities.Mythic,
          kind: 'worker'
        };
      }
    }

    for (const [id, worker] of Object.entries(survivors)) {
      if (templateId.toLowerCase().includes(id.toLowerCase())) {
        return {
          name: worker.name ?? `${rarityName} Survivor`,
          imageUrl: `/survivors/${id}.png`,
          rarity,
          kind: 'worker'
        };
      }
    }

    const workerBody = templateId.replace(/^Worker:/i, '');
    const genericWorker = resolveGenericTemplateBody(workerBody, locale, rarity);
    return {
      name: genericWorker ?? (isManager ? `${rarityName} Lead` : `${rarityName} Survivor`),
      imageUrl: `/resources/voucher_generic_${isManager ? 'manager' : 'worker'}_${rarity}.png`,
      rarity,
      kind: 'worker'
    };
  }

  if (templateId.startsWith('Defender:')) {
    const defenderBody = templateId.replace(/^Defender:/i, '');
    const genericDefender = resolveGenericTemplateBody(defenderBody, locale, rarity);
    return {
      name: genericDefender ?? `${rarityName} Defender`,
      imageUrl: `/resources/voucher_generic_defender_${rarity}.png`,
      rarity,
      kind: 'defender'
    };
  }

  for (const [id, trap] of Object.entries(traps)) {
    if (templateId.toLowerCase().includes(id.toLowerCase())) {
      return {
        name: `${rarityName} ${trap.name}`,
        imageUrl: `/traps/${id}.png`,
        rarity,
        kind: 'trap'
      };
    }
  }

  const resourceKey = templateId.replace('AccountResource:', '').replace('Item:', '');
  for (const [id, resource] of Object.entries(resources)) {
    if (resourceKey.includes(id)) {
      const isEventCurrency =
        id.startsWith('eventcurrency_') || id === 'campaign_event_currency' || id === 'eventcurrency_scaling';
      const isUnknown = id === 'campaign_event_currency' || id === 'eventcurrency_spring' || id === 'eventcurrency_summer';
      return {
        name: localizedStwItemName(id, locale, resource.name),
        imageUrl: `${isEventCurrency ? '/currency' : '/resources'}/${id}.${isUnknown ? 'gif' : 'png'}`,
        rarity,
        kind: 'resource'
      };
    }
  }

  for (const [id, ingredient] of Object.entries(ingredients)) {
    if (resourceKey.includes(id)) {
      return {
        name: localizedStwItemName(id, locale, ingredient.name),
        imageUrl: `/ingredients/${id}.png`,
        rarity,
        kind: 'resource'
      };
    }
  }

  if (templateId.startsWith('Schematic:')) {
    const schematicTitle = resolveSchematicStoreTitle(templateId, locale);
    return {
      name: schematicTitle ?? `${rarityName} Schematic`,
      imageUrl: `/resources/voucher_generic_schematic_${rarity}.png`,
      rarity,
      kind: 'schematic'
    };
  }

  if (templateId.startsWith('Token:')) {
    const tokenName = localizedTokenGrant(templateId, locale);
    return {
      name: tokenName ?? templateId.replace(/^Token:/i, ''),
      imageUrl: `/resources/voucher_generic_schematic_${rarity}.png`,
      rarity,
      kind: 'other'
    };
  }

  const body = templateId.includes(':') ? (templateId.split(':').pop() ?? templateId) : templateId;
  const generic = resolveGenericTemplateBody(body, locale, rarity);
  return {
    name: generic ?? body,
    imageUrl: `/resources/voucher_generic_schematic_${rarity}.png`,
    rarity,
    kind: 'other'
  };
}

export function currencyDisplay(subType: string) {
  const id = subType.replace('AccountResource:', '');
  const resource = resources[id as keyof typeof resources];
  const isEventCurrency =
    id.startsWith('eventcurrency_') || id === 'campaign_event_currency' || id === 'eventcurrency_scaling';
  const isUnknown = id === 'campaign_event_currency' || id === 'eventcurrency_spring' || id === 'eventcurrency_summer';

  return {
    name: resource?.name ?? id,
    imageUrl: resource
      ? `${isEventCurrency ? '/currency' : '/resources'}/${id}.${isUnknown ? 'gif' : 'png'}`
      : '/resources/eventcurrency_scaling.png'
  };
}
