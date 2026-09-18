import { describe, expect, it } from 'vitest';
import { findHarmonyPartners, findNeighbours, hueFamily, readColor, readPress } from '../utils/discoveries';
import { hexToRgb } from '../utils/colorMath';
import type { ReferenceColor } from '../types';

const ref = (code: string, hex: string): ReferenceColor => ({
  code,
  name: code,
  hex,
  rgb: hexToRgb(hex)
});

/** A tiny book built around #808080: one sibling per direction. */
const BOOK: ReferenceColor[] = [
  ref('Base C', '#7F7F7F'),
  ref('Light C', '#ADADAD'),
  ref('Dark C', '#525252'),
  ref('Warm C', '#8C8071'),
  ref('Cool C', '#71808C'),
  ref('Far C', '#00A86B')
];

describe('reading a colour', () => {
  it('names the hue family, with neutrals coming from chroma', () => {
    expect(hueFamily('#E30613')).toBe('red');
    expect(hueFamily('#F0FF00')).toBe('yellow');
    expect(hueFamily('#B4D000')).toBe('lime');
    expect(hueFamily('#1B365D')).toBe('blue');
    expect(hueFamily('#52525B')).toBe('neutral');
    expect(hueFamily('#FFFFFF')).toBe('neutral');
  });

  it('reads temperature, saturation and lightness in bands', () => {
    const yellow = readColor('#F0FF00');
    expect(yellow.temperature).toBe('warm');
    expect(yellow.saturation).toBe('vivid');
    expect(yellow.lightness).toBe('veryLight');

    const navy = readColor('#1B365D');
    expect(navy.temperature).toBe('cool');
    expect(navy.lightness).toBe('dark');

    const gray = readColor('#52525B');
    expect(gray.saturation).toBe('gray');
    expect(gray.temperature).toBe('temperate');
    // L* 35.4: just over the line between dark and medium.
    expect(gray.lightness).toBe('medium');
  });

  it('reports L, chroma and hue as numbers', () => {
    const reading = readColor('#FFFFFF');
    expect(reading.l).toBeCloseTo(100, 0);
    expect(reading.chroma).toBeLessThan(1);
  });
});

describe('neighbours in a book', () => {
  it('finds one sibling per direction and never the colour itself', () => {
    const neighbours = findNeighbours('#7F7F7F', BOOK);
    const byKind = Object.fromEntries(neighbours.map((n) => [n.kind, n.code]));

    expect(byKind.lighter).toBe('Light C');
    expect(byKind.darker).toBe('Dark C');
    expect(byKind.warmer).toBe('Warm C');
    expect(byKind.cooler).toBe('Cool C');
    expect(neighbours.every((n) => n.hex !== '#7F7F7F')).toBe(true);
  });

  it('leaves out a direction the book cannot answer', () => {
    const kinds = findNeighbours('#FFFFFF', [ref('Dark C', '#525252')]).map((n) => n.kind);
    expect(kinds).toContain('darker');
    expect(kinds).not.toContain('lighter');
  });

  it('returns nothing for an empty book or an invalid colour', () => {
    expect(findNeighbours('#7F7F7F', [])).toEqual([]);
    expect(findNeighbours('nope', BOOK)).toEqual([]);
  });

  it('carries codes as written in the book, tidied', () => {
    const neighbours = findNeighbours('#7F7F7F', [ref('ACME  Cool Gray 4 c', '#ADADAD')]);
    expect(neighbours[0].code).toBe('ACME Cool Gray 4 C');
  });
});

describe('harmonic partners', () => {
  it('returns the five partners, each with its closest reference', () => {
    const partners = findHarmonyPartners('#E30613', BOOK);
    expect(partners.map((p) => p.kind)).toEqual(['complement', 'analogousA', 'analogousB', 'triadicA', 'triadicB']);
    for (const partner of partners) {
      expect(partner.hex).toMatch(/^#[0-9A-F]{6}$/);
      expect(typeof partner.code).toBe('string');
    }
  });

  it('still answers without a book', () => {
    const partners = findHarmonyPartners('#E30613', []);
    expect(partners).toHaveLength(5);
    expect(partners[0].code).toBe('');
  });
});

describe('press notes', () => {
  it('adds up the four inks and flags a heavy build', () => {
    const black = readPress('#000000');
    expect(black.totalInk).toBe(100);
    expect(black.heavyInk).toBe(false);

    const deep = readPress('#0A0A2A');
    expect(deep.totalInk).toBe(deep.cmyk.c + deep.cmyk.m + deep.cmyk.y + deep.cmyk.k);
  });

  it('places a muted colour inside process reach and a neon one outside', () => {
    expect(readPress('#7F7F7F').withinProcess).toBe(true);
    expect(readPress('#8C8071').withinProcess).toBe(true);
    const neon = readPress('#00FF00');
    expect(neon.withinProcess).toBe(false);
    expect(neon.chromaOverflow).toBeGreaterThan(0);
  });
});
