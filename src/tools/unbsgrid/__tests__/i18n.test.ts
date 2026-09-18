// diagnosis.ts imports paper at module load, which needs the canvas shim.
import './paper-env';
import { describe, it, expect, afterEach } from 'vitest';
import en from '../i18n/en';
import pt from '../i18n/pt';
import es from '../i18n/es';
import { translations } from '../i18n/translations';
import { activeLanguage, activeT, setActiveLanguage } from '../i18n/runtime';
import { fill, plural } from '../i18n/format';
import { FALLBACK_LANGUAGE, LANGUAGES } from '../i18n/types';
import { GEOMETRY_KEYS } from '../types/geometry';
import { getBuiltinPresets, presetDisplayName, PRESET_FAMILIES } from '../lib/preset-engine';
import { SAMPLE_LOGOS } from '../lib/samples';
import { labelFor, effectiveGeometryGroups } from '../lib/geometry-meta';
import { CRITERION_LABELS, overallLabel } from '../lib/diagnosis';

type Dict = { [key: string]: string | Dict };

/** "section.key" -> value, for every leaf of the dictionary. */
function flatten(dict: Dict, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(dict)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, value);
    else for (const [k, v] of flatten(value, path)) out.set(k, v);
  }
  return out;
}

const flat = {
  en: flatten(en as unknown as Dict),
  pt: flatten(pt as unknown as Dict),
  es: flatten(es as unknown as Dict),
};

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

/**
 * A value that is the same in any language: product names, acronyms, units,
 * numbers and symbols ("PDF", "A4", "PNG 2x", "{n} pts", "≈ {w} × {h} px").
 * It has no word of three or more lowercase letters.
 */
const isLanguageNeutral = (s: string) => !/[a-záéíóúâêôãõçñü]{3,}/.test(s.replace(/\{\w+\}/g, ''));

afterEach(() => setActiveLanguage(FALLBACK_LANGUAGE));

describe('i18n dictionaries', () => {
  it('has exactly the same keys in English, Portuguese and Spanish', () => {
    const keys = [...flat.en.keys()].sort();
    expect(keys.length).toBeGreaterThan(800);
    expect([...flat.pt.keys()].sort()).toEqual(keys);
    expect([...flat.es.keys()].sort()).toEqual(keys);
  });

  it('has no empty value', () => {
    for (const lang of LANGUAGES) {
      const empty = [...flat[lang]].filter(([, v]) => !v.trim()).map(([k]) => k);
      expect(empty, lang).toEqual([]);
    }
  });

  it('uses the same placeholders in every language', () => {
    const mismatched: string[] = [];
    for (const [key, value] of flat.en) {
      const expected = placeholders(value);
      for (const lang of ['pt', 'es'] as const) {
        if (placeholders(flat[lang].get(key) ?? '').join() !== expected.join()) mismatched.push(`${lang}:${key}`);
      }
    }
    expect(mismatched).toEqual([]);
  });

  it('has Spanish that is not Portuguese in disguise (at most 30% identical)', () => {
    const comparable = [...flat.pt].filter(([, v]) => !isLanguageNeutral(v));
    const identical = comparable.filter(([k, v]) => flat.es.get(k) === v).map(([k]) => k);
    const share = identical.length / comparable.length;
    expect(comparable.length).toBeGreaterThan(700);
    expect(share, `identical: ${identical.slice(0, 40).join(', ')}`).toBeLessThanOrEqual(0.3);
  });

  it('keeps the English copy distinct from the Portuguese one', () => {
    const comparable = [...flat.en].filter(([, v]) => !isLanguageNeutral(v));
    const identical = comparable.filter(([k, v]) => flat.pt.get(k) === v);
    expect(identical.length / comparable.length).toBeLessThanOrEqual(0.3);
  });

  it('contains no emoji', () => {
    const emoji = /\p{Extended_Pictographic}/u;
    for (const lang of LANGUAGES) {
      const hits = [...flat[lang]].filter(([, v]) => emoji.test(v)).map(([k]) => k);
      expect(hits, lang).toEqual([]);
    }
  });

  it('keeps product names untranslated', () => {
    for (const lang of LANGUAGES) {
      for (const [, value] of flat[lang]) {
        expect(value).not.toMatch(/unbs ?grade|unbs ?retícula|unbs ?cor\b/i);
      }
    }
  });
});

describe('dictionary coverage of the data it names', () => {
  it('names every construction, in every language', () => {
    for (const lang of LANGUAGES) {
      const names = translations[lang].geometry as Record<string, string>;
      const missing = GEOMETRY_KEYS.filter(k => !names[String(k)]);
      expect(missing, lang).toEqual([]);
    }
    expect(Object.keys(en.geometry).sort()).toEqual([...GEOMETRY_KEYS].map(String).sort());
  });

  it('names and describes every built-in preset', () => {
    const ids = getBuiltinPresets().map(p => p.id).sort();
    expect(ids.length).toBe(43);
    for (const lang of LANGUAGES) {
      expect(Object.keys(translations[lang].presetNames).sort(), lang).toEqual(ids);
      expect(Object.keys(translations[lang].presetDescriptions).sort(), lang).toEqual(ids);
    }
  });

  it('names and describes every sample logo', () => {
    const keys = SAMPLE_LOGOS.flatMap(s => {
      const k = s.id.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      return [`${k}Name`, `${k}Hint`];
    }).sort();
    expect(Object.keys(en.samples).sort()).toEqual(keys);
  });
});

describe('active language at runtime', () => {
  it('falls back to Portuguese when nothing sets a language', () => {
    expect(activeLanguage()).toBe('pt');
    expect(activeT()).toBe(pt);
  });

  it('switches every lib label with the language', () => {
    setActiveLanguage('es');
    expect(labelFor('goldenSpiral')).toBe('Espiral áurea');
    expect(CRITERION_LABELS.simetria).toBe('Simetría');
    expect(overallLabel(90)).toBe(es.diagnosis.band85);
    expect(PRESET_FAMILIES.find(f => f.id === 'lockup')?.label).toBe('Logo y texto');
    expect(effectiveGeometryGroups[0].label).toBe(es.geometryGroups.advanced);
    const golden = getBuiltinPresets().find(p => p.id === 'builtin-golden')!;
    expect(presetDisplayName(golden)).toBe('Proporción áurea');
    // The stored name is not touched: it is what export files carry.
    expect(golden.name).toBe('Proporção áurea');

    setActiveLanguage('en');
    expect(labelFor('goldenSpiral')).toBe('Golden spiral');
    expect(SAMPLE_LOGOS[0].name).toBe(en.samples.chevronDuploName);
  });

  it('keeps a user preset name as typed', () => {
    setActiveLanguage('en');
    expect(presetDisplayName({ id: 'preset-1', name: 'Minha grade', isBuiltin: false })).toBe('Minha grade');
  });

  it('ignores a language it does not support', () => {
    setActiveLanguage('fr' as never);
    expect(activeLanguage()).toBe('pt');
  });
});

describe('format helpers', () => {
  it('fills placeholders and leaves unknown ones', () => {
    expect(fill('{a} of {b}', { a: 1, b: 'two' })).toBe('1 of two');
    expect(fill('{a} and {missing}', { a: 'x' })).toBe('x and {missing}');
  });

  it('picks singular or plural', () => {
    expect(plural(1, '{n} item', '{n} items')).toBe('1 item');
    expect(plural(3, '{n} item', '{n} items')).toBe('3 items');
  });
});
