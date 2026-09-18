import { describe, expect, it } from 'vitest';
import { Language, Translations, getTranslation, translations } from '../i18n/translations';

const LANGUAGES: Language[] = ['en', 'pt', 'es'];

const keysOf = (lang: Language) => Object.keys(translations[lang]).sort();

/**
 * Values that are legitimately identical in Portuguese and Spanish: acronyms,
 * units, numbers, product and format names, and loanwords the trade keeps in
 * English. Anything outside this set that matches between pt and es is
 * Portuguese wearing a Spanish label.
 */
const SHARED_BY_NATURE = new Set<string>([
  'matcher',
  'hexadecimal',
  'hslWeb',
  'hsbHsv',
  'cieLabHighPrec',
  'matchCie2000',
  'deltaE00',
  'wcagAA',
  'wcagAAA',
  'apcaLc',
  'digitalD65',
  'gamut',
  'lineature',
  'offsetVsDigital',
  'richBlackVsPure',
  'pureBlack',
  'richBlack',
  'totalInkCoverage',
  'knockoutLabel',
  'slotLabel',
  'slots',
  'paletteMagic',
  'contextUI',
  'externalColorLabel',
  'internalColorLabel',
  'refShort',
  'totalLabel',
  'english',
  'portuguese',
  'spanish',
  'exportFormatTailwind',
  'exportFormatDtcg',
  'visionNormal',
  'protanopia',
  'deuteranopia',
  'tritanopia',
  'achromatopsia',
  'metamerism',
  'cardTemplateMono',
  'cardTemplateEditorial',
  'contextEditorial',
  'templateEditorial',
  'exportAco',
  'exportAse',
  'exportCsv',
  'exportToAco',
  'exportToAse',
  'exportToCsv'
]);

/** A value carrying no lowercase letters is an acronym, a number or a symbol. */
const isSymbolic = (value: string) => !/[a-zà-ÿ]/.test(value);

describe('unbscolor i18n dictionaries', () => {
  it('exposes exactly the three supported languages', () => {
    expect(Object.keys(translations).sort()).toEqual([...LANGUAGES].sort());
  });

  it('has the same keys in every language', () => {
    const reference = keysOf('en');
    for (const lang of LANGUAGES) {
      expect(keysOf(lang), `key set mismatch in "${lang}"`).toEqual(reference);
    }
  });

  it('has no empty or whitespace-only value', () => {
    for (const lang of LANGUAGES) {
      const dictionary = translations[lang] as unknown as Record<string, string>;
      for (const [key, value] of Object.entries(dictionary)) {
        expect(typeof value, `${lang}.${key} is not a string`).toBe('string');
        expect(value.trim().length, `${lang}.${key} is empty`).toBeGreaterThan(0);
      }
    }
  });

  it('keeps Spanish distinct from Portuguese', () => {
    const pt = translations.pt as unknown as Record<string, string>;
    const es = translations.es as unknown as Record<string, string>;
    const keys = Object.keys(pt);

    const suspicious = keys.filter(
      (key) => pt[key] === es[key] && !SHARED_BY_NATURE.has(key) && !isSymbolic(pt[key])
    );

    const ratio = suspicious.length / keys.length;
    expect(
      ratio,
      `${suspicious.length}/${keys.length} keys are identical in pt and es: ${suspicious
        .slice(0, 25)
        .join(', ')}`
    ).toBeLessThanOrEqual(0.3);
  });

  it('does not leave English strings in the Portuguese or Spanish dictionaries', () => {
    const en = translations.en as unknown as Record<string, string>;
    for (const lang of ['pt', 'es'] as const) {
      const dictionary = translations[lang] as unknown as Record<string, string>;
      const untranslated = Object.keys(en).filter(
        (key) =>
          en[key] === dictionary[key] && !SHARED_BY_NATURE.has(key) && !isSymbolic(en[key])
      );
      const ratio = untranslated.length / Object.keys(en).length;
      expect(
        ratio,
        `${untranslated.length} "${lang}" values still match English: ${untranslated
          .slice(0, 25)
          .join(', ')}`
      ).toBeLessThanOrEqual(0.3);
    }
  });

  it('falls back to English for an unknown language', () => {
    expect(getTranslation('en')).toBe(translations.en);
    expect(getTranslation('pt')).toBe(translations.pt);
    expect(getTranslation('es')).toBe(translations.es);
    expect(getTranslation('de' as Language)).toBe(translations.en);
  });

  it('types every key as a string on the Translations contract', () => {
    const sample: Translations = translations.es;
    expect(sample.spotColor).toBe('Tinta plana');
    expect(sample.processColor).toBe('Cuatricromía');
    expect(sample.hue).toBe('Matiz');
    expect(sample.gamut).toBe('Gama');
    expect(sample.coated).toBe('Estucado');
    expect(sample.uncoated).toBe('No estucado');
    expect(sample.cardTemplateSwatch).toBe('Muestra');
    expect(sample.bleedArea).toContain('Sangrado');
    expect(sample.dotGainTitle).toBe('Ganancia de Punto');
  });
});
