import heroLocalesJson from '../../../../src/lib/data/stw-hero-locales.json';
import heroes from '../../../../src/lib/data/heroes.json';
import { isInternalTemplateLabel } from '@/stw/locale/generic-names';
import type { Locale } from '@/stw/locale/types';

type LocaleEntry = Partial<Record<Locale, string>> & { en: string };

const heroLocales = heroLocalesJson as Record<string, LocaleEntry>;
const heroCatalogKeys = Object.keys(heroes);

const HERO_RUNTIME_SUFFIX =
  /_(?:ur|sr|vr|hr|cr|r|u|c|e|l|h)(?:_(?:ore|cp|wv))?(_t\d+)?$/i;

function stripHeroRuntimeSuffix(body: string) {
  let result = body.toLowerCase();
  let prev = '';
  while (prev !== result) {
    prev = result;
    result = result.replace(HERO_RUNTIME_SUFFIX, '').replace(/_t\d+$/i, '').replace(/_ore$/i, '');
  }
  return result;
}

function pickBestPrefixMatch(base: string) {
  const matches = heroCatalogKeys.filter((k) => k === base || k.startsWith(`${base}_`));
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0]!;
  return matches.sort((a, b) => a.length - b.length)[0]!;
}

export function resolveHeroCatalogKey(templateId: string): string {
  const body = templateId.replace(/^Hero:/i, '');
  const base = stripHeroRuntimeSuffix(body);

  if (heroes[base as keyof typeof heroes]) return base;

  const prefixHit = pickBestPrefixMatch(base);
  if (prefixHit) return prefixHit;

  const parts = base.split('_');
  for (let end = parts.length - 1; end >= 2; end--) {
    const partial = parts.slice(0, end).join('_');
    if (heroes[partial as keyof typeof heroes]) return partial;

    const partialHit = pickBestPrefixMatch(partial);
    if (partialHit) return partialHit;
  }

  return base;
}

const HERO_PHRASES: Record<Locale, [string, string][]> = {
  en: [],
  de: [],
  es: [],
  fr: [],
  tr: [],
  'pt-br': [
    ['Support Specialist', 'Especialista de Apoio'],
    ['Special Forces', 'Forças Especiais'],
    ['Soldier', 'Soldado'],
    ['Constructor', 'Construtor'],
    ['Outlander', 'Forasteiro'],
    ['Ninja', 'Ninja'],
    ['Sergeant', 'Sargento'],
    ['Centurion', 'Centurião'],
    ['Colonel', 'Coronel'],
    ['Brainiac', 'Cérebro'],
    ['Ghoul Trooper', 'Soldado Carniçal'],
    ['Birthday Brigade', 'Brigada de Aniversário'],
    ['Rabbit Raider', 'Coelho Saqueador'],
    ['Redline', 'Linha Vermelha'],
    ['Wildcat', 'Gata Selvagem'],
    ['Hawk', 'Falcão'],
    ['Ramirez', 'Ramirez'],
    ['Jonesy', 'Jonesy'],
    ['Banshee', 'Banshee'],
    ['Penny', 'Penny'],
    ['Tank', 'Tanque'],
    ['Guardian', 'Guardião'],
    ['Rescue Trooper', 'Soldado de Resgate'],
    ['Trailblazer', 'Desbravadora'],
    ['Pathfinder', 'Desbravador'],
    ['Shock Specialist', 'Especialista em Choque'],
    ['Explosive Expert', 'Especialista em Explosivos'],
    ['Demolitionist', 'Demolidor'],
    ['Mega BASE', 'MEGA BASE'],
    ['Power BASE', 'BASE Poderosa'],
    ['Thrasher', 'Destruidor'],
    ['Siegebreaker', 'Quebra-Cerco'],
    ['Super Shredder', 'Super Retalhador'],
    ['Typewriter', 'Máquina de Escrever'],
    ['Founder', 'Fundador'],
    ['First Raider', 'Primeiro Saqueador'],
    ['Last Word', 'Última Palavra'],
    ['Freebooter', 'Flibusteiro']
  ]
};

function applyPhraseTranslation(name: string, locale: Locale) {
  if (locale === 'en') return name;
  let result = name;
  for (const [from, to] of HERO_PHRASES[locale]) {
    result = result.replaceAll(from, to);
  }
  return result;
}

export function localizedHeroName(templateId: string, locale: Locale): string {
  const key = resolveHeroCatalogKey(templateId);
  const entry = heroLocales[key];
  const english = entry?.en ?? (heroes as Record<string, { name?: string }>)[key]?.name;

  if (!english) {
    if (entry?.[locale]) return entry[locale]!;
    return '';
  }

  if (entry?.[locale]) return entry[locale]!;
  return applyPhraseTranslation(english, locale);
}

export function heroDisplayName(templateId: string, locale: Locale, fallbackName?: string) {
  const localized = localizedHeroName(templateId, locale);
  if (localized) return localized;

  const key = resolveHeroCatalogKey(templateId);
  const fromCatalog = (heroes as Record<string, { name?: string }>)[key]?.name;
  if (fromCatalog) return applyPhraseTranslation(fromCatalog, locale);

  if (fallbackName && !isInternalTemplateLabel(fallbackName)) return fallbackName;
  return '';
}
