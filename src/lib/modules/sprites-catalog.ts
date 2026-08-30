import { getApiFortniteKey } from '$lib/env';
import { apiFortniteService } from '$lib/http';
import { mapApiSpriteFamilyId, SPRITE_FAMILIES } from '$lib/modules/sprites';

export type SpriteLabelSource = 'locale-file' | 'cosmetic' | 'sprites-api' | 'fallback';

export type SpriteCatalogLabels = {
  names: Record<string, string>;
  abilities: Record<string, string>;
  sources: Record<string, SpriteLabelSource>;
};

export type SpriteLocaleFile = {
  locale?: string;
  sprites?: Record<string, { name?: string; ability?: string }>;
};

type ApiSpriteFamily = {
  id?: string;
  name?: string;
  description?: string;
};

type ApiSpritesResponse = {
  sprites?: ApiSpriteFamily[];
};

type ApiCosmetic = {
  name?: string;
  description?: string;
};

const LOCALE_TO_API_LANG: Record<string, string> = {
  'pt-br': 'pt-BR',
  en: 'en'
};

const LOCALE_TO_FILE: Record<string, string> = {
  'pt-br': '/elementals/locale/pt-br.json'
};

function apiLang(locale?: string) {
  return (locale && LOCALE_TO_API_LANG[locale]) || 'pt-BR';
}

function localeFilePath(locale?: string) {
  return (locale && LOCALE_TO_FILE[locale]) || LOCALE_TO_FILE['pt-br'];
}

function emptyCatalog(): SpriteCatalogLabels {
  return { names: {}, abilities: {}, sources: {} };
}

export function fallbackCatalog(): SpriteCatalogLabels {
  const catalog = emptyCatalog();
  for (const family of SPRITE_FAMILIES) {
    catalog.names[family.slug] = family.name;
    catalog.abilities[family.slug] = family.ability;
    catalog.sources[family.slug] = 'fallback';
  }
  return catalog;
}

/** Prefer Epic's localized cosmetic string; otherwise normalize the sprites-catalog name. */
function formatSpriteDisplayName(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^elemental\b/i.test(trimmed)) return trimmed;
  const short = trimmed.replace(/\s*sprite$/i, '').trim();
  return short ? `Elemental ${short}` : trimmed;
}

export function applySpriteLocaleFile(
  catalog: SpriteCatalogLabels,
  localeFile: SpriteLocaleFile | null | undefined
): SpriteCatalogLabels {
  if (!localeFile?.sprites) return catalog;

  for (const [slug, entry] of Object.entries(localeFile.sprites)) {
    const name = entry.name?.trim();
    const ability = entry.ability?.trim();
    if (name) {
      catalog.names[slug] = name;
      catalog.sources[slug] = 'locale-file';
    }
    if (ability) catalog.abilities[slug] = ability;
  }

  return catalog;
}

export async function loadSpriteLocaleFile(locale?: string): Promise<SpriteLocaleFile | null> {
  try {
    const response = await fetch(localeFilePath(locale), { cache: 'no-store' });
    if (!response.ok) return null;
    return (await response.json()) as SpriteLocaleFile;
  } catch {
    return null;
  }
}

async function localizedCosmeticName(id: string, lang: string): Promise<string | null> {
  const cosmetic = await apiFortniteService
    .get<ApiCosmetic>(`v2/cosmetics/${encodeURIComponent(id)}`, { searchParams: { lang } })
    .json()
    .catch(() => null);
  return cosmetic?.name?.trim() || null;
}

async function applyApiSpriteCatalog(catalog: SpriteCatalogLabels, locale?: string): Promise<void> {
  if (!getApiFortniteKey()) return;

  const lang = apiLang(locale);
  const response = await apiFortniteService.get<ApiSpritesResponse>('v2/sprites').json().catch(() => null);
  const families = response?.sprites?.filter((item) => item.id?.trim()) ?? [];
  if (!families.length) return;

  await Promise.all(
    families.map(async (family) => {
      const slug = mapApiSpriteFamilyId(family.id ?? '');
      if (!slug) return;

      const lockedByLocale = catalog.sources[slug] === 'locale-file';
      let name: string | null = null;
      let source: SpriteLabelSource | null = null;

      if (!lockedByLocale && family.id) {
        name = await localizedCosmeticName(family.id, lang);
        if (name) source = 'cosmetic';
      }

      if (!name && !lockedByLocale && family.name?.trim()) {
        name = formatSpriteDisplayName(family.name);
        source = 'sprites-api';
      }

      const localized = source === 'cosmetic';
      if (name && !lockedByLocale && (lang === 'en' || localized)) {
        catalog.names[slug] = name;
        catalog.sources[slug] = source!;
      }

      if (!catalog.abilities[slug]) {
        const ability = family.description?.trim();
        if (ability) catalog.abilities[slug] = ability;
      }
    })
  );
}

/**
 * Label priority: locale JSON (manual) → api-fortnite cosmetic (pt-BR) → hardcoded fallback.
 * Locale file: `static/elementals/locale/pt-br.json`
 */
export async function fetchSpriteCatalogLabels(locale?: string): Promise<SpriteCatalogLabels> {
  let catalog = fallbackCatalog();
  catalog = applySpriteLocaleFile(catalog, await loadSpriteLocaleFile(locale));
  await applyApiSpriteCatalog(catalog, locale);
  return catalog;
}

export function resolveSpriteLabel(
  slug: string,
  fallback: { name: string; ability: string },
  catalog: SpriteCatalogLabels | null
) {
  return {
    name: catalog?.names[slug] ?? fallback.name,
    ability: catalog?.abilities[slug] ?? fallback.ability
  };
}
