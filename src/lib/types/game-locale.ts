/** Locales available in bundled STW/Fortnite game data (separate from UI i18n). */
export type GameContentLocale = 'de' | 'en' | 'es' | 'fr' | 'pt-br' | 'tr';

export type LocalizedLabel = Partial<Record<GameContentLocale, string>> & { en: string };

export type LocaleEntry = Partial<Record<GameContentLocale, string>> & { en: string };
