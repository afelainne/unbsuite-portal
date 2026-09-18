/**
 * The language the pure modules speak.
 *
 * `diagnosis.ts`, `clearspace.ts`, `min-size.ts`, `suggest.ts` and the other
 * `lib/` modules build sentences with measured numbers inside. They have no
 * React context, so they read the current language from here. The provider
 * writes it on every render, before any child calls into a lib.
 *
 * Used headless (tests, scripts) nothing sets it and it stays at
 * `FALLBACK_LANGUAGE`, the tool's original Portuguese copy.
 */
import { translations } from './translations';
import { FALLBACK_LANGUAGE, LOCALES, isSupportedLanguage, type Language, type Translations } from './types';

let active: Language = FALLBACK_LANGUAGE;

export const setActiveLanguage = (lang: Language): void => {
  if (isSupportedLanguage(lang)) active = lang;
};

export const activeLanguage = (): Language => active;

/** Dictionary of the active language. */
export const activeT = (): Translations => translations[active];

/** Number locale of the active language ("pt-BR", "en-US", "es-ES"). */
export const activeLocale = (): string => LOCALES[active];

/** Number with a fixed number of decimals, in the active locale. */
export const formatLocaleNumber = (value: number, decimals = 0): string =>
  (Number.isFinite(value) ? value : 0).toLocaleString(activeLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
