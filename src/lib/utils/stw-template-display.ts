import { get } from 'svelte/store';
import { Rarities, RarityNames } from '$lib/constants/stw/resources';
import { heroes, ingredients, resources, survivors, survivorsMythicLeads, traps } from '$lib/data';
import type { Locale } from '$lib/paraglide/runtime';
import { resolveGenericTemplateBody } from '$lib/utils/stw-generic-names';
import { heroDisplayName, resolveHeroCatalogKey } from '$lib/utils/stw-hero-locale';
import { localizedStwItemName } from '$lib/utils/stw-item-names';
import { resolveSchematicStoreTitle } from '$lib/utils/stw-schematic-locale';
import { localizedTokenGrant } from '$lib/utils/stw-store-offers';
import { stwResourceImageUrl } from '$lib/utils/stw-resource-image';
import { schematicCardPackImage } from '$lib/utils/stw-schematic-cardpack';
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

  if (templateId === 'CardPack:cardpack_bronze' || templateId === 'CardPack:cardpack_bronze_10x') {
    return {
      name: templateId.endsWith('_10x') ? 'Pacote com 10 Lhamas de Aprimoramento' : 'Lhama de Aprimoramento',
      imageUrl: '/resources/cardpack_bronze.png',
      rarity: Rarities.Rare,
      kind: 'other'
    };
  }

  if (templateId.toLowerCase().startsWith('cardpack:')) {
    const key = templateId.replace(/^[^:]+:/, '');
    const schematicIcon = schematicCardPackImage(key);
    if (schematicIcon) {
      return {
        name: localizedStwItemName(key, locale, key),
        imageUrl: schematicIcon,
        rarity,
        kind: 'schematic'
      };
    }
    return {
      name: localizedStwItemName(key, locale, key),
      imageUrl: '/resources/cardpack_bronze.png',
      rarity,
      kind: 'other'
    };
  }

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
          name: resolveGenericTemplateBody(`manager_${id}`, locale, Rarities.Mythic) ?? `${rarityName} Lead Survivor`,
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
      name: genericWorker ?? (isManager ? `${rarityName} Lead Survivor` : `${rarityName} Survivor`),
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
      return {
        name: localizedStwItemName(id, locale, resource.name),
        imageUrl: stwResourceImageUrl(id),
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
  return {
    name: resource?.name ?? id,
    imageUrl: resource ? stwResourceImageUrl(id) : '/resources/eventcurrency_scaling.png'
  };
}
