import heroLocalesJson from '$lib/data/stw-hero-locales.json';
import { heroes } from '$lib/data';
import { isInternalTemplateLabel } from '$lib/utils/stw-generic-names';
import type { Locale } from '$lib/paraglide/runtime';
import type { GameContentLocale, LocaleEntry } from '$lib/types/game-locale';

const heroLocales = heroLocalesJson as Record<string, LocaleEntry>;
const heroCatalogKeys = Object.keys(heroes);

/** Trailing campaign tier / rarity on hero template ids (e.g. _vr_ore_t01). */
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

/** Maps a live Hero: template id to the key used in heroes.json / stw-hero-locales.json. */
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

/** Phrase replacements applied to English hero names (longest first). */
const HERO_PHRASES: Record<GameContentLocale, [string, string][]> = {
  en: [],
  de: [
    ['Support Specialist', 'Unterstützungsspezialist'],
    ['Special Forces', 'Spezialeinheit'],
    ['Soldier', 'Soldat'],
    ['Constructor', 'Konstrukteur'],
    ['Outlander', 'Outlander'],
    ['Ninja', 'Ninja'],
    ['Sergeant', 'Sergeant'],
    ['Centurion', 'Zenturio'],
    ['Colonel', 'Oberst'],
    ['Brainiac', 'Brainiac'],
    ['Ghoul Trooper', 'Ghul-Soldat'],
    ['Birthday Brigade', 'Geburtstagsbrigade'],
    ['Rabbit Raider', 'Hasen-Plünderer'],
    ['Redline', 'Rotlinie'],
    ['Wildcat', 'Wildcat'],
    ['Hawk', 'Hawk'],
    ['Ramirez', 'Ramirez'],
    ['Jonesy', 'Jonesy'],
    ['Banshee', 'Banshee'],
    ['Penny', 'Penny'],
    ['Tank', 'Panzer']
  ],
  es: [
    ['Support Specialist', 'Especialista de apoyo'],
    ['Special Forces', 'Fuerzas especiales'],
    ['Soldier', 'Soldado'],
    ['Constructor', 'Constructor'],
    ['Outlander', 'Forastero'],
    ['Ninja', 'Ninja'],
    ['Sergeant', 'Sargento'],
    ['Centurion', 'Centurión'],
    ['Colonel', 'Coronel'],
    ['Brainiac', 'Cerebrito'],
    ['Ghoul Trooper', 'Soldado ghoul'],
    ['Birthday Brigade', 'Brigada de cumpleaños'],
    ['Rabbit Raider', 'Asaltante conejo'],
    ['Redline', 'Línea roja'],
    ['Wildcat', 'Gato montés'],
    ['Hawk', 'Halcón'],
    ['Ramirez', 'Ramírez'],
    ['Jonesy', 'Jonesy'],
    ['Banshee', 'Banshee'],
    ['Penny', 'Penny'],
    ['Tank', 'Tanque']
  ],
  fr: [
    ['Support Specialist', 'Spécialiste du soutien'],
    ['Special Forces', 'Forces spéciales'],
    ['Soldier', 'Soldat'],
    ['Constructor', 'Constructeur'],
    ['Outlander', 'Rôdeur'],
    ['Ninja', 'Ninja'],
    ['Sergeant', 'Sergent'],
    ['Centurion', 'Centurion'],
    ['Colonel', 'Colonel'],
    ['Brainiac', 'Cerveau'],
    ['Ghoul Trooper', 'Soldat goule'],
    ['Birthday Brigade', 'Brigade anniversaire'],
    ['Rabbit Raider', 'Raider lapin'],
    ['Redline', 'Ligne rouge'],
    ['Wildcat', 'Wildcat'],
    ['Hawk', 'Faucon'],
    ['Ramirez', 'Ramirez'],
    ['Jonesy', 'Jonesy'],
    ['Banshee', 'Banshee'],
    ['Penny', 'Penny'],
    ['Tank', 'Tank']
  ],
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
    ['Guardian Knox', 'Guardião Knox'],
    ['Mega BASE', 'MEGA BASE'],
    ['Power BASE', 'BASE Poderosa'],
    ['Thrasher', 'Destruidor'],
    ['Breaching', 'Arrombador'],
    ['Siegebreaker', 'Quebra-Cerco'],
    ['Super Shredder', 'Super Retalhador'],
    ['Typewriter', 'Máquina de Escrever'],
    ['Founder', 'Fundador'],
    ['First Raider', 'Primeiro Saqueador'],
    ['Last Word', 'Última Palavra'],
    ['Freebooter', 'Flibusteiro']
  ],
  tr: [
    ['Support Specialist', 'Destek Uzmanı'],
    ['Special Forces', 'Özel Kuvvetler'],
    ['Soldier', 'Asker'],
    ['Constructor', 'İnşaatçı'],
    ['Outlander', 'Yabancı'],
    ['Ninja', 'Ninja'],
    ['Sergeant', 'Çavuş'],
    ['Centurion', 'Centurion'],
    ['Colonel', 'Albay'],
    ['Brainiac', 'Beyin'],
    ['Ghoul Trooper', 'Ghoul Asker'],
    ['Birthday Brigade', 'Doğum Günü Tugayı'],
    ['Rabbit Raider', 'Tavşan Akıncısı'],
    ['Redline', 'Kırmızı Çizgi'],
    ['Wildcat', 'Yaban Kedisi'],
    ['Hawk', 'Şahin'],
    ['Ramirez', 'Ramirez'],
    ['Jonesy', 'Jonesy'],
    ['Banshee', 'Banshee'],
    ['Penny', 'Penny'],
    ['Tank', 'Tank']
  ]
};

function applyPhraseTranslation(name: string, locale: Locale) {
  let result = name;
  for (const [from, to] of HERO_PHRASES[locale as GameContentLocale] ?? []) {
    result = result.replaceAll(from, to);
  }
  return result;
}

export function localizedHeroName(templateId: string, locale: Locale): string {
  const key = resolveHeroCatalogKey(templateId);
  const entry = heroLocales[key];
  const english = entry?.en ?? heroes[key as keyof typeof heroes]?.name;

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
  const fromCatalog = heroes[key as keyof typeof heroes]?.name;
  if (fromCatalog) return applyPhraseTranslation(fromCatalog, locale);

  if (fallbackName && !isInternalTemplateLabel(fallbackName)) return fallbackName;

  return '';
}
