import type { Locale } from '$lib/paraglide/runtime';
import type { LocalizedLabel } from '$lib/types/game-locale';

function label(entry: LocalizedLabel, locale: Locale) {
  return entry[locale] ?? entry.en;
}

/** Known STW store grants / devName labels (game-accurate PT-BR). */
const STORE_LABELS: Record<string, LocalizedLabel> = {
  'Armory Slot': {
    en: 'Armory Slot',
    de: 'Waffenkammer-Slot',
    es: 'Espacio de arsenal',
    fr: "Emplacement d'armurerie",
    'pt-br': 'Espaço de Arsenal',
    tr: 'Cephanelik Yuvası'
  },
  'Hero Profile': {
    en: 'Hero Profile',
    de: 'Heldenprofil',
    es: 'Perfil de héroe',
    fr: 'Profil de héros',
    'pt-br': 'Perfil Heroico',
    tr: 'Kahraman Profili'
  },
  'Hero Loadout Slot': {
    en: 'Hero Loadout Slot',
    de: 'Helden-Loadout-Slot',
    es: 'Espacio de loadout de héroe',
    fr: "Emplacement de loadout de héros",
    'pt-br': 'Espaço de Loadout Heroico',
    tr: 'Kahraman Loadout Yuvası'
  }
};

const TOKEN_LABELS: Record<string, LocalizedLabel> = {
  accountinventorybonus: STORE_LABELS['Armory Slot'],
  accountheroloadoutbonus: STORE_LABELS['Hero Loadout Slot'],
  accountherobonus: STORE_LABELS['Hero Profile']
};

export function localizedStoreDevName(devName: string, locale: Locale) {
  const match = devName.match(/^\[VIRTUAL\]\d+\s*x\s*(.+?)\s+for\s+/i);
  const english = match?.[1]?.trim() ?? devName.trim();
  const known = STORE_LABELS[english];
  if (known) return label(known, locale);
  return english;
}

export function localizedTokenGrant(templateId: string, locale: Locale) {
  const key = templateId.replace(/^Token:/i, '').toLowerCase();
  const known = TOKEN_LABELS[key];
  if (known) return label(known, locale);
  return null;
}
