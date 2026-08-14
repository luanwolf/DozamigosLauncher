import stwItemLocalesJson from '../../../../src/lib/data/stw-item-locales.json';
import type { Locale } from '@/stw/locale/types';

type LocaleEntry = Partial<Record<Locale, string>> & { en: string };

const stwItemLocales = stwItemLocalesJson as Record<string, LocaleEntry>;

export function localizedStwItemName(
  templateOrKey: string,
  locale: Locale,
  fallbackEnglish: string
): string {
  const key = templateOrKey.replace(/^[^:]+:/, '');
  const byKey = stwItemLocales[key]?.[locale] ?? stwItemLocales[key]?.en;
  if (byKey) return byKey;

  const byEnglish = stwItemLocales[`name:${fallbackEnglish}`]?.[locale];
  if (byEnglish) return byEnglish;

  if (locale !== 'en') {
    const fromEnglishKey = stwItemLocales[`name:${fallbackEnglish}`]?.en;
    if (fromEnglishKey && fromEnglishKey !== fallbackEnglish) return fromEnglishKey;
  }

  return fallbackEnglish;
}
