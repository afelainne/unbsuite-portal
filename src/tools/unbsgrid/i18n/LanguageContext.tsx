import React, { useCallback, useMemo, useState, type ReactNode } from 'react';
import { translations } from './translations';
import { LANGUAGE_STORAGE_KEY, LOCALES, detectBrowserLanguage, isSupportedLanguage, type Language } from './types';
import { setActiveLanguage } from './runtime';
import { safeGetItem, safeSetItem } from './safeStorage';
import { LanguageContext, type LanguageContextType } from './context';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // localStorage can throw (private mode / blocked storage); safeGetItem never does
    const stored = safeGetItem(LANGUAGE_STORAGE_KEY);
    return isSupportedLanguage(stored) ? stored : detectBrowserLanguage();
  });

  // The pure modules read the language from a module variable. Writing it
  // during render (not in an effect) means children computing text in this
  // same render already see the new language.
  setActiveLanguage(language);

  const setLanguage = useCallback((lang: Language) => {
    if (!isSupportedLanguage(lang)) return;
    setLanguageState(lang);
    safeSetItem(LANGUAGE_STORAGE_KEY, lang);
  }, []);

  // Stable context value: consumers only re-render when the language changes
  const value = useMemo<LanguageContextType>(
    () => ({ language, setLanguage, t: translations[language] ?? translations.en, locale: LOCALES[language] }),
    [language, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};
