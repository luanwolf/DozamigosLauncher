import { parseDevNameLabel } from '$lib/utils/stw-dev-name';
import { localizedStwItemName } from '$lib/utils/stw-item-names';
import { heroDisplayName } from '$lib/utils/stw-hero-locale';
import { isInternalTemplateLabel } from '$lib/utils/stw-generic-names';
import { resolveSchematicStoreTitle } from '$lib/utils/stw-schematic-locale';
import { localizedStoreDevName, localizedTokenGrant } from '$lib/utils/stw-store-offers';
import type { Locale } from '$lib/paraglide/runtime';

export { parseDevNameLabel, localizedStwItemName };

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
  if (options.catalogTitle?.trim()) {
    const title = options.catalogTitle.trim();
    return localizedStwItemName(`name:${title}`, locale, title);
  }

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
    if (options.fallbackName?.trim()) {
      return localizedStwItemName(`name:${options.fallbackName.trim()}`, locale, options.fallbackName.trim());
    }
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
  const displayIsReadable = displayName && !isInternalTemplateLabel(displayName) && !isGenericSchematicTitle(displayName);

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
