import type { StwStoreOffer } from '$types/game/stw-store';

export type StwBulkCategory = 'schematics' | 'heroes' | 'perkUp' | 'flux' | 'resources';

export const STW_BULK_CATEGORIES: StwBulkCategory[] = [
  'schematics',
  'heroes',
  'perkUp',
  'flux',
  'resources'
];

/** Classify by primary grant — inventory ownership does not matter. */
export function classifyStwGrantTemplateId(templateId: string): StwBulkCategory | null {
  if (!templateId) return null;
  if (templateId.startsWith('Schematic:')) return 'schematics';
  if (templateId.startsWith('Hero:')) return 'heroes';

  const key = templateId
    .replace(/^AccountResource:/i, '')
    .replace(/^Item:/i, '')
    .toLowerCase();

  // PERK-UP! only — RE-PERK! (alteration_generic) goes to resources below.
  if (key.includes('alteration_upgrade')) return 'perkUp';
  // Legendary / Epic / Rare Flux
  if (key.includes('evolverarity')) return 'flux';

  // RE-PERK!, olho da tempestade, gotas, supercargas, fichas, etc.
  if (templateId.startsWith('AccountResource:') || templateId.startsWith('Item:')) {
    return 'resources';
  }

  return null;
}

export function classifyStwOffer(offer: StwStoreOffer): StwBulkCategory | null {
  return classifyStwGrantTemplateId(offer.grants[0]?.templateId ?? '');
}
