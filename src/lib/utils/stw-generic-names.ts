import { get } from 'svelte/store';
import { RarityNames } from '$lib/constants/stw/resources';
import type { Locale } from '$lib/paraglide/runtime';
import type { LocalizedLabel } from '$lib/types/game-locale';
import type { RarityType } from '$types/game/stw/resources';

function label(entry: LocalizedLabel, locale: Locale) {
  return entry[locale] ?? entry.en;
}

const DEFENDER_TYPES: Record<string, LocalizedLabel> = {
  pistol: {
    en: 'Pistol Defender',
    de: 'Pistolenverteidiger',
    es: 'Defensor de pistola',
    fr: 'Défenseur avec pistolet',
    'pt-br': 'Defensor de Pistola',
    tr: 'Tabanca Savunucusu'
  },
  rifle: {
    en: 'Assault Rifle Defender',
    de: 'Sturmgewehrverteidiger',
    es: 'Defensor de rifle de asalto',
    fr: "Défenseur avec fusil d'assaut",
    'pt-br': 'Defensor de Rifle de Assalto',
    tr: 'Saldırı Tüfeği Savunucusu'
  },
  ranged: {
    en: 'Ranged Defender',
    de: 'Fernkampfverteidiger',
    es: 'Defensor a distancia',
    fr: 'Défenseur à distance',
    'pt-br': 'Defensor de Longo Alcance',
    tr: 'Menzilli Savunucu'
  },
  shotgun: {
    en: 'Shotgun Defender',
    de: 'Schrotflintenverteidiger',
    es: 'Defensor de escopeta',
    fr: 'Défenseur avec fusil à pompe',
    'pt-br': 'Defensor de Escopeta',
    tr: 'Pompalı Savunucusu'
  },
  sniper: {
    en: 'Sniper Defender',
    de: 'Scharfschützenverteidiger',
    es: 'Defensor francotirador',
    fr: 'Défenseur sniper',
    'pt-br': 'Defensor de Precisão',
    tr: 'Keskin Nişancı Savunucusu'
  }
};

const SCHEMATIC_WEAPONS: Record<string, LocalizedLabel> = {
  pistol: { en: 'Pistol', de: 'Pistole', es: 'Pistola', fr: 'Pistolet', 'pt-br': 'Pistola', tr: 'Tabanca' },
  shotgun: { en: 'Shotgun', de: 'Schrotflinte', es: 'Escopeta', fr: 'Fusil à pompe', 'pt-br': 'Escopeta', tr: 'Pompalı' },
  sniper: {
    en: 'Sniper Rifle',
    de: 'Scharfschützengewehr',
    es: 'Rifle de francotirador',
    fr: 'Fusil de sniper',
    'pt-br': 'Rifle de Precisão',
    tr: 'Keskin Nişancı Tüfeği'
  },
  assault: {
    en: 'Assault Rifle',
    de: 'Sturmgewehr',
    es: 'Rifle de asalto',
    fr: "Fusil d'assaut",
    'pt-br': 'Rifle de Assalto',
    tr: 'Saldırı Tüfeği'
  },
  auto: {
    en: 'SMG',
    de: 'MP',
    es: 'Subfusil',
    fr: 'Mitraillette',
    'pt-br': 'SMG',
    tr: 'SMG'
  },
  burst: {
    en: 'Burst Rifle',
    de: 'Burst-Gewehr',
    es: 'Rifle a ráfagas',
    fr: 'Fusil à rafales',
    'pt-br': 'Rifle em Rajada',
    tr: 'Patlama Tüfeği'
  }
};

const WORKER_BASIC: LocalizedLabel = {
  en: 'Survivor',
  de: 'Überlebender',
  es: 'Superviviente',
  fr: 'Survivant',
  'pt-br': 'Sobrevivente',
  tr: 'Hayatta Kalan'
};

const WORKER_LEAD: LocalizedLabel = {
  en: 'Lead Survivor',
  de: 'Anführer',
  es: 'Superviviente líder',
  fr: 'Survivant chef',
  'pt-br': 'Líder Sobrevivente',
  tr: 'Lider Hayatta Kalan'
};

const HERO_BASIC: LocalizedLabel = {
  en: 'Hero',
  de: 'Held',
  es: 'Héroe',
  fr: 'Héros',
  'pt-br': 'Herói',
  tr: 'Kahraman'
};

const SCHEMATIC_SUFFIX: LocalizedLabel = {
  en: 'Schematic',
  de: 'Bauplan',
  es: 'Esquema',
  fr: 'Schéma',
  'pt-br': 'Esquema',
  tr: 'Şema'
};

function withRarity(locale: Locale, rarity: RarityType, unit: string) {
  const rarityName = get(RarityNames)[rarity];
  return `${rarityName} ${unit}`;
}

function looksLikeInternalId(value: string) {
  return /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/i.test(value) && !value.includes(' ');
}

export function isInternalTemplateLabel(value: string) {
  return looksLikeInternalId(value);
}

export function resolveGenericTemplateBody(body: string, locale: Locale, rarity: RarityType): string | null {
  const lower = body.toLowerCase();

  if (lower.includes('manager')) {
    return withRarity(locale, rarity, label(WORKER_LEAD, locale));
  }

  if (lower.startsWith('workerbasic')) {
    return withRarity(locale, rarity, label(WORKER_BASIC, locale));
  }

  if (lower.startsWith('herobasic') || lower.startsWith('hid_herobasic')) {
    return withRarity(locale, rarity, label(HERO_BASIC, locale));
  }

  const defenderMatch = lower.match(/defender([a-z]+)_basic/);
  if (defenderMatch) {
    const typeKey = defenderMatch[1];
    const typeLabel = DEFENDER_TYPES[typeKey] ?? {
      en: `${typeKey} Defender`,
      'pt-br': `Defensor ${typeKey}`
    };
    return withRarity(locale, rarity, label(typeLabel, locale));
  }

  if (lower.startsWith('sid_')) {
    return null;
  }

  if (lower.startsWith('worker') && !lower.includes('manager')) {
    return withRarity(locale, rarity, label(WORKER_BASIC, locale));
  }

  return null;
}
