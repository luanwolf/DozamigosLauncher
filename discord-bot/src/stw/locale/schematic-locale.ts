import { parseDevNameLabel } from '@/stw/locale/dev-name';
import { isInternalTemplateLabel } from '@/stw/locale/generic-names';
import { localizedStwItemName } from '@/stw/locale/item-names';
import { label, type Locale, type LocalizedLabel } from '@/stw/locale/types';

const SCHEMATIC_PREFIX: LocalizedLabel = {
  en: 'Schematic',
  de: 'Bauplan',
  es: 'Esquema',
  fr: 'Schéma',
  'pt-br': 'Esquema',
  tr: 'Şema'
};

const SCHEMATIC_CORES: Record<string, LocalizedLabel> = {
  blunt_tool_light: { en: 'Light Tool', 'pt-br': 'Ferramenta Leve' },
  blunt_tool_medium: { en: 'Medium Tool', 'pt-br': 'Ferramenta Média' },
  blunt_tool_heavy: { en: 'Heavy Tool', 'pt-br': 'Ferramenta Pesada' },
  blunt_hammer_light: { en: 'Light Hammer', 'pt-br': 'Marreta Leve' },
  blunt_hammer_medium: { en: 'Medium Hammer', 'pt-br': 'Marreta Média' },
  blunt_hammer_heavy: { en: 'Heavy Hammer', 'pt-br': 'Marreta Pesada' },
  blunt_hammer_rocket: { en: 'Rocket Hammer', 'pt-br': 'Marreta Foguete' },
  blunt_club_light: { en: 'Light Club', 'pt-br': 'Clava Leve' },
  blunt_club_medium: { en: 'Medium Club', 'pt-br': 'Clava Média' },
  blunt_club_heavy: { en: 'Heavy Club', 'pt-br': 'Clava Pesada' },
  blunt_sledge_light: { en: 'Light Sledgehammer', 'pt-br': 'Marreta Leve' },
  blunt_sledge_heavy: { en: 'Heavy Sledgehammer', 'pt-br': 'Marreta Pesada' },
  pistol_auto: { en: 'Auto Pistol', 'pt-br': 'Pistola Automática' },
  pistol_autoheavy: { en: 'Auto Pistol', 'pt-br': 'Pistola Automática' },
  pistol_semiauto: { en: 'Semi-Auto Pistol', 'pt-br': 'Pistola Semiautomática' },
  pistol_revolver: { en: 'Revolver', 'pt-br': 'Revólver' },
  shotgun_tactical: { en: 'Tactical Shotgun', 'pt-br': 'Escopeta Tática' },
  shotgun_pump: { en: 'Pump Shotgun', 'pt-br': 'Escopeta de Bomba' },
  shotgun_heavy: { en: 'Heavy Shotgun', 'pt-br': 'Escopeta Pesada' },
  sniper_bolt: { en: 'Bolt-Action Sniper', 'pt-br': 'Rifle de Precisão' },
  sniper_crossbow: { en: 'Crossbow', 'pt-br': 'Besta' },
  assault_auto: { en: 'Assault Rifle', 'pt-br': 'Rifle de Assalto' },
  assault_autoheavy: { en: 'Assault Rifle', 'pt-br': 'Rifle de Assalto' },
  assault_burst: { en: 'Burst Rifle', 'pt-br': 'Rifle em Rajada' },
  assault_singleshot: { en: 'Single-Shot Rifle', 'pt-br': 'Rifle de Tiro Único' },
  launcher_grenade: { en: 'Grenade Launcher', 'pt-br': 'Lança-Granadas' },
  launcher_rocket: { en: 'Rocket Launcher', 'pt-br': 'Lança-Foguetes' },
  sword_light: { en: 'Light Sword', 'pt-br': 'Espada Leve' },
  sword_medium: { en: 'Medium Sword', 'pt-br': 'Espada Média' },
  sword_heavy: { en: 'Heavy Sword', 'pt-br': 'Espada Pesada' },
  axe_light: { en: 'Light Axe', 'pt-br': 'Machado Leve' },
  axe_heavy: { en: 'Heavy Axe', 'pt-br': 'Machado Pesado' },
  scythe_light: { en: 'Light Scythe', 'pt-br': 'Foice Leve' },
  scythe_heavy: { en: 'Heavy Scythe', 'pt-br': 'Foice Pesada' },
  spear_light: { en: 'Light Spear', 'pt-br': 'Lança Leve' },
  spear_heavy: { en: 'Heavy Spear', 'pt-br': 'Lança Pesada' }
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

function formatSchematicStoreTitle(weaponName: string, locale: Locale) {
  if (locale === 'pt-br') return `${label(SCHEMATIC_PREFIX, locale)}: ${weaponName}`;
  return `${weaponName} (${label(SCHEMATIC_PREFIX, locale)})`;
}

export function resolveSchematicStoreTitle(
  templateId: string,
  locale: Locale,
  devName?: string
): string | null {
  const fromDev = devName ? parseDevNameLabel(devName) : null;
  const devIsSpecific = fromDev && !isInternalTemplateLabel(fromDev) && !/^schematic$/i.test(fromDev);
  if (devIsSpecific) {
    const localized = localizedStwItemName(`name:${fromDev}`, locale, fromDev);
    return formatSchematicStoreTitle(localized, locale);
  }

  const body = templateId.replace(/^Schematic:/i, '');
  const core = extractSchematicCore(body);
  const weaponName = humanizeCore(core, locale);
  return formatSchematicStoreTitle(weaponName, locale);
}
