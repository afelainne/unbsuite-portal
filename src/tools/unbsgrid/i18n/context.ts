import { createContext, useContext } from 'react';
import { translations } from './translations';
import { FALLBACK_LANGUAGE, LOCALES, type Language, type Translations } from './types';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  /** Number locale of the language ("en-US", "pt-BR", "es-ES"). */
  locale: string;
}

/**
 * Outside the provider (a panel rendered on its own, in a test) the tool
 * falls back to its original Portuguese copy instead of throwing, the same
 * language the pure modules use headless.
 */
const fallbackValue: LanguageContextType = {
  language: FALLBACK_LANGUAGE,
  setLanguage: () => {},
  t: translations[FALLBACK_LANGUAGE],
  locale: LOCALES[FALLBACK_LANGUAGE],
};

export const LanguageContext = createContext<LanguageContextType>(fallbackValue);

export const useLanguage = (): LanguageContextType => useContext(LanguageContext);
