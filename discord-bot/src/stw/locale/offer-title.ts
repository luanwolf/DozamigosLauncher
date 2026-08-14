import { parseDevNameLabel } from '@/stw/locale/dev-name';
import { heroDisplayName } from '@/stw/locale/hero-locale';
import { isInternalTemplateLabel } from '@/stw/locale/generic-names';
import { localizedStwItemName } from '@/stw/locale/item-names';
import { resolveSchematicStoreTitle } from '@/stw/locale/schematic-locale';
import { localizedStoreDevName, localizedTokenGrant } from '@/stw/locale/store-offers';
import type { Locale } from '@/stw/locale/types';

function isGenericSchematicTitle(name: string) {
  return /\b(blunt|tool|sid)\b/i.test(name) && /\b(Schematic|Esquema|Schéma|Şema|Bauplan)\b/i.test(name);
}

export function localizedOfferTitle(
  locale: Locale,
  options: {
    catalogTitle?: string;
    devName: string;
    primaryTemplateId?: string;
    fallbackName: string;
  }
): string {
  if (options.catalogTitle?.trim()) return options.catalogTitle.trim();

  const fromDev = parseDevNameLabel(options.devName);
  const devIsReadable = fromDev && !isInternalTemplateLabel(fromDev);

  if (options.primaryTemplateId?.startsWith('Hero:')) {
    const heroTitle = heroDisplayName(options.primaryTemplateId, locale, options.fallbackName);
    if (heroTitle) return heroTitle;
  }

  if (options.primaryTemplateId?.startsWith('Defender:')) {
    if (options.fallbackName?.trim()) return options.fallbackName.trim();
  }

  if (options.primaryTemplateId?.startsWith('Worker:')) {
    if (options.fallbackName?.trim()) return options.fallbackName.trim();
  }

  if (options.primaryTemplateId?.startsWith('Token:')) {
    const tokenTitle = localizedTokenGrant(options.primaryTemplateId, locale);
    if (tokenTitle) return tokenTitle;
  }

  if (options.primaryTemplateId?.startsWith('Schematic:')) {
    const schematicTitle = resolveSchematicStoreTitle(options.primaryTemplateId, locale, options.devName);
    if (schematicTitle) return schematicTitle;
  }

  if (devIsReadable) {
    const storeLabel = localizedStoreDevName(options.devName, locale);
    if (storeLabel !== fromDev) return storeLabel;
    return localizedStwItemName(`name:${fromDev}`, locale, fromDev);
  }

  const displayName = options.fallbackName?.trim() || '';
  const displayIsReadable =
    displayName && !isInternalTemplateLabel(displayName) && !isGenericSchematicTitle(displayName);

  if (displayIsReadable) {
    return localizedStwItemName(`name:${displayName}`, locale, displayName);
  }

  if (options.primaryTemplateId) {
    const key = options.primaryTemplateId.replace(/^[^:]+:/, '');
    const localized = localizedStwItemName(key, locale, displayName || fromDev || key);
    if (!isInternalTemplateLabel(localized) && !isGenericSchematicTitle(localized)) return localized;
  }

  return displayName || fromDev || '';
}
