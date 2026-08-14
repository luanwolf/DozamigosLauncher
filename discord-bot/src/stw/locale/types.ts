export type Locale = 'en' | 'de' | 'es' | 'fr' | 'pt-br' | 'tr';

export type LocalizedLabel = Partial<Record<Locale, string>> & { en: string };

export function label(entry: LocalizedLabel, locale: Locale) {
  return entry[locale] ?? entry.en;
}

export function toLocale(code: string): Locale {
  if (code === 'pt' || code === 'pt-BR' || code === 'pt-br') return 'pt-br';
  if (code === 'en') return 'en';
  if (code === 'de') return 'de';
  if (code === 'es') return 'es';
  if (code === 'fr') return 'fr';
  if (code === 'tr') return 'tr';
  return 'pt-br';
}
