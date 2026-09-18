import en from './en';

/** The three languages the tool ships with. */
export type Language = 'en' | 'pt' | 'es';

export const LANGUAGES: readonly Language[] = ['en', 'pt', 'es'];

/**
 * The translation dictionary, typed from the English one.
 *
 * English is the base language, so its shape IS the contract: a key missing
 * from `pt.ts` or `es.ts`, or one only they have, fails the build.
 */
export type Translations = typeof en;

/** A namespace of the dictionary, e.g. `TranslationSection<'diagnosis'>`. */
export type TranslationSection<K extends keyof Translations> = Translations[K];

export const isSupportedLanguage = (value: unknown): value is Language =>
  value === 'en' || value === 'pt' || value === 'es';

/**
 * Language the tool falls back to when nothing has chosen one — a pure module
 * called outside the provider, or a component rendered without it.
 *
 * It is Portuguese on purpose: that is the copy the tool was written in, and
 * the pure modules (`diagnosis`, `clearspace`, `min-size`…) are used headless,
 * where there is no interface to pick a language. The provider always sets a
 * language, so the running app never sees this value unless the person picked
 * it.
 */
export const FALLBACK_LANGUAGE: Language = 'pt';

/** Language the provider starts at when the browser gives no usable hint. */
export const DEFAULT_LANGUAGE: Language = 'en';

/**
 * First language to show when nothing is stored: the browser's own, when it
 * is one of ours (pt-BR → pt, es-MX → es), otherwise English.
 */
export function detectBrowserLanguage(
  languages: readonly string[] | undefined = typeof navigator !== 'undefined'
    ? (navigator.languages?.length ? navigator.languages : [navigator.language])
    : undefined,
): Language {
  for (const tag of languages ?? []) {
    const base = String(tag || '').toLowerCase().split('-')[0];
    if (isSupportedLanguage(base)) return base;
  }
  return DEFAULT_LANGUAGE;
}

/** Where the chosen language is remembered (read and written in try/catch). */
export const LANGUAGE_STORAGE_KEY = 'unbsgrid-language';

/** Number formatting locale of each language. */
export const LOCALES: Record<Language, string> = {
  en: 'en-US',
  pt: 'pt-BR',
  es: 'es-ES',
};
