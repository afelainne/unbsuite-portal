import en from './en';
import pt from './pt';
import es from './es';
import type { Language, Translations } from './types';

export const translations: Record<Language, Translations> = { en, pt, es };

export const getTranslation = (lang: Language): Translations => translations[lang] ?? translations.en;
