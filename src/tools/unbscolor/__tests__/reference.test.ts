import { describe, expect, it } from 'vitest';
import {
  deltaVerdict,
  formatReferenceBase,
  formatReferenceCode,
  groupReferenceMatches,
  parseReferenceCode,
  referenceFinish,
  stripBrand
} from '../utils/reference';
import { disambiguateColorNames } from '../utils/colorNames';
import { DEFAULT_LIBRARY, LIBRARY_OPTIONS } from '../constants';
import type { ColorMatch, ReferenceColor } from '../types';

const ref = (code: string, hex: string): ReferenceColor => ({
  code,
  name: code,
  hex,
  rgb: { r: 0, g: 0, b: 0 }
});

const match = (code: string, hex: string, deltaE: number): ColorMatch => ({
  reference: ref(code, hex),
  deltaE,
  ranking: 'Close'
});

const MODIFIERS = {
  lighter: 'claro',
  darker: 'escuro',
  warmer: 'quente',
  cooler: 'frio',
  vivid: 'vivo',
  muted: 'suave'
};

describe('reference code formatting', () => {
  it('drops the brand name in every form it arrives in', () => {
    expect(formatReferenceCode('PANTONE 388 C')).toBe('388 C');
    expect(formatReferenceCode('PMS PANTONE 388 C')).toBe('388 C');
    expect(formatReferenceCode('PMS 388 C')).toBe('388 C');
    expect(formatReferenceCode('PMS388 C')).toBe('388 C');
    expect(formatReferenceCode('P. 388 C')).toBe('388 C');
    // The finish is normalized to upper case; the rest keeps its own casing.
    expect(formatReferenceCode('pantone+ 388 c')).toBe('388 C');
  });

  it('unwraps the color book localization key', () => {
    expect(formatReferenceCode('$$$/colorbook/PANTONE/prefix=PANTONE 102 UP$$$/colorbook/PANTONE/postfix=')).toBe('102 UP');
  });

  it('never returns a branded string', () => {
    for (const raw of ['PANTONE Yellow 012 U', 'PMS Bright Red C', 'PANTONE 7406 CP']) {
      expect(formatReferenceCode(raw)).not.toMatch(/pantone|pms/i);
    }
  });

  it('splits the finish from the reference', () => {
    expect(parseReferenceCode('PANTONE 388 C')).toEqual({ base: '388', finish: 'C', code: '388 C', key: '388' });
    expect(parseReferenceCode('PANTONE Yellow 012 U').base).toBe('Yellow 012');
    expect(referenceFinish('PANTONE 102 UP')).toBe('UP');
    expect(formatReferenceBase('PANTONE 7406 CP')).toBe('7406');
  });

  it('keeps a code that carries no finish', () => {
    expect(parseReferenceCode('Warm Gray')).toEqual({ base: 'Warm Gray', finish: '', code: 'Warm Gray', key: 'WARM GRAY' });
  });

  it('survives empty and malformed input', () => {
    expect(formatReferenceCode(undefined)).toBe('');
    expect(formatReferenceCode('')).toBe('');
    expect(stripBrand('   PANTONE   ')).toBe('');
  });

  it('is what the bundled books already carry', () => {
    const sample = DEFAULT_LIBRARY.slice(0, 50);
    expect(sample.length).toBeGreaterThan(0);
    for (const color of sample) {
      expect(color.code).not.toMatch(/pantone|pms/i);
      expect(formatReferenceCode(color.code)).toBe(color.code);
    }
  });

  it('labels every book with a brand-free name and a finish', () => {
    expect(LIBRARY_OPTIONS.length).toBeGreaterThan(0);
    for (const option of LIBRARY_OPTIONS) {
      expect(option.label).not.toMatch(/pantone|pms/i);
      expect(['C', 'U', 'CP', 'UP']).toContain(option.finish);
    }
  });
});

describe('grouping the finishes of one reference', () => {
  it('collapses the same reference into a single row', () => {
    const groups = groupReferenceMatches([
      match('388 C', '#D9E11F', 1.4),
      match('388 U', '#DCE05A', 3.2),
      match('388 CP', '#DBE225', 2.1),
      match('388 UP', '#DDE362', 4.8),
      match('389 C', '#D0DF00', 5.5)
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].base).toBe('388');
    expect(groups[0].variants.map((v) => v.finish)).toEqual(['C', 'CP', 'U', 'UP']);
    expect(groups[0].code).toBe('388 C');
    expect(groups[0].deltaE).toBeCloseTo(1.4);
    expect(groups[1].base).toBe('389');
  });

  it('keeps the closest occurrence when a finish shows up twice', () => {
    const groups = groupReferenceMatches([match('186 C', '#C8102E', 4), match('186 C', '#C8102E', 1.1)]);
    expect(groups[0].variants).toHaveLength(1);
    expect(groups[0].deltaE).toBeCloseTo(1.1);
  });

  it('orders groups by their closest variant and honours the limit', () => {
    const groups = groupReferenceMatches(
      [match('300 C', '#0057B8', 9), match('200 C', '#BA0C2F', 2), match('100 C', '#F6EB61', 5)],
      2
    );
    expect(groups.map((g) => g.base)).toEqual(['200', '100']);
  });

  it('ignores matches without a usable code', () => {
    expect(groupReferenceMatches([match('', '#000000', 1)])).toHaveLength(0);
  });
});

describe('delta E read as a decision', () => {
  it('maps the usual print thresholds', () => {
    expect(deltaVerdict(0.4)).toBe('imperceptible');
    expect(deltaVerdict(1.5)).toBe('subtle');
    expect(deltaVerdict(3.9)).toBe('close');
    expect(deltaVerdict(7)).toBe('visible');
    expect(deltaVerdict(18)).toBe('different');
    expect(deltaVerdict(Number.NaN)).toBe('different');
  });
});

describe('disambiguating repeated names', () => {
  it('leaves a unique name alone', () => {
    const result = disambiguateColorNames([{ hex: '#FF0000', name: 'Red' }, { hex: '#0000FF', name: 'Blue' }], MODIFIERS);
    expect(result.map((r) => r.displayName)).toEqual(['Red', 'Blue']);
    expect(result.every((r) => r.modifier === null)).toBe(true);
  });

  it('separates two colours that share a name by lightness', () => {
    const result = disambiguateColorNames(
      [
        { hex: '#FFF176', name: 'Yellow' },
        { hex: '#BFA800', name: 'Yellow' }
      ],
      MODIFIERS
    );
    expect(result[0].displayName).toBe('Yellow claro');
    expect(result[1].displayName).toBe('Yellow escuro');
  });

  it('gives every colour of a crowded name its own label', () => {
    const items = ['#FFF176', '#FFE800', '#BFA800', '#E8E2B0'].map((hex) => ({ hex, name: 'Yellow' }));
    const names = disambiguateColorNames(items, MODIFIERS).map((r) => r.displayName);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name.startsWith('Yellow')).toBe(true);
  });

  it('falls back to the hex when two entries are the same colour', () => {
    const names = disambiguateColorNames(
      [
        { hex: '#123456', name: 'Blue' },
        { hex: '#123456', name: 'Blue' }
      ],
      MODIFIERS
    ).map((r) => r.displayName);
    expect(new Set(names).size).toBe(2);
    expect(names[0]).toContain('#123456');
  });
});
