import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { Language, Translations, translations } from './translations';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'unbscolor-language';

export const isSupportedLanguage = (value: unknown): value is Language =>
  value === 'en' || value === 'pt' || value === 'es';

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
  return 'en';
}

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // localStorage can throw (private mode / blocked storage); safeGetItem never does
    const stored = safeGetItem(STORAGE_KEY);
    return isSupportedLanguage(stored) ? stored : detectBrowserLanguage();
  });

  const setLanguage = useCallback((lang: Language) => {
    if (!isSupportedLanguage(lang)) return;
    setLanguageState(lang);
    safeSetItem(STORAGE_KEY, lang);
  }, []);

  // Stable context value: consumers only re-render when the language changes
  const value = useMemo<LanguageContextType>(
    () => ({ language, setLanguage, t: translations[language] ?? translations.en }),
    [language, setLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
