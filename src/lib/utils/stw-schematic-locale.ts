import { parseDevNameLabel } from '$lib/utils/stw-dev-name';
import { localizedStwItemName } from '$lib/utils/stw-item-names';
import { isInternalTemplateLabel } from '$lib/utils/stw-generic-names';
import type { Locale } from '$lib/paraglide/runtime';
import type { LocalizedLabel } from '$lib/types/game-locale';

function label(entry: LocalizedLabel, locale: Locale) {
  return entry[locale] ?? entry.en;
}

const SCHEMATIC_PREFIX: LocalizedLabel = {
  en: 'Schematic',
  de: 'Bauplan',
  es: 'Esquema',
  fr: 'Schéma',
  'pt-br': 'Esquema',
  tr: 'Şema'
};

/** Known schematic id cores (after sid_ and before rarity suffix). */
const SCHEMATIC_CORES: Record<string, LocalizedLabel> = {
  blunt_tool_light: { en: 'Light Tool', 'pt-br': 'Ferramenta Leve', de: 'Leichtes Werkzeug', es: 'Herramienta ligera', fr: 'Outil léger', tr: 'Hafif Alet' },
  blunt_tool_medium: { en: 'Medium Tool', 'pt-br': 'Ferramenta Média', de: 'Mittleres Werkzeug', es: 'Herramienta media', fr: 'Outil moyen', tr: 'Orta Alet' },
  blunt_tool_heavy: { en: 'Heavy Tool', 'pt-br': 'Ferramenta Pesada', de: 'Schweres Werkzeug', es: 'Herramienta pesada', fr: 'Outil lourd', tr: 'Ağır Alet' },
  blunt_hammer_light: { en: 'Light Hammer', 'pt-br': 'Marreta Leve', de: 'Leichter Hammer', es: 'Martillo ligero', fr: 'Marteau léger', tr: 'Hafif Çekiç' },
  blunt_hammer_medium: { en: 'Medium Hammer', 'pt-br': 'Marreta Média', de: 'Mittlerer Hammer', es: 'Martillo medio', fr: 'Marteau moyen', tr: 'Orta Çekiç' },
  blunt_hammer_heavy: { en: 'Heavy Hammer', 'pt-br': 'Marreta Pesada', de: 'Schwerer Hammer', es: 'Martillo pesado', fr: 'Marteau lourd', tr: 'Ağır Çekiç' },
  blunt_hammer_rocket: { en: 'Rocket Hammer', 'pt-br': 'Marreta Foguete', de: 'Raketenhammer', es: 'Martillo cohete', fr: 'Marteau fusée', tr: 'Roket Çekici' },
  blunt_club_light: { en: 'Light Club', 'pt-br': 'Clava Leve', de: 'Leichte Keule', es: 'Garrote ligero', fr: 'Massue légère', tr: 'Hafif Sopa' },
  blunt_club_medium: { en: 'Medium Club', 'pt-br': 'Clava Média', de: 'Mittlere Keule', es: 'Garrote medio', fr: 'Massue moyenne', tr: 'Orta Sopa' },
  blunt_club_heavy: { en: 'Heavy Club', 'pt-br': 'Clava Pesada', de: 'Schwere Keule', es: 'Garrote pesado', fr: 'Massue lourde', tr: 'Ağır Sopa' },
  blunt_sledge_light: { en: 'Light Sledgehammer', 'pt-br': 'Marreta Leve', de: 'Leichte Vorschlaghammer', es: 'Almádena ligera', fr: 'Masse légère', tr: 'Hafif Balyoz' },
  blunt_sledge_heavy: { en: 'Heavy Sledgehammer', 'pt-br': 'Marreta Pesada', de: 'Schwerer Vorschlaghammer', es: 'Almádena pesada', fr: 'Masse lourde', tr: 'Ağır Balyoz' },
  pistol_auto: { en: 'Auto Pistol', 'pt-br': 'Pistola Automática', de: 'Automatikpistole', es: 'Pistola automática', fr: 'Pistolet automatique', tr: 'Otomatik Tabanca' },
  pistol_autoheavy: { en: 'Auto Pistol', 'pt-br': 'Pistola Automática', de: 'Automatikpistole', es: 'Pistola automática', fr: 'Pistolet automatique', tr: 'Otomatik Tabanca' },
  pistol_semiauto: { en: 'Semi-Auto Pistol', 'pt-br': 'Pistola Semiautomática', de: 'Halbautomatische Pistole', es: 'Pistola semiautomática', fr: 'Pistolet semi-auto', tr: 'Yarı Otomatik Tabanca' },
  pistol_revolver: { en: 'Revolver', 'pt-br': 'Revólver', de: 'Revolver', es: 'Revólver', fr: 'Revolver', tr: 'Revolver' },
  shotgun_tactical: { en: 'Tactical Shotgun', 'pt-br': 'Escopeta Tática', de: 'Taktische Schrotflinte', es: 'Escopeta táctica', fr: 'Fusil à pompe tactique', tr: 'Taktik Pompalı' },
  shotgun_pump: { en: 'Pump Shotgun', 'pt-br': 'Escopeta de Bomba', de: 'Pumpflinte', es: 'Escopeta de bomba', fr: 'Fusil à pompe', tr: 'Pompalı Av Tüfeği' },
  shotgun_heavy: { en: 'Heavy Shotgun', 'pt-br': 'Escopeta Pesada', de: 'Schwere Schrotflinte', es: 'Escopeta pesada', fr: 'Fusil à pompe lourd', tr: 'Ağır Pompalı' },
  sniper_bolt: { en: 'Bolt-Action Sniper', 'pt-br': 'Rifle de Precisão', de: 'Bolt-Action-Sniper', es: 'Francotirador de cerrojo', fr: 'Sniper à verrou', tr: 'Cıvatalı Keskin Nişancı' },
  sniper_crossbow: { en: 'Crossbow', 'pt-br': 'Besta', de: 'Armbrust', es: 'Ballesta', fr: 'Arbalète', tr: 'Arbalet' },
  assault_auto: { en: 'Assault Rifle', 'pt-br': 'Rifle de Assalto', de: 'Sturmgewehr', es: 'Rifle de asalto', fr: "Fusil d'assaut", tr: 'Saldırı Tüfeği' },
  assault_autoheavy: { en: 'Assault Rifle', 'pt-br': 'Rifle de Assalto', de: 'Sturmgewehr', es: 'Rifle de asalto', fr: "Fusil d'assaut", tr: 'Saldırı Tüfeği' },
  assault_burst: { en: 'Burst Rifle', 'pt-br': 'Rifle em Rajada', de: 'Burst-Gewehr', es: 'Rifle a ráfagas', fr: 'Fusil à rafales', tr: 'Patlama Tüfeği' },
  assault_singleshot: { en: 'Single-Shot Rifle', 'pt-br': 'Rifle de Tiro Único', de: 'Einzelschussgewehr', es: 'Rifle de un tiro', fr: 'Fusil à un coup', tr: 'Tek Atışlı Tüfek' },
  launcher_grenade: { en: 'Grenade Launcher', 'pt-br': 'Lança-Granadas', de: 'Granatwerfer', es: 'Lanzagranadas', fr: 'Lance-grenades', tr: 'Bombaatar' },
  launcher_rocket: { en: 'Rocket Launcher', 'pt-br': 'Lança-Foguetes', de: 'Raketenwerfer', es: 'Lanzacohetes', fr: 'Lance-roquettes', tr: 'Roketatar' },
  sword_light: { en: 'Light Sword', 'pt-br': 'Espada Leve', de: 'Leichtes Schwert', es: 'Espada ligera', fr: 'Épée légère', tr: 'Hafif Kılıç' },
  sword_medium: { en: 'Medium Sword', 'pt-br': 'Espada Média', de: 'Mittleres Schwert', es: 'Espada media', fr: 'Épée moyenne', tr: 'Orta Kılıç' },
  sword_heavy: { en: 'Heavy Sword', 'pt-br': 'Espada Pesada', de: 'Schweres Schwert', es: 'Espada pesada', fr: 'Épée lourde', tr: 'Ağır Kılıç' },
  axe_light: { en: 'Light Axe', 'pt-br': 'Machado Leve', de: 'Leichte Axt', es: 'Hacha ligera', fr: 'Hache légère', tr: 'Hafif Balta' },
  axe_heavy: { en: 'Heavy Axe', 'pt-br': 'Machado Pesado', de: 'Schwere Axt', es: 'Hacha pesada', fr: 'Hache lourde', tr: 'Ağır Balta' },
  scythe_light: { en: 'Light Scythe', 'pt-br': 'Foice Leve', de: 'Leichte Sense', es: 'Hoz ligera', fr: 'Faux légère', tr: 'Hafif Tırpan' },
  scythe_heavy: { en: 'Heavy Scythe', 'pt-br': 'Foice Pesada', de: 'Schwere Sense', es: 'Hoz pesada', fr: 'Faux lourde', tr: 'Ağır Tırpan' },
  spear_light: { en: 'Light Spear', 'pt-br': 'Lança Leve', de: 'Leichter Speer', es: 'Lanza ligera', fr: 'Lance légère', tr: 'Hafif Mızrak' },
  spear_heavy: { en: 'Heavy Spear', 'pt-br': 'Lança Pesada', de: 'Schwerer Speer', es: 'Lanza pesada', fr: 'Lance lourde', tr: 'Ağır Mızrak' }
};

const RARITY_TOKENS = /_(?:c|uc|r|vr|sr|ur|l|h|cr|hr)(?:_|$)/i;

export function extractSchematicCore(body: string): string {
  const withoutPrefix = body.replace(/^sid_/i, '');
  const match = withoutPrefix.match(RARITY_TOKENS);
  const core = match ? withoutPrefix.slice(0, match.index) : withoutPrefix;
  return core.replace(/_ore.*$/i, '').replace(/_t\d+$/i, '');
}

function humanizeCore(core: string, locale: Locale): string {
  const known = SCHEMATIC_CORES[core];
  if (known) return label(known, locale);

  const words = core
    .split('_')
    .filter((w) => !['blunt', 'tool', 'sid'].includes(w))
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));

  if (words.length) return words.join(' ');

  return core.replaceAll('_', ' ');
}

export function formatSchematicStoreTitle(weaponName: string, locale: Locale) {
  if (locale === 'pt-br') return `${label(SCHEMATIC_PREFIX, locale)}: ${weaponName}`;
  return `${weaponName} (${label(SCHEMATIC_PREFIX, locale)})`;
}

export function resolveSchematicStoreTitle(
  templateId: string,
  locale: Locale,
  devName?: string
): string | null {
  const fromDev = devName ? parseDevNameLabel(devName) : null;
  if (fromDev && !isInternalTemplateLabel(fromDev)) {
    const localized = localizedStwItemName(`name:${fromDev}`, locale, fromDev);
    return formatSchematicStoreTitle(localized, locale);
  }

  const body = templateId.replace(/^Schematic:/i, '');
  const core = extractSchematicCore(body);
  const weaponName = humanizeCore(core, locale);
  return formatSchematicStoreTitle(weaponName, locale);
}
