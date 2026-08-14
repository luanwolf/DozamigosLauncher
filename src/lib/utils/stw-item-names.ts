import stwItemLocalesJson from '$lib/data/stw-item-locales.json';
import type { Locale } from '$lib/paraglide/runtime';
import type { LocaleEntry } from '$lib/types/game-locale';

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

  const fromEnglishKey = stwItemLocales[`name:${fallbackEnglish}`]?.en;
  if (fromEnglishKey && fromEnglishKey !== fallbackEnglish) return fromEnglishKey;

  return fallbackEnglish;
}
