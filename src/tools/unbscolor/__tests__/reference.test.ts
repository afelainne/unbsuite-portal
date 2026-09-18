import { describe, expect, it } from 'vitest';
import {
  deltaVerdict,
  formatReferenceBase,
  formatReferenceCode,
  groupReferenceMatches,
  parseReferenceCode,
  referenceFinish,
  cleanReferenceCode
} from '../utils/reference';
import { disambiguateColorNames } from '../utils/colorNames';
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
  it('keeps the code as written in the file, brand and all', () => {
    expect(formatReferenceCode('ACME 388 C')).toBe('ACME 388 C');
    expect(formatReferenceCode('Tailwind red-500')).toBe('Tailwind red-500');
    // The finish is normalized to upper case; the rest keeps its own casing.
    expect(formatReferenceCode('acme+  388 c')).toBe('acme+ 388 C');
  });

  it('unwraps the color book localization key', () => {
    expect(formatReferenceCode('$$$/book/ACME/prefix=ACME 102 UP$$$/book/ACME/postfix=')).toBe('ACME 102 UP');
    expect(cleanReferenceCode('  a   b  ')).toBe('a b');
  });

  it('splits the finish from the reference', () => {
    expect(parseReferenceCode('ACME 388 C')).toEqual({ base: 'ACME 388', finish: 'C', code: 'ACME 388 C', key: 'ACME 388' });
    expect(parseReferenceCode('Yellow 012 U').base).toBe('Yellow 012');
    expect(referenceFinish('ACME 102 UP')).toBe('UP');
    expect(formatReferenceBase('7406 CP')).toBe('7406');
  });

  it('keeps a code that carries no finish', () => {
    expect(parseReferenceCode('Warm Gray')).toEqual({ base: 'Warm Gray', finish: '', code: 'Warm Gray', key: 'WARM GRAY' });
    expect(referenceFinish('Open Color blue 6')).toBe('');
    expect(referenceFinish('Material red A200')).toBe('');
  });

  it('survives empty and malformed input', () => {
    expect(formatReferenceCode(undefined)).toBe('');
    expect(formatReferenceCode('')).toBe('');
    expect(cleanReferenceCode('   ')).toBe('');
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
